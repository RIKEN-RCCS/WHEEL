const child_process = require("child_process");
const path = require("path");
const fs = require("fs-extra");
const SBS = require("simple-batch-system");

const { getSsh, emit } = require("./projectResource");
const { remoteHost, jobScheduler } = require("../db/db");
const { addXSync, replacePathsep, getDateString, deliverOutputFiles } = require("./utility");

const executers = [];
let logger; // logger is injected when exec() is called;

/**
 * set task component's status and notice it's changed
 */
function setTaskState(task, state) {
  task.state = state;
  emit(task.label, "taskStateChanged");
}

/**
 * replace CRLF to LF
 * @param {string} filename
 */
async function replaceCRLF(filename) {
  let contents = await fs.readFile(filename);

  contents = contents.toString().replace(/\r\n/g, "\n");
  return fs.writeFile(filename, contents);
}

/**
 * parse filter string from client and return validate glob pattern
 */
function parseFilter(pattern) {
  if (pattern.startsWith("{") && pattern.endsWith("}")) {
    return pattern;
  } if (!pattern.includes(",")) {
    return pattern;
  }
  return `{${pattern}}`;

}

function passToSSHout(data) {
  logger.sshout(data.toString().trim());
}
function passToSSHerr(data) {
  logger.ssherr(data.toString().trim());
}

/**
 * check if job is finished or not on remote server
 */
async function isFinished(JS, ssh, jobID) {
  const statCmd = `${JS.stat} ${jobID}`;
  const output = [];
  let rt = await ssh.exec(statCmd, {}, output, output);

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
    const reReturnCode = new RegExp(JS.reReturnCode, "m");
    const result = reReturnCode.exec(outputText);

    if (result === null || result[1] === null) {
      logger.warn("get return code failed, rt is overwrited");
      rt = -1;
    } else {
      rt = result[1];
    }
  }
  logger.debug("is", jobID, "finished", finished, "\n", outputText);

  return [finished, rt];
}

async function prepareRemoteExecDir(ssh, task) {
  setTaskState(task, "stage-in");
  logger.debug(task.remoteWorkingDir, task.script);
  const localScriptPath = path.resolve(task.workingDir, task.script);

  await replaceCRLF(localScriptPath);
  const remoteScriptPath = path.posix.join(task.remoteWorkingDir, task.script);

  logger.debug(`send ${task.workingDir} to ${task.remoteWorkingDir}`);
  await ssh.send(task.workingDir, task.remoteWorkingDir);
  return ssh.chmod(remoteScriptPath, "744");
}

async function gatherFiles(ssh, task, rt) {
  setTaskState(task, "stage-out");
  logger.debug("start to get files from remote server if specified");

  // get outputFiles from remote server
  const outputFilesArray = task.outputFiles
    .filter((e)=>{
      if (e.dst.length > 0) {
        return e;
      }
    })
    .map((e)=>{
      if (e.name.endsWith("/") || e.name.endsWith("\\")) {
        const dirname = replacePathsep(e.name);

        return `${dirname}/*`;
      }
      return e.name;

    });

  if (outputFilesArray.length > 0) {
    const outputFiles = `${task.remoteWorkingDir}/${parseFilter(outputFilesArray.join())}`;

    logger.debug("try to get outputFiles", outputFiles, "\n  from:", task.remoteWorkingDir, "\n  to:", task.workingDir);
    await ssh.recv(task.remoteWorkingDir, task.workingDir, outputFiles, null);
  }

  // get files which match include filter
  if (task.include) {
    const include = `${task.remoteWorkingDir}/${parseFilter(task.include)}`;
    const exclude = task.exclude ? `${task.remoteWorkingDir}/${parseFilter(task.exclude)}` : null;

    logger.debug("try to get ", include, "\n  from:", task.remoteWorkingDir, "\n  to:", task.workingDir, "\n  exclude filter:", exclude);
    await ssh.recv(task.remoteWorkingDir, task.workingDir, include, exclude);
  }

  // clean up remote working directory
  if (task.doCleanup) {
    logger.debug("(remote) rm -fr", task.remoteWorkingDir);
    try {
      await ssh.exec(`rm -fr ${task.remoteWorkingDir}`);
    } catch (e) {

      // just log and ignore error
      logger.warn("remote cleanup failed but ignored", e);
    }
  }
  return rt;
}

function makeEnv(task) {
  return task.currentIndex ? `env WHEEL_CURRENT_INDEX=${task.currentIndex.toString()} ` : "";
}

function makeQueueOpt(task, JS, queues) {
  let queue = "";
  const queueList = queues.split(",");

  if (task.queue in queueList) {
    queue = task.queue;
  } else if (queueList.length > 0) {
    queue = queueList[0];
  }
  return queue !== "" ? ` ${JS.queueOpt}${queue}` : "";
}

