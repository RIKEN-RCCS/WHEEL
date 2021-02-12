/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
"use strict";
/*eslint-disable no-useless-constructor*/
/*eslint-disable class-methods-use-this*/
const path = require("path");
const childProcess = require("child_process");
const fs = require("fs-extra");
const SBS = require("simple-batch-system");
const { remoteHost, jobScheduler, numJobOnLocal, defaultTaskRetryCount } = require("../db/db");
const { addX } = require("./fileUtils");
const { evalCondition } = require("./dispatchUtils");
const { replacePathsep } = require("./pathUtils");
const { getDateString } = require("../lib/utility");
const { getSsh, getSshHostinfo } = require("./sshManager.js");
const { gatherFiles, setTaskState, createStatusFile } = require("./execUtils");
const { registerJob } = require("./jobManager");
const executers = new Map();
let logger; //logger is injected when exec() is called;

function getMaxNumJob(hostinfo) {
  if (hostinfo === null) {
    return numJobOnLocal;
  }
  return !Number.isNaN(parseInt(hostinfo.numJob, 10)) ? Math.max(parseInt(hostinfo.numJob, 10), 1) : 1;
}

/**
 * replace CRLF to LF
 */
async function replaceCRLF(filename) {
  let contents = await fs.readFile(filename);
  contents = contents.toString().replace(/\r\n/g, "\n");
  return fs.writeFile(filename, contents);
}

function passToSSHout(data) {
  logger.sshout(data.toString().trim());
}

function passToSSHerr(data) {
  logger.ssherr(data.toString().trim());
}

async function prepareRemoteExecDir(task) {
  await setTaskState(task, "stage-in");
  logger.debug(task.remoteWorkingDir, task.script);
  const localScriptPath = path.resolve(task.workingDir, task.script);
  await replaceCRLF(localScriptPath);
  const remoteScriptPath = path.posix.join(task.remoteWorkingDir, task.script);
  const ssh = getSsh(task.projectRootDir, task.remotehostID);
  logger.debug(`send ${task.workingDir} to ${task.remoteWorkingDir} start`);
  await ssh.send(task.workingDir, path.posix.dirname(task.remoteWorkingDir));
  await ssh.chmod(remoteScriptPath, "744");
  task.preparedTime = getDateString(true, true);
  logger.debug(`send ${task.workingDir} to ${task.remoteWorkingDir} finished`);
}

function makeEnv(task) {
  return Object.prototype.hasOwnProperty.call(task, "currentIndex") ? `env WHEEL_CURRENT_INDEX=${task.currentIndex.toString()} ` : "";
}
function makeEnvForPath(task) {
  return `env WHEEL_REMOTE_PRJDIR=${task.remoteRootWorkingDir} `;
}

/**
 * make part of submit command line about queue argument
 * @param {Object} task - task component instance
 * @param {Object} JS - Jobscheduler.json's entry
 * @param {string|undefined} queues - comma separated queue name list or undefined
 */
function makeQueueOpt(task, JS, queues) {
  if (typeof queues === "undefined") {
    return "";
  }
  const queueList = queues.split(",");
  if (queueList.length === 0) {
    return "";
  }

  let queue = queueList.find((e)=>{
    return task.queue === e;
  });
  if (typeof queue === "undefined") {
    queue = queueList[0];
  }

  //queue can be empty string "", we do not use queue opt in such case
  return queue.length === 0 ? "" : ` ${JS.queueOpt}${queue}`;
}

/**
 * make Group Name option
 * @param {Task} task - task instance
 * @param {*} JS - JobScheduler
 * @param {*} grpNames - UGE group name
 * @returns {*} *
 */
function makeGrpNameOpt(task, JS, grpNames) {
  let grpName = "";
  const grpNameList = grpNames.split(",");

  grpName = grpNameList.find((e)=>{
    return task.queue === e;
  });

  if (typeof grpName === "undefined") {
    grpName = grpNameList.length > 0 ? grpNameList[0] : "";
  }

  return grpName !== "" ? ` ${JS.grpName} ${grpName}` : "";
}

