const child_process = require('child_process');
const path = require('path');
const fs = require('fs');

const getSsh = require('./sshManager');
const config = require('../config/server.json');
const logger = require('../logger');
const jsonArrayManager= require('./jsonArrayManager');
const { addXSync, readPrivateKey } = require('./utility');

const remotehostFilename = path.resolve(__dirname, '../', config.remotehost);
const remoteHost= new jsonArrayManager(remotehostFilename);

let executers=[];

let getDateString = ()=>{
  let now = new Date;
  let yyyy = `0000${now.getFullYear()}`.slice(-4);
  let mm = `00${now.getMonth()}`.slice(-2);
  let dd = `00${now.getDate()}`.slice(-2);
  let HH = `00${now.getHours()}`.slice(-2);
  let MM = `00${now.getMinutes()}`.slice(-2);
  let ss = `00${now.getSeconds()}`.slice(-2);

  return `${yyyy}${mm}${dd}-${HH}${MM}${ss}`;
}

/**
 * execute task on localhost(which is running node.js)
 * @param {Task} task - task instance
 * @return pid - process id of child process
 */
function localExec(task){
  let script = path.resolve(task.workingDir, task.script);
  addXSync(script);
  //TODO env, uid, gidを設定する
  let options = {
    "cwd": task.workingDir
  }
  let cp = child_process.exec(script, options, (err, stdout, stderr)=>{
    if(err) throw err;
    logger.stdout(stdout);
    logger.stderr(stderr);
  })
    .on('exit', (code) =>{
      if(code === 0){
        task.state = 'finished';
      }else{
        task.state = 'failed';
      }
    });
  return cp.pid;
}

async function remoteExecAdaptor(ssh, task){
  let script = path.resolve(task.workingDir, task.script);
  addXSync(script);
  await ssh.mkdir_p(task.remoteWorkingDir);
  await ssh.send(task.workingDir, task.remoteWorkingDir);
  let cmd = path.posix.join(task.remoteWorkingDir, task.script);
  let opt = {
    env: {
      PWD: task.remoteWorkingDir
    }
  }

  debugger;
  let rt = await ssh.exec(cmd, opt);
  if(rt === 0){
    task.state = 'finished';
  }else{
    task.state = 'failed';
  }
  await ssh.recv(task.remoteWorkingDir, task.workingDir);
  //TODO cleanup flagを確認してremoteWorkingDirを全削除なんだけどrm-rfが無いな・・・
}

function localSubmit(qsub, task){
  console.log('localSubmit function is not implimented yet');
}
function remoteSubmitAdaptor(sshExec, prepare, cleanup, qsub, task){
  console.log('remoteSubmit function is not implimented yet');
}

class Executer{
  constructor(exec, maxNumJob, remotehostID, jobScheduler){
    this.remotehostID=remotehostID;
    this.jobScheduler=jobScheduler;

    this.exec=exec;
    this.maxNumJob=maxNumJob;

    this.queue=[];
    this.currentNumJob=0;
    this.executing=false;
    setInterval(()=>{
      if(this.executing) return;
      this.executing=true;
      if(this.queue.length >0 && this.currentNumJob < this.maxNumJob){
        let task = this.queue.pop()
        task.handler = this.exec(task);
        this.currentNumJob++;
      }
      this.executing=false;
    }, config.interval);
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
  let maxNumJob=1;
  let exec = localExec;
  if(task.jobScheduler !== null){
    exec = localSubmit.bind(qsub);
  }
  if(task.remotehostID!== 'localhost'){
    let hostinfo = remoteHost.get(task.remotehostID);
    let config = {
      host: hostinfo.host,
      port: hostinfo.port,
      username: hostinfo.username,
    }
    //TODO task.workingDirをプロジェクトrootからの相対パスに変更
    task.remoteWorkingDir = path.posix.join(hostinfo.path, getDateString(),task.workingDir);

    //TODO ask password

    await readPrivateKey(hostinfo.keyFile, config, pass);
    debugger;
    let arssh = getSsh(config, {connectionRetryDelay: 1000});
    arssh.on('stdout', (data)=>{
      logger.SSHout(data.toString());
    });
    arssh.on('stderr', (data)=>{
      logger.SSHerr(data.toString());
    });
    exec = remoteExecAdaptor.bind(null, arssh)
    maxNumJob = hostinfo.numJob;
  }
  maxNumJob = parseInt(maxNumJob, 10);
  if (Number.isNaN(maxNumJob) || maxNumJob < 1){
    maxNumJob = 1;
  }

  return new Executer(exec, maxNumJob, task.remotehostID, task.jobScheduler);
}

/**
 * enqueue task
 * @param {Task} task - instance of Task class (dfined in workflowComponent.js)
 */
async function exec(task){
  task.remotehostID=remoteHost.getID('name', task.host) || 'localhost'; //TODO to be replaced by id search
  let executer = executers.find((e)=>{
    return e.remotehostID=== task.remotehostID && e.jobScheduler=== task.jobScheduler
  });
  if( executer === undefined){
    executer = await createExecuter(task);
  }
  executer.submit(task);
}

module.exports.exec= exec;
