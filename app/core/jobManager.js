/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
"use strict";
const { EventEmitter } = require("events");
const path = require("path");
const fs = require("fs-extra");
const SBS = require("simple-batch-system");
const { getSsh } = require("./sshManager");
const { getLogger } = require("../logSettings");
const logger = getLogger();
const { getDateString } = require("../lib/utility");
const { gatherFiles } = require("./execUtils");
const { jobScheduler, jobManagerJsonFilename } = require("../db/db");
const { createStatusFile } = require("./execUtils");
const { emitProjectEvent } = require("./projectEventManager");

const jobManagers = new Map();

/**
 * parse output text from batch server and get return code from it
 */
function getReturnCode(outputText, reReturnCode, jobStatus = false) {
  const re = new RegExp(reReturnCode, "m");
  const result = re.exec(outputText);

  if (result === null || result[1] === null) {
    const kind = jobStatus ? "job status" : "return";
    logger.warn(`get ${kind} code failed, rt is overwrited by -1`);
    return -1;
  }
  return jobStatus ? result[0] : result[1];
}

/**
 * check if job is finished or not on remote server
 * @param {Object} JS - jobScheduler.json info
 * @param {Task} task - task instance
 * @returns {number | null} - return code
 */
async function isFinishedAbci(JS, task) {
  const ssh = getSsh(task.projectRootDir, task.remotehostID);
  const statCmd = `${JS.runStat} ${task.jobID} || ${JS.finishStat} ${task.jobID}`;
  const output = [];
  const rt = await ssh.exec(statCmd, {}, output, output);

  if (rt !== 0) {
    const error = new Error("job stat command failed!");
    error.cmd = statCmd;
    error.rt = rt;
    return Promise.reject(error);
  }
  const outputText = output.join("");
  const reFinishedState = new RegExp(JS.reFinishedState, "m");
  let finished = reFinishedState.test(outputText);

  if (!finished) {
    const reFailedState = new RegExp(JS.reFailedState, "m");
    finished = reFailedState.test(outputText);
  }
  logger.trace(`JobStatusCheck: ${task.jobID} is ${finished ? "finished" : "not yet completed"}\n${outputText}`);

  if (finished) {
    const strRt = getReturnCode(outputText, JS.reReturnCode);
    task.jobStatus = getReturnCode(outputText, JS.reJobStatus, true);
    return parseInt(strRt, 10);
  }
  return null;
}

/**
 * check if job is finished or not on remote server
 * @param {Object} JS - jobScheduler.json info
 * @param {Task} task - task instance
 * @returns {number | null} - return code
 */
async function isFinishedGeneral(JS, task) {
  //TODO check task.host and use child_process if the task is local job
  const ssh = getSsh(task.projectRootDir, task.remotehostID);
  const statCmd = `${JS.stat} ${task.jobID}`;
  const output = [];
  const rt = await ssh.exec(statCmd, {}, output, output);

  if (rt !== 0) {
    const error = new Error("job stat command failed!");
    error.cmd = statCmd;
    error.rt = rt;
    return Promise.reject(error);
  }
  const outputText = output.join("");
  const reFinishedState = task.type !== "stepjobTask" ? new RegExp(JS.reFinishedState, "m") : new RegExp(JS.reFinishedStateStep, "m");
  const reFailedState = task.type !== "stepjobTask" ? new RegExp(JS.reFailedState, "m") : new RegExp(JS.reFailedStateStep, "m");
  const finished = reFinishedState.test(outputText);
  const failed = reFailedState.test(outputText);

  let statusWord = "not yet completed";
  if (finished) {
    statusWord = "finished";
  }
  if (failed) {
    statusWord = "failed";
  }
  logger.trace(`JobStatusCheck: ${task.jobID} is ${statusWord}\n${outputText}`);

  if (finished) {
    const strRt = getReturnCode(outputText, JS.reReturnCode);
    task.jobStatus = getReturnCode(outputText, JS.reReturnCode, true);
    return parseInt(strRt, 10);
  }
  if (failed) {
    task.jobStatus = "failed";
    return -2;
  }
  return null;
}

/**
 * check if job is finished or not on remote server
 * @param {Object} JS - jobScheduler.json info
 * @param {Task} task - task instance
 * @returns {number | null} - return code
 */
