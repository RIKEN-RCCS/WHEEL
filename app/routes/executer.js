const child_process = require('child_process');
const path = require('path');
const fs = require('fs');
const {promisify} = require('util');

const {getLogger} = require('../logSettings');
const logger = getLogger('workflow');

const {getSsh} = require('./sshManager');
const {interval, remoteHost, jobScheduler} = require('../db/db');
const {addXSync, replacePathsep, getDateString} = require('./utility');

let executers=[];

function parseFilter(pattern){
  if(pattern.startsWith('{') && pattern.endsWith('}')){
    return pattern
  }else if(! pattern.includes(',')){
    return pattern
  }else{
    return `{${pattern}}`;
  }
}

/**
 * execute task on localhost(which is running node.js)
 * @param {Task} task - task instance
 * @return pid - process id of child process
 */
function localExec(task, cb){
  const script = path.resolve(task.workingDir, task.script);
  addXSync(script);
  //TODO env, uid, gidを設定する
  const options = {
    "cwd": task.workingDir,
    "env": {}
  }
  if(task.currentIndex) options.env.WHEEL_CURRENT_INDEX=task.currentIndex.toString();

  const cp = child_process.spawn(script, options, (err)=>{
    if(err){
      logger.warn(task.name, 'failed.', err);
      cb(false);
    }
  });
  cp.stdout.on('data', (data)=>{
    logger.stdout(data.toString());
  });
  cp.stderr.on('data', (data)=>{
    logger.stderr(data.toString());
  });
  cp.on('exit', (rt) =>{
    logger.debug(task.name, 'done. rt =', rt);
    cb(rt === 0);
  });
  return cp;
}

async function prepareRemoteExecDir(ssh, task){
  logger.debug(task.remoteWorkingDir, task.script);
  let remoteScriptPath = path.posix.join(task.remoteWorkingDir, task.script);
  logger.debug(`send ${task.workingDir} to ${task.remoteWorkingDir}`);
  return ssh.send(task.workingDir, task.remoteWorkingDir)
  .then(()=>{
    return ssh.chmod(remoteScriptPath, '744');
  });
}
async function postProcess(ssh, task, rt, cb){
  task.state='stage-out';
  logger.debug('get necessary files from remote server');

  //get outputFiles from remote server
  const outputFilesArray = task.outputFiles.filter((e)=>{
    if(e.dst.length >0) return e;
  }).map((e)=>{
    if(e.name.endsWith('/') || e.name.endsWith('\\')){
      const dirname = replacePathsep(e.name);
      return `${dirname}/*`;
    }else{
      return e.name;
    }
  });
  const outputFiles= `${task.remoteWorkingDir}/${parseFilter(outputFilesArray.join())}`;
  try{
    logger.debug('try to get outputFiles', outputFiles, '\n  from:', task.remoteWorkingDir, '\n  to:',task.workingDir);
    await ssh.recv(task.remoteWorkingDir, task.workingDir, outputFiles, null)
  }catch(e){
    logger.warn('falied to get outputFiles',e);
    cb(false);
    return
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
    }
  }
  if(task.doCleanup){
    logger.debug('(remote) rm -fr', task.remoteWorkingDir);
    try{
      await ssh.exec(`rm -fr ${task.remoteWorkingDir}`);
    }catch(e){
      logger.warn('remote cleanup failed',e);
      cb(false);
      return
    }
  }
  logger.debug(task.name, 'done. rt =', rt);
  cb(rt===0);
}

async function remoteExecAdaptor(ssh, task, cb){
  await prepareRemoteExecDir(ssh, task)
  logger.debug("prepare done");
  const scriptAbsPath=path.posix.join(task.remoteWorkingDir, task.script);
  const workdir=path.posix.dirname(scriptAbsPath);
  let cmd = `cd ${workdir} &&`;
  if(task.currentIndex) cmd = cmd + `env WHEEL_CURRENT_INDEX=${task.currentIndex.toString()} `
  cmd = cmd + scriptAbsPath;

  const passToSSHout=(data)=>{
    logger.sshout(data.toString().trim());
  }
  const passToSSHerr=(data)=>{
    logger.ssherr(data.toString().trim());
  }
  ssh.on('stdout', passToSSHout);
  ssh.on('stderr', passToSSHerr);
  logger.debug('exec (remote)', cmd);
  let rt = await ssh.exec(cmd);
  ssh.off('stdout', passToSSHout);
  ssh.off('stderr', passToSSHerr);
  return postProcess(ssh, task, rt, cb);
}

