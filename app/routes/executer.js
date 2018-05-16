const child_process = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const SBS = require("simple-batch-system");

const {getLogger} = require('../logSettings');
const logger = getLogger('workflow');

const {getSsh, emit} = require('./project');
const {interval, remoteHost, jobScheduler} = require('../db/db');
const {addXSync, replacePathsep, getDateString, deliverOutputFiles} = require('./utility');

const executers=[];

/**
 *
 */
function setTaskState(task, state){
  task.state=state;
  emit(task.label, 'taskStateChanged');
}

/**
 * replace CRLF to LF
 * @param {string} filename
 */
async function replaceCRLF(filename){
  let contents = await fs.readFile(filename);
  contents = contents.toString().replace(/\r\n/g,'\n');
  return fs.writeFile(filename , contents);
}

/**
 * parse filter string from client and return validate glob pattern
 */
function parseFilter(pattern){
  if(pattern.startsWith('{') && pattern.endsWith('}')){
    return pattern
  }else if(! pattern.includes(',')){
    return pattern
  }else{
    return `{${pattern}}`;
  }
}

const passToSSHout=(data)=>{
  logger.sshout(data.toString().trim());
}
const passToSSHerr=(data)=>{
  logger.ssherr(data.toString().trim());
}

/**
 * check if job is finished or not on remote server
 */
async function isFinished(JS, ssh, jobID){
  const statCmd=`${JS.stat} ${jobID}`;
  const output=[];
  const rt = await ssh.exec(statCmd, {}, output, output);
  if(rt !== 0){
    const error = new Error("job stat command failed!");
    error.cmd = statCmd;
    error.rt = rt;
    return Promise.reject(error);
  }
  const outputText = output.join("");
  const reFinishedState = new RegExp(JS.reFinishedState, "m");
  let finished=reFinishedState.test(outputText);
  if(! finished){
    const reFailedState  = new RegExp(JS.reFailedState, "m");
    finished=reFailedState.test(outputText);
  }
  //note: following line will not be written anyware for now
  logger.debug('is',jobID,'finished', finished,'\n',outputText);

  return [finished, rt];
}

async function prepareRemoteExecDir(ssh, task){
  setTaskState(task, 'stage-in');
  logger.debug(task.remoteWorkingDir, task.script);
  const localScriptPath = path.resolve(task.workingDir, task.script);
  await replaceCRLF(localScriptPath);
  const remoteScriptPath = path.posix.join(task.remoteWorkingDir, task.script);
  logger.debug(`send ${task.workingDir} to ${task.remoteWorkingDir}`);
  await ssh.send(task.workingDir, task.remoteWorkingDir)
  return ssh.chmod(remoteScriptPath, '744');
}

async function gatherFiles(ssh, task, rt){
  setTaskState(task, 'stage-out');
  logger.debug('start to get files from remote server if specified');

  //get outputFiles from remote server
  const outputFilesArray = task.outputFiles
    .filter((e)=>{
      if(e.dst.length >0) return e;
    })
    .map((e)=>{
      if(e.name.endsWith('/') || e.name.endsWith('\\')){
        const dirname = replacePathsep(e.name);
        return `${dirname}/*`;
      }else{
        return e.name
      }
    });
  if(outputFilesArray.length>0){
    const outputFiles= `${task.remoteWorkingDir}/${parseFilter(outputFilesArray.join())}`;
    try{
      logger.debug('try to get outputFiles', outputFiles, '\n  from:', task.remoteWorkingDir, '\n  to:',task.workingDir);
      await ssh.recv(task.remoteWorkingDir, task.workingDir, outputFiles, null)
    }catch(e){
      logger.warn('falied to get outputFiles',e);
      return Promise.reject(e);
    }
  }

  //get files which match include filter
  if(task.include){
    const include =`${task.remoteWorkingDir}/${parseFilter(task.include)}`;
    const exclude = task.exclude ? `${task.remoteWorkingDir}/${parseFilter(task.exclude)}` : null;
    logger.debug('try to get ', include, '\n  from:',task.remoteWorkingDir, '\n  to:', task.workingDir, '\n  exclude filter:', exclude);
    try{
      await ssh.recv(task.remoteWorkingDir, task.workingDir, include, exclude)
    }catch(e){
      logger.warn('faild to get files',e);
      return Promise.reject(e);
    }
  }

  //clean up remote working directory
  if(task.doCleanup){
    logger.debug('(remote) rm -fr', task.remoteWorkingDir);
    try{
      await ssh.exec(`rm -fr ${task.remoteWorkingDir}`);
    }catch(e){
      // just log and ignore error
      logger.warn('remote cleanup failed',e);
    }
  }
  return rt;
}

