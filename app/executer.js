const config = require('./config/server.json');

// start submitting repeatedly 
setInterval(()=>{
  if(queue.length >0){
    let task = queue.pop()
    submit(task);
  }
}, config.interval);

let queue=[];

/**
 * enqueue task
 * @param {Task} task - instance of Task class (dfined in workflowComponent.js)
 */
function enqueue(task){
  queue.push(task);
}

function submit(task){
  if(task.host === 'localhost'){
    if(task.jobScheduler===null){
      return execLocal(task);
    }else{
      return submitLocal(task);
    }
  }else{
    if(task.jobScheduler===null){
      return execRemote(task);
    }else{
      return submitRemote(task);
    }
  }
}

function execLocal(task){
}
function submitLocal(task){
}
function execRemote(task){
}
function submitRemote(task){
}

module.exports.enqueue = enqueue;