function localSubmit(qsub, task, cb){
  console.log('localSubmit function is not implimented yet');
}
async function remoteSubmitAdaptor(ssh, task, cb){
  await prepareRemoteExecDir(ssh, task);
  const scriptAbsPath=path.posix.join(task.remoteWorkingDir, task.script);
  const workdir=path.posix.dirname(scriptAbsPath);
  let submitCmd = `cd ${workdir} &&`
  if(task.currentIndex) submitCmd = submitCmd+ `env WHEEL_CURRENT_INDEX=${task.currentIndex.toString()} `

  const hostinfo = remoteHost.get(task.remotehostID);
  const JS = jobScheduler[hostinfo.jobScheduler];
  submitCmd += ` ${JS.submit}`

  let queue = null;
  const queueList = hostinfo.queue.split(',');
  if(task.queue in queueList){
    queue = task.queue;
  }else if (queueList.length > 0){
    queue = queueList[0];
  }
  if(queue){
    submitCmd += ` ${JS.queueOpt}${queue}`;
  }
  submitCmd += ` ${scriptAbsPath}`;

  const output=[];

  let jobID=null;
  let getJobID = (data)=>{
    logger.debug('getJobID() called');
    let outputText=data.toString();
    logger.debug(outputText);
    let re = new RegExp(JS.reJobID);
    const result = re.exec(outputText);
    if(result === null){
      logger.warn('getJobID failed');
      return
    }
    jobID = result[1];
    logger.info('jobID:', jobID);
  }
  ssh.on('stdout', getJobID);
  logger.debug('submit job:', submitCmd);
  let rt = await ssh.exec(submitCmd, {}, output, output);
  ssh.off('stdout', getJobID);
  //TODO ssh.execからstdout/stderrを返すように変更して整理する
  //
  if(rt !== 0){
    logger.warn('remote submit command failed!', rt);
    logger.warn(error);
    cb(false);
    return
  }
  if(jobID===null){
    logger.warn('illegal jobID');
    cb(false);
    return;
  }
  let finished=false;
  let isFinished = (data)=>{
    logger.debug('isFinished() called');
    let outputText=data.toString();
    logger.debug(outputText);
    let reFinishedState = new RegExp(JS.reFinishedState);
    finished=reFinishedState.test(outputText);
    if(finished) return;
    let reFailedState  = new RegExp(JS.reFailedState);
    finished=reFailedState.test(outputText);
  }
  ssh.on('stdout', isFinished);

  let timeout = setInterval(async ()=>{
    let cmd=`${JS.stat} ${jobID}`;
    logger.debug(cmd);
    let rt = await ssh.exec(cmd);
    if(rt !== 0){
      logger.warn('remote stat command failed!', rt);
      logger.warn(error);
      return
    }
    logger.debug(jobID,'is finished', finished);
    if(finished){
      clearInterval(timeout);
      ssh.off('stdout', isFinished);
      postProcess(ssh, task, rt, cb);
    }
  },5000);
}

class Executer{
  constructor(exec, maxNumJob, remotehostID, useJobScheduler){
    //remotehostID and useJobScheduler flag is not used inside Executer class
    //this 2 property is used as search key in exec();
    this.remotehostID=remotehostID;
    this.useJobScheduler=useJobScheduler;

    this.exec=exec;
    this.maxNumJob=maxNumJob;

    this.queue=[];
    this.currentNumJob=0;
    this.executing=false;
    this.timeout=null;
  }
  stop(){
    clearInterval(this.timeout);
    this.timeout=null;
  }
  start(){
    this.timeout = setInterval(()=>{
      if(this.executing) return;
      this.executing=true;
      if(this.queue.length >0 && this.currentNumJob < this.maxNumJob){
        let task = this.queue.pop()
        task.startTime = getDateString(true);
        task.handler = this.exec(task, (isOK)=>{
          task.endTime = getDateString(true);
          if(isOK){
            task.state = 'finished';
          }else{
            task.state = 'failed';
          }
          this.currentNumJob--;
        });
        this.currentNumJob++;
      }
      logger.debug('running job:',this.currentNumJob,'/',this.maxNumJob);
      if(this.queue.length === 0) this.stop();
      this.executing=false;
    }, interval);
  }
  submit(task){
    this.queue.push(task);
    task.state='waiting';
    if(this.timeout === null) this.start();
  }
  cancel(task){
    this.queue=this.queue.filter((e)=>{
      return e.id!==task.id;
    });
    task.sate='not-started';
  }
}

async function createExecuter(task){
  logger.debug('createExecuter called');
  let maxNumJob=1;
  let exec = localExec;
  //TODO add local submit case
  if(task.remotehostID !== 'localhost'){
    let hostinfo = remoteHost.get(task.remotehostID);
    maxNumJob = hostinfo.numJob;
    let config = {
      host: hostinfo.host,
      port: hostinfo.port,
      username: hostinfo.username,
    }
    let arssh = getSsh(config, {connectionRetryDelay: 1000});

    if(task.useJobScheduler && Object.keys(jobScheduler).includes(hostinfo.jobScheduler)){
      exec = remoteSubmitAdaptor.bind(null, arssh)
    }else{
      exec = remoteExecAdaptor.bind(null, arssh)
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
async function exec(task){
  task.remotehostID=remoteHost.getID('name', task.host) || 'localhost';
  let executer = executers.find((e)=>{
    return e.remotehostID=== task.remotehostID && e.useJobScheduler=== task.useJobScheduler
  });
  if( executer === undefined){
    logger.debug('create new executer for', task.remotehostID,' with job scheduler', task.useJobScheduler);
    executer = await createExecuter(task);
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
  task.remotehostID=remoteHost.getID('name', task.host) || 'localhost';
  let executer = executers.find((e)=>{
    return e.remotehostID=== task.remotehostID && e.useJobScheduler=== task.useJobScheduler
  });
  if( executer === undefined){
    logger.warn('executer for', task.remotehostID,' with job scheduler' ,task.useJobScheduler, 'is not found');
    return;
  }
  executer.cancel(task);
}

module.exports.exec= exec;
module.exports.cancel= cancel;
