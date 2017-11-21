const fs= require('fs');
const path= require('path');
const util= require('util');
const child_process = require('child_process');

const uuidv1 = require('uuid/v1');

const config = require('../config/server.json');
const logger=require('../logger');
const executer = require('./executer');
const { addX } = require('./utility');
const { asyncNcp } = require('./utility');

// utility functions
function _forGetNextIndex(node){
  return node.hasOwnProperty('currentIndex') ? node.currentIndex + node.step : node.start;
}
function _forIsFinished(node){
  return (node.currentIndex > node.end && node.step > 0 ) || (node.currentIndex < node.end && node.step < 0);
}
function _whileGetNextIndex(node){
  return node.hasOwnProperty('currentIndex')? ++(node.currentIndex) : 0;
}
function _whileIsFinished(rootDir, node){
  let cwd= path.resolve(rootDir, node.path);
  let condition = evalCondition(node.condition, cwd);
  return condition
}
function _foreachGetNextIndex(node){
  if(node.hasOwnProperty('currentIndex')){
    let i = node.indexList.findIndex((e)=>{
      return e.label ===  node.currentIndex;
    });
    if( i === -1 || i === node.indexList.length-1){
      return undefined;
    }else{
      return node.indexList[i+1].label;
    }
  }else{
    return node.indexList[0].label;
  }
}
function _foreachIsFinished(node){
  return node.currentIndex === undefined;
}

function _isFinishedState(state){
  return state === 'finished' || state === 'failed';
}

/**
 * evalute condition by executing external command or evalute JS expression
 * @param {string} condition - command name or javascript expression
 */
function evalCondition(condition, cwd){
  if( !(typeof condition === 'string' || typeof condition === 'boolean') ){
    logger.error('condition must be string or boolean');
    return false;
  }
  let script = path.resolve(cwd, condition);
  try{
    fs.accessSync(script);
  }catch(e){
    if(e.code ===  'ENOENT' ){
      logger.debug('evalute ', condition);
      return eval(condition);
    }
  }
  logger.debug('execute ', script);
  addX(script);
  let dir = path.dirname(script)
  let options = {
    "cwd": dir
  }
  return child_process.spawnSync(script, options).status === 0;
}

/**
 * parse workflow graph and dispatch ready tasks to executer
 */
