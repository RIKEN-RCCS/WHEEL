const fs= require('fs');
const util= require('util');
//const { exec } = require('child_process');
const exec = util.promisify(require('child_process').exec);

const config = require('./config/server.json');
const logger=require('./logger');
const executer = require('./executer');


// utility functions
function _forGetCurrentIndex(node){
  return node.currentIndex? node.currentIndex + node.step : node.start;
}
function _forIsFinished(node){
  return (node.currentIndex > node.end && node.step > 0 ) || (node.currentIndex < node.end && node.step < 0);
}
function _whileGetCurrentIndex(node){
  return node.currentIndex? ++(node.currentIndex) : 0;
}
function _whileIsFinished(node){
  return _evalCondition(node.condition);
}
function _foreachGetCurrentIndex(node){
  if(node.currentIndex){
    let i = node.indexList.indexOf(node.currentIndex);
    return node.indexList[i+1];
  }else{
    return node.indexList[0];
  }
}
function _foreachIsFinished(node){
  return node.currentIndex >= node.indexList.length;
}

async function _evalScript(script){
  var rt=false;
  exec(script).on('exit',(code)=>{
    rt = code === 0;
  });
  return rt;
}

async function _evalCondition(condition){
  let rt=false;
  try {
    await util.promisify(fs.access)(condition, fs.constants.X_OK);
    rt = await _evalScript(condition);
  }
  catch (err){
    if(err.code ===  'ENOENT' ){
      rt = eval(condition);
    }
  }
  return rt;
}



/**
 * parse workflow graph and dispatch ready tasks to executer
 */
class Dispatcher{
  constructor(workflow){
    this.currentSearchList=[];
    this.nextSearchList=[];
    this.children=[];
    this.nodes=workflow.nodes;
    this.nodes.forEach((v,i)=>{
      if(v.previous.length===0 && v.inputFiles.length===0){
        this.currentSearchList.push(i);
      }
    });
    logger.debug('initial task index: ',this.currentSearchList);
  }

  dispatch(){
    this.timeout = setInterval(async ()=>{
      let promises=[];
      while(this.currentSearchList.length>0){
        let target = this.currentSearchList.shift();
        if(! this._isReady(target)){
          this.nextSearchList.push(target);
          return;
        }
        let node=this.nodes[target]
        let cmd = this._cmdFactory(node.type.toLowerCase());
        promisees.push(cmd.call(this, node));
      }
      await Promise.all(promises)
      this.currentSearchList=this.nextSearchList;
      this.nextSearchList=[];
    }, config.interval);
  }

  isFinished(){
    let finished=true;
    this.children.forEach((child)=>{
      if(!child.isFinished()){
        finished=false;
      }
    });
    if(this.currentSearchList.length > 0) finished=false;
    if(this.nextSearchList.length > 0) finished=false;
    return finished;
  }

  remove(){
    this.children.forEach((child)=>{
      child.remove();
    });
    if(this.timeout != null){
      clearInterval(this.timeout);
      this.timeout=null;
    }
  }



  _dispatchTask(task){
    executer.enqueue(task);
    task.next.forEach((next)=>{
      this.nextSearchList.push(next);
    });
  }

  _checkIf(node){
    async ()=>{
      let condition = await _evalCondition(node.condition);
      let next = condition? node.next: node.else;
      Array.prototype.push.apply(this.nextSearchList, next);
    }
  }

  _loopHandler(getCurrentIndex, isFinished, node){
    let oldIndex=node.currentIndex;
    node.currentIndex = getCurrentIndex(node);
    if(isFinished(node)){
      Array.prototype.push.apply(this.nextSearchList, node.next);
    }else{
      async ()=>{
        let newWorkflow = await this._copyLoopDir(oldIndex, node);
        this._delegate(newWorkflow);
      }
    }
  }

  _cmdFactory(type){
    let cmd=function(){};
    switch(type){
      case 'task':
        cmd = this._dispatchTask;
        break;
      case 'if':
        cmd = this._checkIf;
        break;
      case 'for':
        cmd = this._loopHandler.bind(this, _forGetCurrentIndex, _forIsFinished);
        break;
      case 'while':
        cmd = this._loopHandler.bind(this, _whileGetCurrentIndex, _whileIsFinished);
        break;
      case 'foreach':
        cmd = this._loopHandler.bind(this, _foreachGetCurrentIndex, _foreachIsFinished);
        break;
      case 'workflow':
        console.log('not implemented yet !');
        break;
      case 'parameterstudy':
        console.log('not implemented yet !');
        break;
    }
    return cmd;
  }
  _isReady(index){
    let ready = true
    this.nodes[index].previous.forEach((i)=>{
      if(!(this.nodes[i].state === 'done' || this.nodes[i].state === 'failed')){
        ready = false;
      }
    });
    this.nodes[index].inputFiles.forEach((inputFile)=>{
      let i = inputFile.srcNode;
      if(!(this.nodes[i].state === 'done' || this.nodes[i].state === 'failed')){
        ready = false;
      }
    });
    return ready;
  }

  // resolveはWFを読み込んで返すこと
  _copyLoopDir(oldIndex, node){
  }

  _delegate(newWorkflow){
    let d = new Dispatcher(newWorkflow);
    d.dispatch();
    this.children.push(d);
  }
}
module.exports = Dispatcher
