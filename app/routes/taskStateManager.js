let runningTasks=[];

let running=false;
setInterval(()=>{
  if(running) return;
  running=true;
  runningTasks.forEach((e)=>{
    // locally executed task's state is checkd by event emitter
    if(! e.task.jobScheduler){
      let checTask=createChecker(e.task, e.handler);
      e.task.state = checkTask(e.task, e.handler);
    }
  });
  running=false;
}, config.interval);

function createChecker(task){
  if(task.jobScheduler === null){
    return remoteProcessChecker.bind(task.remotehostID);
  }else{
    //TODO local でqsubした時の対応
    return remoteQstat.bind(task.remotehostID);
  }
}

function remoteProcessChecker(remotehostID, pid){
}
function remoteQstat(remotehostID, jobID){
}


function register(task, handler){
  runningTasks.push({"task": task, "handler": handler});
}

module.exports.register=register
