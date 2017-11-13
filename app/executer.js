const config = require('./config/server.json');
const localExecuter=require('./localExecuter');

let executers={};
executers.localhost=localExecuter;

function batchFactory(host, schduler){
  if(scheduler === 'null'){
    return executers[host].submit;
  }else{
  }
}

// start submitting repeatedly 
setInterval(()=>{
  if(queue.length >0){
    let task = queue.pop()
    let submit = batchFactory(task.host, task.jobScheduler);
    submit(task);
  }
  //TODO 
  //登録済のexecuterを全部まわしてexecする
}, config.interval);

let queue=[];

/**
 * enqueue task
 * @param {Task} task - instance of Task class (dfined in workflowComponent.js)
 */
function enqueue(task){
  queue.push(task);
  console.log('current queue length = ',queue.length);
}

module.exports.enqueue = enqueue;
