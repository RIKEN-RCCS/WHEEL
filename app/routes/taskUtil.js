"use strict";
const { remoteHost, jobScheduler } = require("../db/db");
const { getSsh, getLogger } = require("./projectResource");

async function cancelRemoteJob(projectRootDir, task, ssh) {
  const hostinfo = remoteHost.get(task.remotehostID);
  const JS = jobScheduler[hostinfo.jobScheduler];
  const cancelCmd = `${JS.del} ${task.jobID}`;
  getLogger(projectRootDir).debug(`cancel job: ${cancelCmd}`);
  const output = [];
  await ssh.exec(cancelCmd, {}, output, output);
  getLogger(projectRootDir).debug("cacnel done", output.join());
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

async function killTask(projectRootDir, task) {
  if (task.remotehostID !== "localhost") {
    const hostinfo = remoteHost.get(task.remotehostID);

    if (task.useJobScheduler) {
      const arssh = getSsh(task.label, hostinfo.host);
      await cancelRemoteJob(projectRootDir, task, arssh);
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
    endTime: task.endTime
  };
}

module.exports.killTask = killTask;
module.exports.taskStateFilter = taskStateFilter;
