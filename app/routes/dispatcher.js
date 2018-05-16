const fs= require('fs-extra');
const path= require('path');
const {promisify} = require('util');
const child_process = require('child_process');
const {EventEmitter} = require('events');

const uuidv1 = require('uuid/v1');

const {getLogger} = require('../logSettings');
const logger = getLogger('workflow');
const {interval, remoteHost, jobScheduler} = require('../db/db');
const {exec} = require('./executer');
const { addXSync, doCleanup, deliverOutputFiles} = require('./utility');
const { paramVecGenerator, getParamSize, getFilenames, removeInvalid}  = require('./parameterParser');
const {isInitialNode} = require('./workflowEditor');
const {getSsh, emit, addDispatchedTask} = require('./project');

// utility functions
function _forGetNextIndex(component){
  return component.hasOwnProperty('currentIndex') ? component.currentIndex + component.step : component.start;
}
function _forIsFinished(component){
  return (component.currentIndex > component.end && component.step > 0 ) || (component.currentIndex < component.end && component.step < 0);
}
function _whileGetNextIndex(component){
  return component.hasOwnProperty('currentIndex')? ++(component.currentIndex) : 0;
}
function _whileIsFinished(cwfDir, component){
  let cwd= path.resolve(cwfDir, component.path);
  let condition = evalConditionSync(component.condition, cwd);
  return ! condition
}
function _foreachGetNextIndex(component){
  if(component.hasOwnProperty('currentIndex')){
    let i = component.indexList.findIndex((e)=>{
      return e.label ===  component.currentIndex;
    });
    if( i === -1 || i === component.indexList.length-1){
      return undefined;
    }else{
      return component.indexList[i+1].label;
    }
  }else{
    return component.indexList[0].label;
  }
}
function _foreachIsFinished(component){
  return component.currentIndex === undefined;
}

function _isFinishedState(state){
  return state === 'finished' || state === 'failed';
}

/**
 * evalute condition by executing external command or evalute JS expression
 * @param {string} condition - command name or javascript expression
 */
function evalConditionSync(condition, cwd){
  if( !(typeof condition === 'string' || typeof condition === 'boolean') ){
    logger.warn('condition must be string or boolean');
    return false;
  }
  const script = path.resolve(cwd, condition);
  try{
    fs.accessSync(script);
  }catch(e){
    if(e.code ===  'ENOENT' ){
      logger.debug('evalute ', condition);
      return eval(condition);
    }
  }
  logger.debug('execute ', script);
  addXSync(script);
  const dir = path.dirname(script)
  const options = {
    "cwd": dir
  }
  return child_process.spawnSync(script, options).status === 0;
}

/**
 * set component state and emit event
 */
function setComponentState(label, component, state){
  component.state = state;
  emit(label, 'componentStateChanged');
}


/**
 * parse workflow graph and dispatch ready tasks to executer
 * @param {Object[]} nodes - child component in current workflow
 * @param {string} cwfDir -  path to current workflow dir
 * @param {string} rwfDir -  path to project root workflow dir
 * @param {string} startTime - start time of project
 * @param {string} label - label of project
 */
class Dispatcher extends EventEmitter{
  constructor(wf, cwfDir, rwfDir, startTime, label){
    super();
    this.wf=wf;
    this.cwfDir=cwfDir;
    this.rwfDir=rwfDir;
    this.projectStartTime=startTime;
    this.label = label;
    this.nextSearchList=[];
    this.children=new Set();
    this.dispatchedTaskList=[]
    this.nodes=wf.nodes;
    this.currentSearchList = this.nodes.map((component,i)=>{
      return isInitialNode(component) ? i : null;
    }).filter((e)=>{
      return e !== null;
    });
    logger.debug('initial tasks : ',this.currentSearchList);
  }

  async _dispatch(){
    logger.debug('currentList:',this.currentSearchList);
    logger.debug('next waiting component', this.nextSearchList);
    const  promises=[];
    while(this.currentSearchList.length>0){
      const target = this.currentSearchList.shift();
      if(! this._isReady(target)) this.nextSearchList.push(target);
      const  component = this.nodes[target]
      // put dst path into outputFiles
      for(const outputFile of component.outputFiles){
        for(const dst of outputFile.dst){
          dst.dstRoot = dst.dstNode === 'parent' ? this.cwfDir : path.resolve(this.cwfDir, this.nodes[dst.dstNode].path);
        }
      }
      const  cmd  = this._cmdFactory(component.type);
      setComponentState(this.label, component, 'running');
      promises.push(
        cmd.call(this, component)
        .then(()=>{
          // task component is not finished at this time
          if(component.type === "task") return
          deliverOutputFiles(component.outputFiles,  path.resolve(this.cwfDir, component.path))
            .then((rt)=>{
              if(rt.length > 0 ) logger.debug('deliverOutputFiles:\n',rt);
            })
        })
        .catch((err)=>{
          setComponentState(this.label, component, 'failed');
          return Promise.reject(err);
        })
      );
    }
    if(promises.length>0){
      try{
        await Promise.all(promises);
      }catch(e){
        this.emit("error", e);
      }
      //remove duplicated entry
      const tmp = new Set(this.nextSearchList);
      this.currentSearchList=Array.from(tmp.values());
      this.nextSearchList=[];
    }
    if(this.isFinished()){
      this.removeListener('dispatch', this._dispatch);
      const hasFailed=this.dispatchedTaskList.some((task)=>{
        return task.state === 'failed';
      });
      this.emit('done', !hasFailed);
    }else{
      //call next dispatcher
      setTimeout(()=>{
        this.emit('dispatch');
      }, interval);
    }
  }

