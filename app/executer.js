const config = require('./config/server.json');

let queue=[];
let timeout = setInterval(()=>{
  exec();
}, config.interval);
function enqueue(task){
  queue.push(task);
}

// private function
function exec(){
  //stub
  if(queue.length >0){
    let task = queue.pop()
    console.log(task);
  }
}

module.exports.enqueue = enqueue;
