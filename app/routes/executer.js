const child_process = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const {promisify} = require('util');

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
};

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

  return finished;
}

async function remoteExec(task, cb){
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

  ssh.on('stdout', passToSSHout);
  ssh.on('stderr', passToSSHerr);
  logger.debug('exec (remote)', cmd);
  let rt=null;
  try{
    rt = await ssh.exec(cmd);
  }catch(e){
    logger.warn('remote exec failed:',e);
    cb(false);
  }
  ssh.off('stdout', passToSSHout);
  ssh.off('stderr', passToSSHerr);
  if(rt === 0){
    await postProcess(ssh, task, rt, cb);
  }else{
    logger.warn('script returned', rt);
    cb(false);
  }
}


/**
 * execute task on localhost(which is running node.js)
 * @param {Task} task - task instance
 * @return pid - process id of child process
 */
function localExec(task, cb){
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
  setTaskState(task, 'stage-in');
  logger.debug(task.remoteWorkingDir, task.script);
  const localScriptPath = path.resolve(task.workingDir, task.script);
  await replaceCRLF(localScriptPath);
  const remoteScriptPath = path.posix.join(task.remoteWorkingDir, task.script);
  logger.debug(`send ${task.workingDir} to ${task.remoteWorkingDir}`);
  await ssh.send(task.workingDir, task.remoteWorkingDir)
  return ssh.chmod(remoteScriptPath, '744');
}
async function postProcess(ssh, task, rt, cb){
  setTaskState(task, 'stage-out');
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
  if(outputFilesArray.length>0){
    const outputFiles= `${task.remoteWorkingDir}/${parseFilter(outputFilesArray.join())}`;
    try{
      logger.debug('try to get outputFiles', outputFiles, '\n  from:', task.remoteWorkingDir, '\n  to:',task.workingDir);
      await ssh.recv(task.remoteWorkingDir, task.workingDir, outputFiles, null)
    }catch(e){
      logger.warn('falied to get outputFiles',e);
      cb(false);
      return
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
    }
  }

  //clean up remote working directory
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

function localSubmit(qsub, task, cb){
  console.log('localSubmit function is not implimented yet');
}

async function remoteSubmit(task, cb){
  const hostinfo = remoteHost.get(task.remotehostID);
  const ssh = getSsh(task.label, hostinfo.host);
  await prepareRemoteExecDir(ssh, task);
  setTaskState(task, 'running');
  const scriptAbsPath=path.posix.join(task.remoteWorkingDir, task.script);
  const workdir=path.posix.dirname(scriptAbsPath);
  let submitCmd = `cd ${workdir} &&`
  if(task.currentIndex) submitCmd = submitCmd+ `env WHEEL_CURRENT_INDEX=${task.currentIndex.toString()} `

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

  logger.debug('submitting job:', submitCmd);
  const output=[];
  const rt = await ssh.exec(submitCmd, {}, output, output);
  if(rt !== 0){
    logger.warn('remote submit command failed!\ncmd:',submitCmd,'\nrt:', rt);
    cb(false);
    return
  }
  const outputText = output.join("");

  const re = new RegExp(JS.reJobID);
  const result = re.exec(outputText);
  if(result === null || result[1] === null){
    logger.warn('getJobID failed\nsubmit command:',submitCmd,'\nfull output from submmit command:', outputText);
    cb(false);
    return
  }
  const jobID = result[1];
  task.jobID=jobID;
  logger.info('submit success:', scriptAbsPath, jobID);

  //check job stat repeatedly
  const timeout = setInterval(async ()=>{
    if(task.state !== 'running'){
      clearInterval(timeout);
      cb(false);
      return;
    }
    try{
    const finished = await isFinished(JS, ssh, jobID);
      if(finished){
        logger.info(jobID,'is finished');
        clearInterval(timeout);
        postProcess(ssh, task, rt, cb);
      }
    }catch(err){
      err.jobID = jobID;
      err.JS = JS;
      logger.warn('status check failed',err);
    }
  },5000); //TODO get interval value from server.json
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
        this.currentNumJob++;
        let task = this.queue.pop()
        task.startTime = getDateString(true);
        task.handler = this.exec(task, (isOK)=>{
          task.endTime = getDateString(true);
          // prevent to overwrite killed task's state
          if(task.state !== 'not-started'){
            if(isOK){
              setTaskState(task, 'finished');
              // TODO errors occurred in deliverOutputFiles can not be seen
              deliverOutputFiles(task.outputFiles, task.workingDir)
                .then((rt)=>{
                  if(rt.length > 0 ){
                    logger.debug('deliverOutputFiles:\n',rt);
                  }
                });
            }else{
              setTaskState(task, 'failed');
            }
          }
          this.currentNumJob--;
        });
      }
      logger.debug('running job:',this.currentNumJob,'/',this.maxNumJob);
      if(this.queue.length === 0) this.stop();
      this.executing=false;
    }, interval);
  }
  submit(task){
    this.queue.push(task);
    setTaskState(task, 'waiting');
    if(this.timeout === null) this.start();
  }
  cancel(task){
    this.queue=this.queue.filter((e)=>{
      return e.id!==task.id;
    });
    setTaskState(task, 'not-started');
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