/**
 * execute task on localhost(which is running node.js)
 * @param {Task} task - task instance
 * @return {Promise} - resolve with retun value from script when script is finished
 * rejected if child process is abnomaly terminated (e.g. permission error, signal cathed...)
 */
async function localExec(task){
  return new Promise((resolve, reject)=>{
    setTaskState(task, 'running');
    const script = path.resolve(task.workingDir, task.script);
    addXSync(script);
    //TODO env, uid, gidを設定する
    const options = {
      "cwd": task.workingDir,
      "env": process.env,
      "shell": true
    }
    if(task.currentIndex !== undefined) options.env.WHEEL_CURRENT_INDEX=task.currentIndex.toString();
    const cp = child_process.spawn(script, options, (err)=>{
      if(err){
        logger.warn(task.name, 'failed.', err);
        reject(err);
      }
    });
    cp.stdout.on('data', (data)=>{
      logger.stdout(data.toString());
    });
    cp.stderr.on('data', (data)=>{
      logger.stderr(data.toString());
    });
    cp.on('error', (err)=>{
      cp.removeAlllisteners('exit');
      reject(err);
    });
    cp.on('exit', (rt) =>{
      logger.debug(task.name, 'done. rt =', rt);
      resolve(rt);
    });
    task.handler = cp;
  });
}

async function remoteExec(task){
  setTaskState(task, 'running');
  const hostinfo = remoteHost.get(task.remotehostID);
  const ssh = getSsh(task.label, hostinfo.host);
  await prepareRemoteExecDir(ssh, task)
  logger.debug("prepare done");
  const scriptAbsPath=path.posix.join(task.remoteWorkingDir, task.script);
  const workdir=path.posix.dirname(scriptAbsPath);
  let cmd = `cd ${workdir} &&`;
  if(task.currentIndex) cmd = cmd + `env WHEEL_CURRENT_INDEX=${task.currentIndex.toString()} `
  cmd = cmd + scriptAbsPath;
  logger.debug('exec (remote)', cmd);

  //if exception occurred in ssh.exec, it will be catched in caller
  const rt = await ssh.exec(cmd, {}, passToSSHout, passToSSHerr);
  logger.debug(task.name, '(remote) done. rt =', rt);
  return rt === 0? gatherFiles(ssh, task, rt):rt;
}

function localSubmit(task){
  console.log('localSubmit function is not implimented yet');
}

function determinQueue(task, queues){
  let queue = null;
  const queueList = queues.split(',');
  if(task.queue in queueList){
    queue = task.queue;
  }else if (queueList.length > 0){
    queue = queueList[0];
  }
  return queue;
}

function makeSubmitCmd(task, JS, queues){
  const scriptAbsPath=path.posix.join(task.remoteWorkingDir, task.script);
  const workdir=path.posix.dirname(path.posix.join(task.remoteWorkingDir, task.script));
  let submitCmd = `cd ${workdir} &&`
  if(task.currentIndex) submitCmd = submitCmd+ `env WHEEL_CURRENT_INDEX=${task.currentIndex.toString()} `

  submitCmd += ` ${JS.submit}`
  const queue = determinQueue(task, queues);
  if(queue){
    submitCmd += ` ${JS.queueOpt}${queue}`;
  }
  submitCmd += ` ${scriptAbsPath}`;
  return submitCmd;
}

async function remoteSubmit(task){
  return new Promise(async (resolve, reject)=>{
    const hostinfo = remoteHost.get(task.remotehostID);
    const ssh = getSsh(task.label, hostinfo.host);
    await prepareRemoteExecDir(ssh, task);

    const JS = jobScheduler[hostinfo.jobScheduler];
    const submitCmd = makeSubmitCmd(task, JS, hostinfo.queue);

    logger.debug('submitting job (remote):', submitCmd);
    setTaskState(task, 'running');
    const output=[];
    const rt = await ssh.exec(submitCmd, {}, output, output);
    if(rt !== 0){
      logger.warn('remote submit command failed!\ncmd:',submitCmd,'\nrt:', rt);
      reject(new Error("submit command failed"));
    }
    const outputText = output.join("");
    const re = new RegExp(JS.reJobID);
    const result = re.exec(outputText);
    if(result === null || result[1] === null){
      logger.warn('getJobID failed\nsubmit command:',submitCmd,'\nfull output from submmit command:', outputText);
      reject(new Error("get jobID failed"));
    }
    const jobID = result[1];
    task.jobID=jobID;
    logger.info('submit success:', submitCmd, jobID);

    let statFailedCount=0;
    let statCheckCount=0;
    //check job stat repeatedly
    const timeout = setInterval(async ()=>{
      logger.debug(jobID,"status checked", statCheckCount);
      ++statCheckCount;
      if(task.state !== 'running'){
        // project is stopped
        clearInterval(timeout);
        reject(false);
      }
      try{
        const [finished, rt] = await isFinished(JS, ssh, jobID);
        if(finished){
          logger.info(jobID,'is finished (remote). rt =', rt);
          clearInterval(timeout);
          logger.debug('DEBUG 1',finished, rt);
          await gatherFiles(ssh, task, rt);
          logger.debug('DEBUG 2',finished, rt);
          resolve(rt);
          logger.debug('DEBUG 3',finished, rt);
        }
      }catch(err){
        ++statFailedCount;
        err.jobID = jobID;
        err.JS = JS;
        logger.warn('status check failed',err);
        const maxStatusCheckError=10; //TODO it should be get from hostinfo
        if(statFailedCount > maxStatusCheckError){
          reject(new Error("job status check failed over",maxStatusCheckError,"times"));
        }
      }
    },interval);
  });
}