class Dispatcher{
  constructor(nodes, rootDir){
    this.rootDir=rootDir;
    this.currentSearchList=[];
    this.nextSearchList=[];
    this.children=[];
    this.dispatchedTaskList=[]
    this.nodes=nodes;
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
        let promises=[];
        while(this.currentSearchList.length>0){
          let target = this.currentSearchList.shift();
          if(this._isReady(target)){
            let node = this.nodes[target]
            let cmd  = this._cmdFactory(node.type);
            promises.push(cmd.call(this, node));
          }else{
            this.nextSearchList.push(target);
          }
        }
        Promise.all(promises)
          .then(()=>{
            let tmp = new Set(this.nextSearchList);
            this.currentSearchList=Array.from(tmp.values());
            this.nextSearchList=[];
            // check task state
            if(! this.isRunning()){
              clearInterval(this.timeout);
              let hasFailed=this.dispatchedTaskList.some((task)=>{
                return task.state === 'failed';
              });
              let projectState = hasFailed? 'failed':'finished';
              resolve(projectState);
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

  isRunning(){
    if(this.currentSearchList.length > 0) return true;
    if(this.nextSearchList.length > 0) return true;
    let hasTask=this.dispatchedTaskList.some((task)=>{
      return ! _isFinishedState(task.state);
    });
    return hasTask;
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
    logger.debug('_dispatchTask called', task.name);
    task.id=uuidv1(); // use this id to cancel task
    task.workingDir=path.resolve(this.rootDir, task.path);
    executer.exec(task);
    this.dispatchedTaskList.push(task);
    Array.prototype.push.apply(this.nextSearchList, task.next);
  }

  async _checkIf(node){
    logger.debug('_checkIf called', node.name);
    let cwd= path.resolve(this.rootDir, node.path);
    let condition = evalCondition(node.condition, cwd);
    let next = condition? node.next: node.else;
    Array.prototype.push.apply(this.nextSearchList, next);
    node.state='finished';
  }

  async _createChild(node){
    let childDir= path.resolve(this.rootDir, node.path);
    let childWorkflowFilename= path.resolve(childDir, node.jsonFile);
    let childWF = await util.promisify(fs.readFile)(childWorkflowFilename)
      .then((data)=>{
        return JSON.parse(data);
      })
      .catch((err)=>{
        logger.error('fatal error occurred while loading sub workflow', err);
      });
    return new Dispatcher(childWF.nodes, childDir);
  }
  async _delegate(node){
    logger.debug('_delegate called', node.name);
    let child = await this._createChild(node);
    this.children.push(child);
    child.dispatch()
      .then((tmp)=>{
        node.state='finished';
      })
      .catch((err)=>{
        logger.error("fatal error occurred while dispatching sub workflow",err);
      });
    Array.prototype.push.apply(this.nextSearchList, node.next);
  }

  _loopInitialize(node){
    node.initialized=true;
    node.originalPath=node.path;
    node.originalName=node.name;
    node.state='running'
  }
  _loopFinalize(node){
    delete node.initialized;
    delete node.currentIndex;
    node.path=node.originalPath;
    node.name=node.originalName;
    Array.prototype.push.apply(this.nextSearchList, node.next);
    node.state='finished'
  }

  async _loopHandler(getNextIndex, isFinished, node){
    if(node.childLoopRunning){
      // send back itself to searchList for next loop trip
      this.nextSearchList.push(node.index);
      return;
    }
    logger.debug('_loopHandler called', node.name);
    node.childLoopRunning=true;
    if(! node.initialized){
      this._loopInitialize(node)
    }

    // determine old loop block directory
    let srcDir= node.currentIndex? `${node.originalPath}_${node.currentIndex}` : node.path;
    srcDir = path.resolve(this.rootDir, srcDir);

    // update index variable(node.currentIndex)
    node.currentIndex = getNextIndex(node);

    // end determination
    if(isFinished(node)){
      this._loopFinalize(node)
      return
    }
    // send back itself to searchList for next loop trip
    this.nextSearchList.push(node.index);

    // temporaly rename node.name
    node.name = `${node.originalName}_${node.currentIndex}`;

    // copy loop dir
    let dstDir = `${node.originalPath}_${node.currentIndex}`;
    // temporaly overwrite node.path by child's
    node.path=dstDir;
    dstDir = path.resolve(this.rootDir, dstDir);


    await asyncNcp(srcDir, dstDir)
      .catch((err)=>{
        logger.error('fatal error occurred while copying loop dir\n', err);
      });

    // delegate new loop block
    let child = await this._createChild(node);
    this.children.push(child);
    child.dispatch()
      .then(()=>{
        logger.debug('loop trip end index = ', node.currentIndex);
        node.childLoopRunning=false;
      })
      .catch((err)=>{
        logger.error('fatal error occurred during loop child dispatching. index = ', node.currentIndex);
        logger.error(err);
      });
  }

  _isReady(index){
    let ready = true
    this.nodes[index].previous.forEach((i)=>{
      if(! _isFinishedState(this.nodes[i].state)){
        ready = false;
      }
    });
    this.nodes[index].inputFiles.forEach((inputFile)=>{
      let i = inputFile.srcNode;
      if(! _isFinishedState(this.nodes[i].state)){
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
        cmd = this._loopHandler.bind(this, _forGetNextIndex, _forIsFinished);
        break;
      case 'while':
        cmd = this._loopHandler.bind(this, _whileGetNextIndex, _whileIsFinished.bind(null, this.rootDir));
        break;
      case 'foreach':
        cmd = this._loopHandler.bind(this, _foreachGetNextIndex, _foreachIsFinished);
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