/**
 * make stepjob option
 * @param {Task} task - task instance
 * @returns {*} *
 */
function makeStepOpt(task) {
  const stepjob = "--step --sparam";
  const jobName = `jnam=${task.parentName}`;
  const stepNum = `sn=${task.stepnum}`;
  const dependencyForm = `${task.dependencyForm}`;

  return task.useDependency ? `${stepjob} "${jobName}, ${stepNum}, ${dependencyForm}"` : `${stepjob} "${jobName}, ${stepNum}"`;
}

async function needsRetry(task) {
  let rt = false;
  try {
    rt = await evalCondition(task.retryCondition, task.workingDir, task.currentIndex, logger);
  } catch (err) {
    logger.info(`retryCondition of ${task.name}(${task.ID}) is set but exception occurred while evaluting it. so give up retring`);
    return false;
  }
  if (rt) {
    logger.info(`${task.name}(${task.ID}) failed but retring`);
  }
  return rt;
}

class Executer {
  constructor(hostinfo) {
    this.hostinfo = hostinfo;
    const maxNumJob = getMaxNumJob(hostinfo);
    const hostname = hostinfo != null ? hostinfo.host : null;
    const execInterval = hostinfo != null ? hostinfo.execInterval : 1;
    this.batch = new SBS({
      exec: async(task)=>{
        task.startTime = getDateString(true, true);

        try {
          task.rt = await this.exec(task);
        } catch (e) {
          if (e.jobStatusCheckFaild) {
            await setTaskState(task, "unknown");
          } else {
            await setTaskState(task, "failed");
          }
          return Promise.reject(e);
        }
        //prevent to overwrite killed task's property
        if (task.state === "not-started") {
          return Promise.resolve();
        }

        //record job finished time
        task.endTime = getDateString(true, true);

        //update task status
        const state = task.rt === 0 ? "finished" : "failed";
        await setTaskState(task, state);

        //to use task in retry function, exec() will be rejected with task object if failed
        if (state === "failed") {
          return Promise.reject(task);
        }
        return state;
      },
      maxConcurrent: maxNumJob,
      interval: execInterval * 1000,
      name: `executer-${hostname ? hostname : "localhost"}-${this.JS === null ? "task" : "Job"}`
    });

    this.stop = this.batch.stop;
    this.start = this.batch.start;
  }

  async submit(task) {
    const job = {
      args: task,
      maxRetry: task.retryTimes || defaultTaskRetryCount,
      retry: false
    };

    if (Object.prototype.hasOwnProperty.call(task, "retryCondition")) {
      job.retry = needsRetry.bind(null, task);
    }
    task.sbsID = this.batch.qsub(job);

    if (task.sbsID !== null) {
      await setTaskState(task, "waiting");
    }
    try {
      await this.batch.qwait(task.sbsID);
    } catch (e) {
      logger.warn(task.name, "failed due to", e);
    } finally {
      await createStatusFile(task);
    }
  }

  cancel(task) {
    return this.batch.qdel(task.sbsID);
  }

  setMaxNumJob(v) {
    this.batch.maxConcurrent = v;
  }

  setExecInterval(v) {
    this.batch.interval = v * 1000;
  }
}

class RemoteJobExecuter extends Executer {
  constructor(hostinfo) {
    super(hostinfo);
    this.queues = hostinfo != null ? hostinfo.queue : null;
    this.JS = hostinfo != null ? jobScheduler[hostinfo.jobScheduler] : null;
    this.grpName = hostinfo != null ? hostinfo.grpName : null;
  }

  setJS(v) {
    this.JS = v;
  }

  setQueues(v) {
    this.queues = v;
  }

  setGrpName(v) {
    this.grpName = v;
  }