async function isFinished(JS, task) {
  return JS.jobSchedule === "UGE" ? isFinishedAbci(JS, task) : isFinishedGeneral(JS, task);
}

class JobManager extends EventEmitter {
  constructor(projectRootDir, hostinfo) {
    super();
    this.taskListFilename = path.resolve(projectRootDir, `${hostinfo.id}.${jobManagerJsonFilename}`);

    try {
      const taskStateList = fs.readJsonSync(this.taskListFilename);
      this.tasks = Array.isArray(taskStateList) ? taskStateList : [];
    } catch (e) {
      if (e.code !== "ENOENT") {
        throw e;
      }
      this.tasks = [];
    }
    const hostname = hostinfo != null ? hostinfo.host : null;
    const statusCheckInterval = hostinfo != null ? hostinfo.statusCheckInterval : 5;
    const maxStatusCheckError = hostinfo != null ? hostinfo.maxStatusCheckError : 10;
    let statusCheckFailedCount = 0;
    let statusCheckCount = 0;
    this.hostinfo = hostinfo;
    const JS = jobScheduler[hostinfo.jobScheduler];

    if (typeof JS === "undefined") {
      const err = new Error("invalid job scheduler");
      err.hostinfo = hostinfo;
      throw err;
    }
    this.batch = new SBS({
      exec: async(task)=>{
        logger.trace(task.jobID, "status check start");

        if (task.state !== "running") {
          return false;
        }
        task.jobStartTime = task.jobStartTime || getDateString(true, true);
        logger.trace(task.jobID, "status checked", statusCheckCount);
        ++statusCheckCount;

        try {
          task.rt = await isFinished(JS, task);

          if (task.rt === null) {
            return Promise.reject(new Error("not finished"));
          }
          logger.info(task.jobID, "is finished (remote). rt =", task.rt);
          task.jobEndTime = task.jobEndTime || getDateString(true, true);

          if (task.rt === 0) {
            await gatherFiles(task);
          }
          await createStatusFile(task);
          return task.rt;
        } catch (err) {
          ++statusCheckFailedCount;
          err.jobID = task.jobID;
          err.JS = JS;
          logger.warn("status check failed", err);

          if (statusCheckFailedCount > maxStatusCheckError) {
            logger.warn("max status check error count exceeded");
            err.jobStatusCheckFaild = true;
            err.statusCheckFailedCount = statusCheckFailedCount;
            err.statusCheckCount = statusCheckCount;
            err.maxStatusCheckError = maxStatusCheckError;
            return Promise.reject(err);
          }
          return Promise.reject(new Error("not finished"));
        }
      },
      retry: (e)=>{
        return e.message === "not finished";
      },
      retryLater: true,
      maxConcurrent: 1,
      interval: statusCheckInterval * 1000,
      name: `statusChecker ${hostname}`
    });
    this.once("taskListUpdated", this.onTaskListUpdated);
  }

  async onTaskListUpdated() {
    logger.trace("taskListUpdated");

    if (this.tasks.length > 0) {
      await fs.writeJson(this.taskListFilename, this.tasks);
    } else {
      await fs.remove(this.taskListFilename);
    }
    this.once("taskListUpdated", this.onTaskListUpdated);
  }

  addTaskList(task) {
    this.tasks.push(task);
    this.emit("taskListUpdated");
  }

  dropFromTaskList(task) {
    this.tasks = this.tasks.filter((e)=>{
      return !e.ID === task.ID && e.sbsID === task.sbsID;
    });
    this.emit("taskListUpdated");
  }

  async register(task) {
    logger.trace("register task", task);

    if (this.tasks.some((e)=>{
      //task.sbsID is set by executer class
      return e.sbsID === task.sbsID;
    })) {
      logger.trace("this task is already registerd", task);
      return null;
    }
    this.addTaskList(task);
    const rt = await this.batch.qsubAndWait(task);
    this.dropFromTaskList(task);
    emitProjectEvent(task.projetRootDir, "taskStateChanged", task);
    return rt;
  }
}

/**
 * register job status check and resolve when the job is finished
 */
async function registerJob(hostinfo, task) {
  if (!jobManagers.has(hostinfo.id)) {
    const JM = new JobManager(task.projectRootDir, hostinfo);
    jobManagers.set(hostinfo.id, JM);
  }
  const JM = jobManagers.get(hostinfo.id);
  return JM.register(task);
}

module.exports = {
  registerJob
};
