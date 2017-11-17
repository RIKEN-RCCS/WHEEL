const child_process = require('child_process');
const path = require('path');
const fs = require('fs');

const config = require('../config/server.json');
const logger = require('../logger');
const jsonArrayManager= require('./jsonArrayManager');
const { addX } = require('./utility');

const remotehostFilename = path.resolve('./app', config.remotehost);
const remoteHost= new jsonArrayManager(remotehostFilename);



let executers=[];

/**
 * execute task on localhost(which is running node.js)
 * @param {Task} task - task instance
 * @return pid - process id of child process
 */
function localExec(task){
  let script = path.resolve(task.workingDir, task.script);
  addX(script);
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

function localSubmit(qsub, task){
  console.log('localSubmit function is not implimented yet');
}
function remoteExecAdaptor(sshExec, task){
  console.log('remoteExec function is not implimented yet');
}
function remoteSubmitAdaptor(sshExec, qsub, task){
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
        console.log('DEBUG: execute \n',task.workingDir,'\n',task.name);
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

function createExecuter(task){
  let maxNumJob=1;
  let exec = localExec;
  if(task.jobScheduler !== null){
    exec = localSubmit.bind(qsub);
  }
  if(task.remotehostID!== 'localhost'){
    let hostinfo = remoteHost.get(task.remotehostID);
    maxNumJob = hostinfo.maxNumJob;
    //TODO tableからsshProxyのインスタンスを取り出す(無ければ新規作成してTableに入れる)
    //TODO return sshProxyのexecメソッドを返す
    //TODO maxNumJobをremotehostの設定で上書き
  }
  return new Executer(exec, maxNumJob, task.remotehostID, task.jobScheduler);
}

/**
 * enqueue task
 * @param {Task} task - instance of Task class (dfined in workflowComponent.js)
 */
function exec(task){
  task.remotehostID=remoteHost.getID('host', task.host) || 'localhost';
  let executer = executers.find((e)=>{
    return e.remotehostID=== task.remotehostID && e.jobScheduler=== task.jobScheduler
  });
  if( executer === undefined){
    executer = createExecuter(task);
  }
  executer.submit(task);
}

module.exports.exec= exec;