class Executer {
  constructor(ssh, JS, maxNumJob, remotehostID, hostname, queues, execInterval, statusCheckInterval, maxStatusCheckError) {

    // remotehostID and useJobScheduler flag is not used inside Executer class
    // this 2 property is used as search key in exec();
    this.remotehostID = remotehostID;
    this.useJobScheduler = JS !== null;

    this.ssh = ssh;
    this.JS = JS;
    this.queues = queues;
    this.maxStatusCheckError = maxStatusCheckError;

    if (this.ssh === null) {
      if (this.useJobScheduler) {
        logger.warn("local submit is not implimented yet!");
      }
      this.exec = this.localExec;
    } else {
      this.exec = this.useJobScheduler ? this.remoteSubmit : this.remoteExec;
    }

    this.batch = new SBS({
      exec: async(task)=>{
        task.startTime = getDateString(true);
        const rt = await this.exec(task)
          .catch((e)=>{

            // TODO jobのsubmitに失敗した時は、maxJobの設定を減らして再投入するような機構を入れる?
            setTaskState(task, "failed");
            return Promise.reject(e);
          });

        if (task.state === "not-started") {

          // prevent to overwrite killed task's property
          return;
        }

        // record job finished time
        task.endTime = getDateString(true);

        // deliver files
        if (rt === 0) {
          const rt2 = await deliverOutputFiles(task.outputFiles, task.workingDir);

          if (rt2.length > 0) {
            logger.debug("deliverOutputFiles:\n", rt2);
          }
        }

        // update task status
        const state = rt === 0 ? "finished" : "failed";

        setTaskState(task, state);

        // to use retry function in the future release, return Promise.reject if task finished with non-zero value
        return rt === 0 ? task.state : Promise.reject(rt);
      },
      retry: false,
      maxConcurrent: maxNumJob,
      interval: execInterval * 1000,
      name: `executer ${hostname}`
    });
    if (this.useJobScheduler) {

      // TODO exec should be changed if local submit case
      this.statCheckQ = new SBS({
        exec: async(task)=>{
          if (task.state !== "running") {
            return false;
          }
          let statFailedCount = 0;
          let statCheckCount = 0;

          logger.debug(task.jobID, "status checked", statCheckCount);
          ++statCheckCount;
          try {
            const [finished, rt] = await isFinished(JS, this.ssh, task.jobID);

            if (finished) {
              logger.info(task.jobID, "is finished (remote). rt =", rt);
              await gatherFiles(this.ssh, task, rt);
              return rt;
            }
            return Promise.reject("not finished");

          } catch (err) {
            ++statFailedCount;
            err.jobID = task.jobID;
            err.JS = JS;
            logger.warn("status check failed", err);
            if (statFailedCount > this.maxStatusCheckError) {
              return Promise.reject(new Error("job status check failed over", this.maxStatusCheckError, "times"));
            }
          }
        },
        retry: (e)=>{
          return e === "not finished";
        },
        retryLater: true,
        maxConcurrent: 1,
        interval: statusCheckInterval * 1000,
        name: `statusChecker ${hostname}`
      });
    }

    this.stop = this.batch.stop;
    this.start = this.batch.start;
  }

  submit(task) {
    task.sbsID = this.batch.qsub(task);
    if (task.sbsID !== null) {
      setTaskState(task, "waiting");
    }
    return this.batch.qwait(task.sbsID)
      .catch((e)=>{
        logger.warn(task.name, "failed due to", e);
        setTaskState(task, "failed");
      });
  }
  cancel(task) {
    return this.batch.qdel(task.sbsID);
  }