class Executer{
  constructor(exec, maxNumJob, remotehostID, useJobScheduler){
    //remotehostID and useJobScheduler flag is not used inside Executer class
    //this 2 property is used as search key in exec();
    this.remotehostID=remotehostID;
    this.useJobScheduler=useJobScheduler;
    this.batch = new SBS({
      exec: async (task)=>{
        task.startTime = getDateString(true);
        let rt = await exec(task);
        if(task.state === 'not-started'){
          // prevent to overwrite killed task's property
          return
        }

        // record job finished time
        task.endTime = getDateString(true);

        // deliver files
        if(rt === 0){
          const rt2 = await deliverOutputFiles(task.outputFiles, task.workingDir)
          if(rt2.length > 0 ){
            logger.debug('deliverOutputFiles:\n',rt2);
            const maxRt2=rt2.reduce((p,e)=>{
              return p>e?p:e;
            });
            if(maxRt2 !== 0) rt = maxRt2;
          }
        }

        // update task status
        const state = rt === 0 ? "finished" : "failed";
        setTaskState(task, state);

        // to use retry function in the future release, return Promise.reject if task finished with non-zero value
        return rt === 0 ? task.state:Promise.reject(rt);
      },
      retry: false,
      maxConcurrent: maxNumJob
    });

    this.stop = this.batch.stop;
    this.start = this.batch.start;
  }
  submit(task){
    task.jobid = this.batch.qsub(task);
    if(task.jobid !== null) setTaskState(task, 'waiting');
  }
  cancel(task){
    return this.batch.qdel(task.jobid);
  }
}

function createExecuter(task){
  logger.debug('createExecuter called');
  let maxNumJob=1;
  let exec = localExec;
  //TODO add local submit case
  if(task.remotehostID !== 'localhost'){
    const hostinfo = remoteHost.get(task.remotehostID);
    maxNumJob = hostinfo.numJob;
    if(task.useJobScheduler && Object.keys(jobScheduler).includes(hostinfo.jobScheduler)){
      exec = remoteSubmit;
    }else{
      exec = remoteExec;
    }
  }
  maxNumJob = parseInt(maxNumJob, 10);
  if (Number.isNaN(maxNumJob) || maxNumJob < 1){
    maxNumJob = 1;
  }

  return new Executer(exec, maxNumJob, task.remotehostID, task.useJobScheduler);
}

/**
 * enqueue task
 * @param {Task} task - instance of Task class (dfined in workflowComponent.js)
 */
function exec(task){
  task.remotehostID=remoteHost.getID('name', task.host) || 'localhost';
  let executer = executers.find((e)=>{
    return e.remotehostID=== task.remotehostID && e.useJobScheduler=== task.useJobScheduler
  });
  if( executer === undefined){
    logger.debug('create new executer for', task.remotehostID,' with job scheduler', task.useJobScheduler);
    executer = createExecuter(task);
    executers.push(executer);
  }
  if(task.remotehostID !== 'localhost'){
    const hostinfo = remoteHost.get(task.remotehostID);
    const localWorkingDir = replacePathsep(path.relative(task.rwfDir, task.workingDir));
    task.remoteWorkingDir = replacePathsep(path.posix.join(hostinfo.path, task.projectStartTime, localWorkingDir));
  }
  executer.submit(task);
}

function cancel(task){
  if(task.jobid === undefined) return;
  task.remotehostID=remoteHost.getID('name', task.host) || 'localhost';
  let executer = executers.find((e)=>{
    return e.remotehostID=== task.remotehostID && e.useJobScheduler=== task.useJobScheduler
  });
  if( executer === undefined){
    logger.warn('executer for', task.remotehostID,' with job scheduler' ,task.useJobScheduler, 'is not found');
    return;
  }
  return executer.cancel(task);
}

module.exports.exec = exec;
module.exports.cancel = cancel;