  async exec(task) {
    await prepareRemoteExecDir(task);
    const hostinfo = getSshHostinfo(task.projectRootDir, task.remotehostID);
    let submitCmd;
    if (task.type === "stepjobTask") {
      submitCmd = `cd ${task.remoteWorkingDir} && ${makeEnv(task)} ${makeEnvForPath(task)} ${this.JS.submit} ${makeQueueOpt(task, this.JS, this.queues)} ${makeStepOpt(task)} ./${task.script}`;
    } else if (hostinfo.jobScheduler === "UGE") {
      submitCmd = `cd ${task.remoteWorkingDir} && ${makeEnv(task)} ${makeEnvForPath(task)} ${this.JS.submit} ${makeGrpNameOpt(task, this.JS, this.grpName)} ${makeQueueOpt(task, this.JS, this.queues)} ./${task.script}`;
    } else {
      submitCmd = `cd ${task.remoteWorkingDir} && ${makeEnv(task)} ${makeEnvForPath(task)} ${this.JS.submit} ${makeQueueOpt(task, this.JS, this.queues)} ./${task.script}`;
    }
    logger.debug("submitting job (remote):", submitCmd);
    await setTaskState(task, "running");
    const ssh = getSsh(task.projectRootDir, task.remotehostID);
    const output = [];
    const rt = await ssh.exec(submitCmd, {}, output, output);
    const outputText = output.join("");

    if (rt !== 0) {
      const err = new Error("submit command failed");
      err.cmd = submitCmd;
      err.rt = rt;
      err.outputText = outputText;
      return Promise.reject(err);
    }
    const re = new RegExp(this.JS.reJobID, "m");
    const result = re.exec(outputText);

    if (result === null || result[1] === null) {
      const err = new Error("get jobID failed");
      err.cmd = submitCmd;
      err.outputText = outputText;
      return Promise.reject(err);
    }
    const jobID = result[1];
    task.jobID = jobID;
    logger.info("submit success:", submitCmd, jobID);
    task.jobSubmittedTime = getDateString(true, true);
    return registerJob(hostinfo, task);
  }
}

class RemoteTaskExecuter extends Executer {
  constructor(hostinfo) {
    super(hostinfo);
  }

  async exec(task) {
    await prepareRemoteExecDir(task);
    logger.debug("prepare done");
    await setTaskState(task, "running");
    const cmd = `cd ${task.remoteWorkingDir} && ${makeEnv(task)} ./${task.script}`;
    logger.debug("exec (remote)", cmd);

    //if exception occurred in ssh.exec, it will be catched in caller
    const ssh = getSsh(task.projectRootDir, task.remotehostID);
    const rt = await ssh.exec(cmd, {}, passToSSHout, passToSSHerr);
    logger.debug(task.name, "(remote) done. rt =", rt);

    if (rt === 0) {
      await gatherFiles(task);
    }
    return rt;
  }
}

function promisifiedSpawn(task, script, options) {
  return new Promise((resolve, reject)=>{
    const cp = childProcess.spawn(script, options, (err)=>{
      if (err) {
        reject(err);
      }
    });
    cp.stdout.on("data", (data)=>{
      logger.stdout(data.toString());
    });
    cp.stderr.on("data", (data)=>{
      logger.stderr(data.toString());
    });
    cp.on("error", (err)=>{
      cp.removeAlllisteners("exit");
      reject(err);
    });
    cp.on("exit", (rt)=>{
      logger.debug(task.name, "done. rt =", rt);
      resolve(rt);
    });
    task.handler = cp;
  });
}

class LocalTaskExecuter extends Executer {
  constructor(hostinfo) {
    super(hostinfo);
  }

  async exec(task) {
    await setTaskState(task, "running");
    const script = path.resolve(task.workingDir, task.script);
    await addX(script);

    const options = {
      cwd: task.workingDir,
      env: process.env,
      shell: true
    };
      //add Environment variable
    options.env.WHEEL_LOCAL_PRJDIR = task.projectRootDir.toString();

    if (Object.prototype.hasOwnProperty.call(task, "currentIndex")) {
      options.env.WHEEL_CURRENT_INDEX = task.currentIndex.toString();
    }
    return promisifiedSpawn(task, script, options);
  }
}

