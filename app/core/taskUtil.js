"use strict";
const { jobScheduler } = require("../db/db");
const { getSsh, getSshHost } = require("./sshManager");
const { cancel } = require("./executer");

async function cancelRemoteJob(task, logger) {
  const ssh = getSsh(task.projectRootDir, task.remotehostID);
  const hostinfo = getSshHost(task.projectRootDir, task.remotehostID);
  const JS = jobScheduler[hostinfo.jobScheduler];
  const cancelCmd = `${JS.del} ${task.jobID}`;
  logger.debug(`cancel job: ${cancelCmd}`);
  const output = [];
  await ssh.exec(cancelCmd, {}, output, output);
  logger.debug("cacnel done", output.join());
}

async function cancelLocalJob() {
  //eslint-disable-next-line no-console
  console.log("not implimented yet!!");
}

async function killLocalProcess(task) {
  if (task.handler && task.handler.killed === false) {
    task.handler.kill();
  }
}

async function killTask(task, logger) {
  if (task.remotehostID !== "localhost") {
    if (task.useJobScheduler) {
      await cancelRemoteJob(task, logger);
    } else {

      //do nothing for remoteExec at this time
    }
  } else {
    if (task.useJobScheduler) {
      await cancelLocalJob(task);
    } else {
      await killLocalProcess(task);
    }
  }
}

function cancelDispatchedTasks(tasks, logger) {
  for (const task of tasks) {
    if (task.state === "finished" || task.state === "failed") {
      continue;
    }
    const canceled = cancel(task);

    if (!canceled) {
      killTask(task, logger);
    }
    task.state = "not-started";
  }
}

function taskStateFilter(task) {
  return {
    name: task.name,
    ID: task.ID,
    subID: task.subID,
    description: task.description ? task.description : "",
    state: task.state,
    parent: task.parent,
    parentType: task.parentType,
    ancestorsName: task.ancestorsName,
    ancestorsType: task.ancestorsType,
    dispatchedTime: task.dispatchedTime,
    startTime: task.startTime,
    endTime: task.endTime,
    preparedTime: task.preparedTime,
    jobSubmittedTime: task.jobSubmittedTime,
    jobStartTime: task.jobStartTime,
    jobEndTime: task.jobEndTime
  };
}

module.exports = {
  killTask,
  taskStateFilter,
  cancelDispatchedTasks
};
