const child_process = require('child_process');
const path = require('path');
const fs = require('fs');
const {promisify} = require('util');

const {getLogger} = require('../logSettings');
const logger = getLogger('workflow');

const {getSsh} = require('./sshManager');
const {interval, remoteHost, jobScheduler} = require('../db/db');
const {addXSync, getDateString, replacePathsep} = require('./utility');

let executers=[];

/**
 * execute task on localhost(which is running node.js)
 * @param {Task} task - task instance
 * @return pid - process id of child process
 */
function localExec(task, cb){
  let script = path.resolve(task.workingDir, task.script);
  addXSync(script);
  //TODO env, uid, gidを設定する
  let options = {
    "cwd": task.workingDir
  }
  let cp = child_process.exec(script, options, (err, stdout, stderr)=>{
    if(err) throw err;
    logger.stdout(stdout.trim());
    logger.stderr(stderr.trim());
  })
    .on('exit', (code) =>{
      cb(code === 0);
    });
  return cp.pid;
}

async function prepareRemoteExecDir(ssh, task){
  debugger;
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

  const necessaryFilesArray=task.outputFiles.filter((e)=>{
    return e;
  }).map((e)=>{
    return e.name;
  });
  if(task.include) necessaryFilesArray.push(task.include);

  if(necessaryFilesArray.length > 0){
    const necessaryFiles = necessaryFilesArray.length === 1 ? `${task.remoteWorkingDir}/${necessaryFilesArray[0]}`:`${task.remoteWorkingDir}/{${necessaryFilesArray.join()}}`
    logger.debug('try to get ', necessaryFiles, 'from ',task.remoteWorkingDir,'to',task.workingDir);
    const excludeFilter = task.exclude ? task.exclude : null;
    await ssh.recv(task.remoteWorkingDir, task.workingDir, necessaryFiles, excludeFilter)
  }
  if(task.doCleanup){
    logger.debug('clean up on remote server');
    await ssh.exec(`rm -fr ${task.remoteWorkingDir}`);
  }
  logger.debug(task.name, 'done. rt =', rt);
  cb(rt===0);
}

async function remoteExecAdaptor(ssh, task, cb){
  await prepareRemoteExecDir(ssh, task)
  logger.debug("prepare done");
  let scriptAbsPath=path.posix.join(task.remoteWorkingDir, task.script);
  let workdir=path.posix.dirname(scriptAbsPath);
  let cmd = `cd ${workdir} && ${scriptAbsPath}`;
  let passToSSHout=(data)=>{
    logger.sshout(data.toString().trim());
  }
  let passToSSHerr=(data)=>{
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
  let scriptAbsPath=path.posix.join(task.remoteWorkingDir, task.script);
  let workdir=path.posix.dirname(scriptAbsPath);
  let submitCmd = `cd ${workdir} &&`

  let hostinfo = remoteHost.get(task.remotehostID);
  let JS = jobScheduler[hostinfo.jobScheduler];
  submitCmd += ` ${JS.submit}`

  let queue = null;
  let queueList = hostinfo.queue.split(',');
  if(task.queue in queueList){
    queue = task.queue;
  }else if (queueList.length > 0){
    queue = queueList[0];
  }
  if(queue){
    submitCmd += ` ${JS.queueOpt}${queue}`;
  }
  submitCmd += ` ${scriptAbsPath}`;

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
  let rt = await ssh.exec(submitCmd);
  ssh.off('stdout', getJobID);
  //TODO ssh.execからstdout/stderrを返すように変更して整理する
  //
  if(rt !== 0){
    logger.error('remote submit command failed!', rt);
    logger.error(error);
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
      logger.error('remote stat command failed!', rt);
      logger.error(error);
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
    //TODO  queue.lengthが0になったら止め、submitが呼ばれたらもう一度動かすように変更
    this.timeout = setInterval(()=>{
      if(this.executing) return;
      this.executing=true;
      if(this.queue.length >0 && this.currentNumJob < this.maxNumJob){
        let task = this.queue.pop()
        task.handler = this.exec(task, (isOK)=>{
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
      this.executing=false;
    }, interval);
  }
  submit(task){
    this.queue.push(task);
    task.state='waiting';
  }
  cancel(task){
    this.queue=this.queue.filter((e)=>{
      return e.id!==task.id;
    });
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
  task.remotehostID=remoteHost.getID('name', task.host) || 'localhost'; //TODO to be replaced by id search
  let executer = executers.find((e)=>{
    return e.remotehostID=== task.remotehostID && e.useJobScheduler=== task.useJobScheduler
  });
  if( executer === undefined){
    logger.debug('create new executer for', task.remotehostID,' with job scheduler', task.useJobScheduler);
    executer = await createExecuter(task);
    executers.push(executer);
  }

  const hostinfo = remoteHost.get(task.remotehostID);
  const localWorkingDir = replacePathsep(path.relative(task.rwfDir, task.workingDir));
  task.remoteWorkingDir = replacePathsep(path.posix.join(hostinfo.path, task.projectStartTime, localWorkingDir));

  executer.submit(task);
}

module.exports.exec= exec;
