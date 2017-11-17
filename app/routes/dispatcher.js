const fs= require('fs');
const path= require('path');
const util= require('util');
const child_process = require('child_process');

const uuidv1 = require('uuid/v1');
const ncp = require('ncp');

const config = require('../config/server.json');
const logger=require('../logger');
const executer = require('./executer');
const { addX } = require('./utility');

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

/**
 * evalute condition by executing external command or evalute JS expression
 * @param {string} condition - command name or javascript expression
 */
async function evalCondition(condition, cwd){
  let rt=false;
  if( !(typeof condition === 'string' || typeof condition === 'boolean') ){
    logger.error('condition must be string or boolean');
    return false;
  }
  let script = path.resolve(cwd, condition);
  await util.promisify(fs.access)(script)
    .then(()=>{
      logger.debug('execute ', script);
      addX(script);
      rt = child_process.spawnSync(script).status === 0;
    })
    .catch((err)=>{
      if(err.code ===  'ENOENT' ){
        logger.debug('evalute ', condition);
        rt = eval(condition)
      }else{
        logger.error('condition is neither executable nor javascript expression ', err);
      }
    });
  return rt;
}

/**
 * parse workflow graph and dispatch ready tasks to executer
 */
class Dispatcher{
  constructor(workflow, rootDir){
    this.rootDir=rootDir;
    this.children=[];
    this.currentSearchList=[];
    this.nextSearchList=[];
    this.dispatchedTaskList=[]
    this.nodes=workflow.nodes;
    this.nodes.forEach((v,i)=>{
      if(v.previous.length===0 && v.inputFiles.length===0){
        this.currentSearchList.push(i);
      }
    });
    logger.debug('initial tasks : ',this.currentSearchList);
    this.dispatching=false;
  }

  dispatch(){
    return new Promise((resolve, reject)=>{
      this.timeout = setInterval(()=>{
        if(this.dispatching) return
        this.dispatching=true;
        logger.debug('currnetSearchList : ', this.currentSearchList)
        let promises=[];
        while(this.currentSearchList.length>0){
          let target = this.currentSearchList.shift();
          if(this._isReady(target)){
            let node=this.nodes[target]
            let cmd = this._cmdFactory(node.type);
            promises.push(cmd.call(this, node));
          }else{
            this.nextSearchList.push(target);
          }
        }
        Promise.all(promises)
          .then(()=>{
            this.currentSearchList=this.nextSearchList;
            this.nextSearchList=[];
            // check task state
            if(this.currentSearchList.length === 0){
              let isDone=this.dispatchedTaskList.every((task)=>{
                return task.state === 'finished' || task.state === 'failed'
              });
              let hasFailed=this.dispatchedTaskList.some((task)=>{
                return task.state === 'failed';
              });
              if(isDone){
                clearInterval(this.timeout);
                let projectState = hasFailed? 'failed':'finished';
                resolve(projectState);
              }
            }
            this.dispatching=false;
          })
          .catch((err)=>{
            logger.error('Error occurred while parsing workflow: ',err)
            reject(err);
          });
      }, config.interval);
    });
  }
  pause(){
    this.children.forEach((child)=>{
      child.pause();
    });
    clearInterval(this.timeout);
  }
  remove(){
    this.pause();
    this.children.forEach((child)=>{
      child.remove();
    });
    this.currentSearchList=[];
    this.nextSearchList=[];
    this.nodes=[];
  }

  async _dispatchTask(task){
    logger.debug('_dispatchTask called');
    task.id=uuidv1(); //TODO 要らんかったかもしれんので後で確認
    task.workingDir=path.resolve(this.rootDir, task.path);
    executer.exec(task);
    this.dispatchedTaskList.push(task);
    Array.prototype.push.apply(this.nextSearchList, task.next);
  }

  async _checkIf(node){
    logger.debug('_checkIf called', node);
    let cwd= path.resolve(this.rootDir, node.path);
    let condition = await evalCondition(node.condition, cwd);
    let next = condition? node.next: node.else;
    Array.prototype.push.apply(this.nextSearchList, next);
    node.state='finished';
  }

  async _loopHandler(getCurrentIndex, isFinished, node){
    logger.debug('_loopHandler called', node);
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

  async _delegate(node){
    logger.debug('_delegate called', node);
    let cwd= path.resolve(this.rootDir, node.path);
    let child = new Dispatcher(newWorkflow, cwd);
    this.children.push(child);
    child.dispatch()
      .then(()=>{
        //TODO 子WFからdispatchされた全てのTaskの終了を確認する必要がある
        TaskStateManager.register(node)
      })
      .catch((err)=>{
        logger.error("fatal error occurred while parsing sub workflow",err);
      });
  }


  // resolveはWFを読み込んで返すこと
  _copyLoopDir(oldIndex, node){
    console.log(node.path);
    let cwd= path.resolve(this.rootDir, node.path);
  }

  _isReady(index){
    let ready = true
    this.nodes[index].previous.forEach((i)=>{
      if(!(this.nodes[i].state === 'finished' || this.nodes[i].state === 'failed')){
        ready = false;
      }
    });
    this.nodes[index].inputFiles.forEach((inputFile)=>{
      let i = inputFile.srcNode;
      if(!(this.nodes[i].state === 'finished' || this.nodes[i].state === 'failed')){
        ready = false;
      }
    });
    return ready;
  }

  _cmdFactory(type){
    let cmd=function(){};
    switch(type.toLowerCase()){
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
        cmd = this._delegate;
        break;
      case 'parameterstudy':
        console.log('not implemented yet !');
        break;
    }
    return cmd;
  }
}
module.exports = Dispatcher;