function getExecutersKey(task) {
  return `${task.remotehostID}-${task.useJobScheduler}`;
}


function createExecuter(task) {
  logger.debug("createExecuter called");
  const onRemote = task.remotehostID !== "localhost";
  const hostinfo = onRemote ? getSshHostinfo(task.projectRootDir, task.remotehostID) : null;
  if (task.useJobScheduler && typeof jobScheduler[hostinfo.jobScheduler] === "undefined") {
    const err = new Error("illegal job Scheduler specifies");
    err.task = task.name;
    err.useJobScheduler = task.useJobScheduler;
    err.hostinfo = hostinfo;
    logger.error(err);
    throw err;
  }
  if (onRemote) {
    if (task.useJobScheduler) {
      return new RemoteJobExecuter(hostinfo);
    }
    return new RemoteTaskExecuter(hostinfo);
  }
  return new LocalTaskExecuter(hostinfo);
}

/**
 * enqueue task
 * @param {Task} task - instance of Task class (dfined in workflowComponent.js)
 */
async function exec(task, loggerInstance) {
  logger = loggerInstance;
  task.remotehostID = remoteHost.getID("name", task.host) || "localhost";
  let executer;
  if (executers.has(getExecutersKey(task))) {
    logger.debug(`reuse existing executer for ${task.host} ${task.useJobScheduler ? "with" : "without"} job scheduler`);
    executer = executers.get(getExecutersKey(task));
    const onRemote = task.remotehostID !== "localhost";
    const hostinfo = onRemote ? getSshHostinfo(task.projectRootDir, task.remotehostID) : null;
    const maxNumJob = getMaxNumJob(hostinfo);
    const execInterval = hostinfo != null ? hostinfo.execInterval : 1;
    executer.setMaxNumJob(maxNumJob);
    executer.setExecInterval(execInterval);

    if (task.useJobScheduler) {
      const JS = Object.keys(jobScheduler).includes(hostinfo.jobScheduler) ? jobScheduler[hostinfo.jobScheduler] : null;
      executer.setJS(JS);
      const queues = hostinfo != null ? hostinfo.queue : null;
      executer.setQueues(queues);
      const grpName = hostinfo != null ? hostinfo.grpName : null;
      executer.setGrpName(grpName);
    }
  } else {
    logger.debug("create new executer for", task.host, " with job scheduler", task.useJobScheduler);
    executer = createExecuter(task);
    executers.set(getExecutersKey(task), executer);
  }

  if (task.remotehostID !== "localhost") {
    const hostinfo = getSshHostinfo(task.projectRootDir, task.remotehostID);
    const localWorkingDir = replacePathsep(path.relative(task.projectRootDir, task.workingDir));
    const remoteRoot = typeof hostinfo.path === "string" ? hostinfo.path : "";
    task.remoteWorkingDir = replacePathsep(path.posix.join(remoteRoot, task.projectStartTime, localWorkingDir));
    task.remoteRootWorkingDir = replacePathsep(path.posix.join(remoteRoot, task.projectStartTime));
  }

  //executer.submit is async function but we does NOT wait it at dispatcher._dispatchTask()
  //task state will be written to component json file and read it from each functions which need task status
  return executer.submit(task);
}

function cancel(task) {
  if (!Object.prototype.hasOwnProperty.call(task, "sbsID")) {
    return false;
  }
  task.remotehostID = remoteHost.getID("name", task.host) || "localhost";
  const executer = executers.get(getExecutersKey(task));
  if (typeof executer === "undefined") {
    logger.warn("executer for", task.remotehostID, " with job scheduler", task.useJobScheduler, "is not found");
    return false;
  }
  return executer.cancel(task);
}

module.exports.exec = exec;
module.exports.cancel = cancel;