  isFinished(){
    if(this.currentSearchList.length > 0 || this.nextSearchList.length > 0) return false;
    const hasRunningTask = this.dispatchedTaskList.some((task)=>{
      return ! _isFinishedState(task.state);
    });
    return !hasRunningTask;
  }
  async start(){
    if(this.listenerCount('dispatch') === 0){
      this.on('dispatch', this._dispatch);
    }
    for (let child of this.children){
      child.start();
    }
    setImmediate(()=>{
      this.emit('dispatch');
    });
    return new Promise((resolve, reject)=>{
      const onStop=()=>{
        this.removeListener('error', onError);
        this.removeListener('done', onDone);
        this.removeListener('stop', onStop);
      };
      const onDone = (isSuccess)=>{
        onStop();
        const projectState = isSuccess ? 'finished':'failed';
        resolve(projectState);
      }
      const onError = (err)=>{
        onStop();
        reject(err);
      }
      this.once('done', onDone);
      this.once('error', onError);
      this.once('stop', onStop);
    });
  }
  pause(){
    this.emit('stop');
    this.removeListener('dispatch', this._dispatch);
    for (let child of this.children){
      child.pause();
    }
  }
  remove(){
    this.pause();
    for (let child of this.children){
      child.remove();
    }
    this.children.clear();
    this.currentSearchList=[];
    this.nextSearchList=[];
    this.nodes=[];
  }

  getCwf(dir){
    if(this.cwfDir === dir){
      return this.wf;
    }
    let rt=null;
    for(let child of this.children){
      const tmp = child.getCwf(dir);
      if(tmp) rt = tmp;
    }
    return rt;
  }

  _addNextComponent(component, useElse=false){
    const nextComponents=useElse?Array.from(component.else):Array.from(component.next);
    component.outputFiles.forEach((outputFile)=>{
      const tmp = outputFile.dst.map((e)=>{
        if(e.dstNode !== 'parent'){
          return e.dstNode;
        }else{
          return null;
        }
      }).filter((e)=>{
        return e!==null;
      });
      Array.prototype.push.apply(nextComponents, tmp);
    });
    Array.prototype.push.apply(this.nextSearchList, nextComponents);
  }

  async _dispatchTask(task){
    logger.debug('_dispatchTask called', task.name);
    task.id=uuidv1(); // not used for now
    task.startTime = 'not started'; // to be assigned in executer
    task.endTime   = 'not finished'; // to be assigned in executer
    task.projectStartTime= this.projectStartTime;
    task.label = this.label;
    task.workingDir=path.resolve(this.cwfDir, task.path);
    task.rwfDir= this.rwfDir;
    task.doCleanup = doCleanup(task.cleanupFlag, this.wf.cleanupFlag);
    if(this.wf.currentIndex !== undefined) task.currentIndex=this.wf.currentIndex;
    exec(task);
    //following 2 containers are used for different purpose, please keep duplicated!
    this.dispatchedTaskList.push(task);
    addDispatchedTask(this.label, task);
    this._addNextComponent(task);
  }

  async _checkIf(component){
    logger.debug('_checkIf called', component.name);
    const cwd= path.resolve(this.cwfDir, component.path);
    const condition = evalConditionSync(component.condition, cwd);
    this._addNextComponent(component, !condition);
    setComponentState(this.label, component, 'finished');
  }

  async _readChild(component){
    const childWorkflowFilename= path.resolve(this.cwfDir, component.path, component.jsonFile);
    return fs.readJSON(childWorkflowFilename);
  }

  async _delegate(component){
    logger.debug('_delegate called', component.name);
    const childDir= path.resolve(this.cwfDir, component.path);
    const childWF = await this._readChild(component);
    if(component.currentIndex !== undefined){
      childWF.currentIndex = component.currentIndex;
    }
    const child = new Dispatcher(childWF, childDir, this.rwfDir, this.projectStartTime, this.label);
    this.children.add(child);
    // exception should be catched in caller
    try{
      await child.start();
      setComponentState(this.label, component, 'finished');
    }finally{
      this._addNextComponent(component);
      this.children.delete(child);
    }
  }

  _loopInitialize(component){
    component.initialized=true;
    component.originalPath=component.path;
    component.originalName=component.name;
  }
  async _loopFinalize(component, lastDir){
    const dstDir = path.resolve(this.cwfDir, component.originalPath);
    if(lastDir !== dstDir){
      logger.debug('copy ',lastDir,'to',dstDir);
      await fs.copy(lastDir, dstDir)
    }
    delete component.initialized;
    delete component.currentIndex;
    component.name=component.originalName;
    component.path=component.originalPath;
    this._addNextComponent(component);
    setComponentState(this.label, component, 'finished');
  }