  /**
   * execute task on localhost(=the machine which node.js is running on)
   * @param {Task} task - task instance
   * @returns {Promise} - resolve with retun value from script when script is finished
   * rejected if child process is abnomaly terminated (e.g. permission error, signal occurred etc.)
   */
  async localExec(task) {
    return new Promise((resolve, reject)=>{
      setTaskState(task, "running");
      const script = path.resolve(task.workingDir, task.script);

      addXSync(script);

      // TODO env, uid, gidを設定する
      const options = {
        cwd: task.workingDir,
        env: process.env,
        shell: true
      };

      if (task.currentIndex !== undefined) {
        options.env.WHEEL_CURRENT_INDEX = task.currentIndex.toString();
      }
      const cp = child_process.spawn(script, options, (err)=>{
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

  async remoteExec(task) {
    await prepareRemoteExecDir(this.ssh, task);
    logger.debug("prepare done");
    setTaskState(task, "running");
    const cmd = `cd ${task.remoteWorkingDir} && ${makeEnv(task)} ./${task.script}`;

    logger.debug("exec (remote)", cmd);

    // if exception occurred in ssh.exec, it will be catched in caller
    const rt = await this.ssh.exec(cmd, {}, passToSSHout, passToSSHerr);

    logger.debug(task.name, "(remote) done. rt =", rt);
    return rt === 0 ? gatherFiles(this.ssh, task, rt) : rt;
  }

  localSubmit() {
    logger.warn("localSubmit function is not implimented yet");
  }

  async remoteSubmit(task) {
    await prepareRemoteExecDir(this.ssh, task);

    const submitCmd = `cd ${task.remoteWorkingDir} && ${makeEnv(task)} ${this.JS.submit} ${makeQueueOpt(task, this.JS, this.queues)} ./${task.script}`;

    logger.debug("submitting job (remote):", submitCmd);
    setTaskState(task, "running");
    const output = [];
    const rt = await this.ssh.exec(submitCmd, {}, output, output);

    if (rt !== 0) {
      const err = new Error("submit command failed");

      err.cmd = submitCmd;
      err.rt = rt;
      return Promise.reject(err);
    }
    const outputText = output.join("");
    const re = new RegExp(this.JS.reJobID);
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
    return this.statCheckQ.qsubAndWait(task);
  }

  setMaxNumJob(v) {
    this.batch.maxConcurrent = v;
  }
  setExecInterval(v) {
    this.batch.interval = v * 1000;
  }
  setStatusCheckInterval(v) {
    if (this.useJobScheduler) {
      this.statCheckQ.interval = v * 1000;
    }
  }
  setMaxStatusCheckError(v) {
    this.maxStatusCheckError = v;
  }
}

function createExecuter(task) {
  logger.debug("createExecuter called");
  const onRemote = task.remotehostID !== "localhost";

  const hostinfo = onRemote ? remoteHost.get(task.remotehostID) : null;
  const ssh = onRemote ? getSsh(task.label, hostinfo.host) : null;
  const JS = onRemote && task.useJobScheduler && Object.keys(jobScheduler).includes(hostinfo.jobScheduler) ? jobScheduler[hostinfo.jobScheduler] : null;
  const maxNumJob = onRemote && !Number.isNaN(parseInt(hostinfo.numJob, 10)) ? Math.max(parseInt(hostinfo.numJob, 10), 1) : 1;

  const host = hostinfo != null ? hostinfo.host : null;
  const queues = hostinfo != null ? hostinfo.queue : null;

  const execInterval = hostinfo != null ? hostinfo.execInterval : 1;
  const statusCheckInterval = hostinfo != null ? hostinfo.statusCheckInterval : 5;
  const maxStatusCheckError = hostinfo != null ? hostinfo.maxStatusCheckError : 10;

  return new Executer(ssh, JS, maxNumJob, task.remotehostID, host, queues, execInterval, statusCheckInterval, maxStatusCheckError);
}

/**
 * enqueue task
 * @param {Task} task - instance of Task class (dfined in workflowComponent.js)
 */
function exec(task, loggerInstance) {
  logger = loggerInstance;
  task.remotehostID = remoteHost.getID("name", task.host) || "localhost";
  let executer = executers.find((e)=>{
    return e.remotehostID === task.remotehostID && e.useJobScheduler === task.useJobScheduler;
  });

  if (executer === undefined) {
    logger.debug("create new executer for", task.host, " with job scheduler", task.useJobScheduler);
    executer = createExecuter(task);
    executers.push(executer);
  } else {
    const onRemote = executer.remotehostID !== "localhost";
    const hostinfo = remoteHost.get(executer.remotehostID);
    const maxNumJob = onRemote && !Number.isNaN(parseInt(hostinfo.numJob, 10)) ? Math.max(parseInt(hostinfo.numJob, 10), 1) : 1;
    const execInterval = hostinfo != null ? hostinfo.execInterval : 1;
    const statusCheckInterval = hostinfo != null ? hostinfo.statusCheckInterval : 5;
    const maxStatusCheckError = hostinfo != null ? hostinfo.maxStatusCheckError : 10;

    executer.setMaxNumJob(maxNumJob);
    executer.setExecInterval(execInterval);
    executer.setStatusCheckInterval(statusCheckInterval);
    executer.setMaxStatusCheckError(maxStatusCheckError);
  }
  if (task.remotehostID !== "localhost") {
    const hostinfo = remoteHost.get(task.remotehostID);
    const localWorkingDir = replacePathsep(path.relative(task.rwfDir, task.workingDir));

    task.remoteWorkingDir = replacePathsep(path.posix.join(hostinfo.path, task.projectStartTime, localWorkingDir));
  }

  // memo returned Promise is not used in dispatcher
  return executer.submit(task);
}

function cancel(task) {
  if (task.sbsID === undefined) {
    return;
  }
  task.remotehostID = remoteHost.getID("name", task.host) || "localhost";
  const executer = executers.find((e)=>{
    return e.remotehostID === task.remotehostID && e.useJobScheduler === task.useJobScheduler;
  });

  if (executer === undefined) {
    logger.warn("executer for", task.remotehostID, " with job scheduler", task.useJobScheduler, "is not found");
    return;
  }
  return executer.cancel(task);
}

module.exports.exec = exec;
module.exports.cancel = cancel;
