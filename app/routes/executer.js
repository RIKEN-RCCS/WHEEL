const cp = require('child_process');

const config = require('../config/server.json');
const logger = require("../logger");

function localExec(task){
  return cp.exec(cmdline,(err, stdout, stderr)=>{
    if(err) throw err;
    logger.stdout(stdout);
    logger.stderr(stderr);
  }).pid;
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
  constructor(exec, stat, maxNumJob, host, jobScheduler){
    this.host=host;
    this.jobScheduler=jobScheduler;

    this.exec=exec;
    this.stat=stat;
    this.maxNumJob=maxNumJob;

    this.queue=[];
    this.currentNumJob=0;
    setInterval(()=>{
      if(queue.length >0 && this.currentNumJob < this.maxNumJob){
        let task = queue.pop()
        //TODO バッチに投げた時にJobIDを取得して返す
        let pid = this.exec(task);
        this.currentNumJob++;
      }
      task.state=this.stat(task);
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
  let scheduler = createJobScheduler(task.jobScheduler);
  let qsub = scheduler.getQsubCmd();
  let qstat = scheduler.getQstatCmd();
  if(task.jobScheduler !== null){
    exec = localSubmit.bind(qsub);
  }
  if(task.host !== 'localhost'){
    //TODO remotehost.jsonを読み込む
    //TODO task.hostとhostnameが一致する設定を取り出す
    //TODO tableからsshProxyのインスタンスを取り出す(無ければ新規作成してTableに入れる)
    //TODO return sshProxyのexecメソッドを返す
    //TODO maxNumJobをremotehostの設定で上書き
  }
  return new Executer(exec, qstat, maxNumJob, host, jobScheduler);
}

let executers=[];
/**
 * enqueue task
 * @param {Task} task - instance of Task class (dfined in workflowComponent.js)
 */
function exec(task){
  let executer = executers.find((e)=>{
    return e.host === task.host && e.jobScheduler=== task.jobScheduler
  });
  if( executer === undfined){
    executer = createExecuter(task);
  }
  executer.submit(task);
}

module.exports.exec= exec;