  async _loopHandler(getNextIndex, isFinished, component){
    if(component.childLoopRunning){
      // send back itself to searchList for next loop trip
      this.nextSearchList.push(component.index);
      return;
    }
    logger.debug('_loopHandler called', component.name);
    component.childLoopRunning=true;
    if(! component.initialized){
      this._loopInitialize(component)
    }

    // determine old loop block directory
    let srcDir= component.currentIndex == undefined ? component.path : `${component.originalPath}_${component.currentIndex}`;
    srcDir = path.resolve(this.cwfDir, srcDir);

    // update index variable(component.currentIndex)
    component.currentIndex = getNextIndex(component);

    // end determination
    if(isFinished(component)){
      return this._loopFinalize(component, srcDir)
    }
    // send back itself to searchList for next loop trip
    this.nextSearchList.push(component.index);

    const newComponent = Object.assign({}, component);
    newComponent.name = `${component.originalName}_${component.currentIndex}`;
    newComponent.path = newComponent.name;
    const dstDir = path.resolve(this.cwfDir, newComponent.name);

    try{
      await fs.copy(srcDir, dstDir)
      const childWF = await this._readChild(component);
      childWF.name=newComponent.name;
      childWF.path=newComponent.path;
      await fs.writeJson(path.resolve(dstDir, newComponent.jsonFile), childWF, {spaces: 4});
      await this._delegate(newComponent);
    }catch(e){
      e.index = component.currentIndex;
      logger.warn('fatal error occurred during loop child dispatching.', e);
      return Promise.reject(e);
    }
    logger.debug('loop finished at index =', component.currentIndex);
    component.childLoopRunning=false;
  }
  async _PSHandler(component){
    logger.debug('_PSHandler called', component.name);
    const srcDir = path.resolve(this.cwfDir, component.path);
    const paramSettingsFilename = path.resolve(srcDir, component.parameterFile);
    const paramSettings = JSON.parse(await promisify(fs.readFile)(paramSettingsFilename));

    const targetFile = paramSettings.target_file;
    const paramSpace = removeInvalid(paramSettings.target_param);
    // ignore all filenames in file type parameter space and parameter study setting file
    const ignoreFiles=getFilenames(paramSpace).map((e)=>{
      return path.resolve(srcDir, e);
    });
    ignoreFiles.push(paramSettingsFilename);

    const promises=[]
    component.numTotal = getParamSize(paramSpace);
    for(let paramVec of paramVecGenerator(paramSpace)){
      let dstDir=paramVec.reduce((p,e)=>{
        let v = e.value;
        if(e.type === "file" ){
          v = (e.value).replace(path.sep, '_');
        }
        return `${p}_${e.key}_${v}`;
      }, component.path);
      dstDir = path.resolve(this.cwfDir, dstDir);
      // copy file which is specified as parameter
      const includeFiles=paramVec
        .filter((e)=>{
          return e.type === "file";
        })
        .map((e)=>{
          return path.resolve(srcDir, e.value);
        });
      const options={};
      options.filter = function(filename){
        return ! ignoreFiles.filter((e)=>{
          return !includeFiles.includes(e);
        }).includes(filename);
      }
      logger.debug('copy from', srcDir, 'to ',dstDir);
      await fs.copy(srcDir, dstDir, options);

      let data = await promisify(fs.readFile)(path.resolve(srcDir, targetFile));
      data = data.toString();
      paramVec.forEach((e)=>{
        data=data.replace(new RegExp(`%%${e.key}%%`,"g"), e.value.toString());
      });
      const rewriteFile= path.resolve(dstDir, targetFile)
      await promisify(fs.writeFile)(rewriteFile, data);

      const newComponent = Object.assign({}, component);
      newComponent.name= path.relative(this.cwfDir, dstDir);
      newComponent.path = newComponent.name;
      const p = this._delegate(newComponent)
      .then(()=>{
        if(newComponent.state === 'finished'){
          ++(component.numFinished)
        } else if (newComponent.state === 'failed'){
          ++(component.numFailed)
        }else{
          logger.warn('child state is illegal', newComponent.state);
        }
      });
      promises.push(p);
    }
    await Promise.all(promises);
    this._addNextComponent(component);
    setComponentState(this.label, component, 'finished');
  }

  _isReady(index){
    let ready = true
    this.nodes[index].previous.forEach((i)=>{
      if(! _isFinishedState(this.nodes[i].state)){
        ready = false;
      }
    });
    this.nodes[index].inputFiles.forEach((inputFile)=>{
      const i = inputFile.srcNode;
      if(i === null || i === 'parent') return;
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
        cmd = this._loopHandler.bind(this, _whileGetNextIndex, _whileIsFinished.bind(null, this.cwfDir));
        break;
      case 'foreach':
        cmd = this._loopHandler.bind(this, _foreachGetNextIndex, _foreachIsFinished);
        break;
      case 'workflow':
        cmd = this._delegate;
        break;
      case 'parameterstudy':
        cmd = this._PSHandler;
        break;
    }
    return cmd;
  }
}
module.exports = Dispatcher;
