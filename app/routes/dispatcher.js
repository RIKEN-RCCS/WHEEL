const fs= require('fs-extra');
const path= require('path');
const {promisify} = require('util');
const child_process = require('child_process');

const uuidv1 = require('uuid/v1');

const {getLogger} = require('../logSettings');
const logger = getLogger('workflow');
const {interval, remoteHost, jobScheduler} = require('../db/db');
const executer = require('./executer');
const { addXSync, doCleanup, deliverOutputFiles} = require('./utility');
const { paramVecGenerator, getParamSize, getFilenames, removeInvalid}  = require('./parameterParser');
const {isInitialNode} = require('./workflowEditor');
const {getSsh, emit} = require('./project');

async function cancelRemoteJob(task, ssh){
  const hostinfo = remoteHost.get(task.remotehostID);
  const JS = jobScheduler[hostinfo.jobScheduler];
  const cancelCmd = `${JS.del} ${task.jobID}`;
  logger.debug(`cancel job: ${cancelCmd}`);
  const output=[];
  await ssh.exec(cancelCmd, {}, output, output);
  logger.debug('cacnel done', output.join());
}
async function cancelLocalJob(task){
}
function killLocalProcess(task){
  if(task.handler && task.handler.connect) task.handler.kill();
}
async function killTask(task, hosts){
  if(task.remotehostID !== 'localhost'){
    const hostinfo = remoteHost.get(task.remotehostID);
    if(task.useJobScheduler){
      const arssh = getSsh(task.label, hostinfo.host);
      await cancelRemoteJob(task, arssh);
    }else{
      hosts.push(hostinfo.host);
    }
  }else{
    if(task.useJobScheduler){
      await cancelLocalJob(task);
    }else{
      await killLocalProcess(task);
    }
  }
  task.state = 'not-started';
  emit(task.label, 'taskStateChanged');
}

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
function _whileIsFinished(cwfDir, node){
  let cwd= path.resolve(cwfDir, node.path);
  let condition = evalConditionSync(node.condition, cwd);
  return ! condition
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
 * @param {Object[]} nodes - node in current workflow
 * @param {string} cwfDir -  path to current workflow dir
 * @param {string} rwfDir -  path to project root workflow dir
 * @param {string} startTime - start time of project
 * @param {string} label - label of project
 */
class Dispatcher{
  constructor(wf, cwfDir, rwfDir, startTime, label){
    this.wf=wf;
    this.cwfDir=cwfDir;
    this.rwfDir=rwfDir;
    this.projectStartTime=startTime;
    this.label = label;
    this.nextSearchList=[];
    this.children=[];
    this.dispatchedTaskList=[]
    this.nodes=wf.nodes;
    this.currentSearchList= this.nodes.map((node,i)=>{
      return isInitialNode(node) ? i : null;
    }).filter((e)=>{
      return e !== null;
    });
    logger.debug('initial tasks : ',this.currentSearchList);
    this.dispatching=false;
  }

  dispatch(){
    return new Promise((resolve, reject)=>{
      this.timeout = setInterval(()=>{
        if(this.dispatching) return
        this.dispatching=true;
        logger.trace('currentList:',this.currentSearchList);
        const  promises=[];
        while(this.currentSearchList.length>0){
          const target = this.currentSearchList.shift();
          if(this._isReady(target)){
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
                if(component.type !== "task"){
                  deliverOutputFiles(component.outputFiles,  path.resolve(this.cwfDir, component.path))
                    .then((rt)=>{
                      if(rt.length > 0 ){
                        logger.debug('deliverOutputFiles:\n',rt);
                      }
                    });
                }
              })
            );
          }else{
            this.nextSearchList.push(target);
          }
        }
        Promise.all(promises)
          .then(()=>{
            const tmp = new Set(this.nextSearchList);
            this.currentSearchList=Array.from(tmp.values());
            this.nextSearchList=[];
            // check task state
            if(! this.isRunning()){
              clearInterval(this.timeout);
              const hasFailed=this.dispatchedTaskList.some((task)=>{
                return task.state === 'failed';
              });
              const projectState = hasFailed ? 'failed': 'finished';
              resolve(projectState);
            }
            this.dispatching=false;
          })
          .catch((err)=>{
            logger.error('Error occurred while parsing workflow: ',err)
            reject(err);
          });
      }, interval);
    });
  }

  isRunning(){
    if(this.currentSearchList.length > 0) return true;
    if(this.nextSearchList.length > 0) return true;
    return this.dispatchedTaskList.some((task)=>{
      return ! _isFinishedState(task.state);
    });
  }
  async pause(){
    clearInterval(this.timeout);
    for (const child of this.children){
      child.pause();
    }
    for (const task of this.dispatchedTaskList){
      executer.cancel(task);
    }
  }
  async killDispatchedTasks(hosts){
    await Promise.all(this.children.map((child)=>{
      return child.killDispatchedTasks(hosts);
    }));
    return Promise.all(this.dispatchedTaskList.map((task)=>{
      return killTask(task, hosts);
    }));
  }
  remove(){
    for (const child of this.children){
      child.remove();
    }
    this.children=[];
    this.currentSearchList=[];
    this.nextSearchList=[];
    this.nodes=[];
  }
  getCwf(dir){
    if(this.cwfDir === dir){
      return this.wf;
    }
    let rt=null;
    this.children.forEach((child)=>{
      const tmp = child.getCwf(dir);
      if(tmp) rt = tmp;
    });
    return rt;
  }

  getTaskList(tasks){
    this.children.forEach((child)=>{
      child.getTaskList(tasks);
    });
    const ownTasks=this.dispatchedTaskList.map((task)=>{
      return {
        name: task.name,
        description: task.description ? task.description : '',
        state: task.state,
        parent: task.parent,
        startTime: task.startTime,
        endTime: task.endTime
      }
    });
    Array.prototype.push.apply(tasks, ownTasks);
    return tasks;
  }

  async _dispatchTask(task){
    logger.debug('_dispatchTask called', task.name);
    task.id=uuidv1(); // use this id to cancel task
    task.startTime = 'not started'; // to be assigned in executer
    task.endTime   = 'not finished'; // to be assigned in executer
    task.projectStartTime= this.projectStartTime;
    task.label = this.label;
    task.workingDir=path.resolve(this.cwfDir, task.path);
    task.rwfDir= this.rwfDir;
    task.doCleanup = doCleanup(task.cleanupFlag, this.wf.cleanupFlag);
    if(this.wf.currentIndex) task.currentIndex=this.wf.currentIndex;
    executer.exec(task);
    this.dispatchedTaskList.push(task);
    const nextTasks=Array.from(task.next);
    task.outputFiles.forEach((outputFile)=>{
      const tmp = outputFile.dst.map((e)=>{
        if(e.dstNode !== 'parent'){
          return e.dstNode;
        }else{
          return null;
        }
      }).filter((e)=>{
        return e!==null;
      });
      Array.prototype.push.apply(nextTasks, tmp);
    });
    Array.prototype.push.apply(this.nextSearchList, nextTasks);
  }

  async _checkIf(node){
    logger.debug('_checkIf called', node.name);
    let cwd= path.resolve(this.cwfDir, node.path);
    let condition = evalConditionSync(node.condition, cwd);
    let next = condition? node.next: node.else;
    Array.prototype.push.apply(this.nextSearchList, next);
    setComponentState(this.label, node, 'finished');
  }

  async _readChild(node){
    const childWorkflowFilename= path.resolve(this.cwfDir, node.path, node.jsonFile);
    return fs.readJSON(childWorkflowFilename);
  }

  async _delegate(node){
    logger.debug('_delegate called', node.name);
    const childDir= path.resolve(this.cwfDir, node.path);
    const childWF = await this._readChild(node);
    if(node.currentIndex){
      childWF.currentIndex = node.currentIndex;
    }
    const child = new Dispatcher(childWF, childDir, this.rwfDir, this.projectStartTime, this.label);
    this.children.push(child);
    return child.dispatch()
      .then(()=>{
        setComponentState(this.label, node, 'finished');
      })
      .catch((err)=>{
        logger.error("fatal error occurred while dispatching sub workflow",err);
        setComponentState(this.label, node, 'failed');
      }).then(()=>{
        Array.prototype.push.apply(this.nextSearchList, node.next);
      });
  }

  _loopInitialize(node){
    node.initialized=true;
    node.originalPath=node.path;
    node.originalName=node.name;
  }
  _loopFinalize(node){
    delete node.initialized;
    delete node.currentIndex;
    node.path=node.originalPath;
    node.name=node.originalName;
    Array.prototype.push.apply(this.nextSearchList, node.next);
    setComponentState(this.label, node, 'finished');
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
    srcDir = path.resolve(this.cwfDir, srcDir);

    // update index variable(node.currentIndex)
    node.currentIndex = getNextIndex(node);

    // end determination
    if(isFinished(node)){
      this._loopFinalize(node)
      return
    }
    // send back itself to searchList for next loop trip
    this.nextSearchList.push(node.index);

    const newNode = Object.assign({}, node);
    newNode.name = `${node.originalName}_${node.currentIndex}`;
    newNode.path = newNode.name;
    const dstDir = path.resolve(this.cwfDir, newNode.name);

    try{
      await fs.copy(srcDir, dstDir)
      const childWF = await this._readChild(node);
      childWF.name=newNode.name;
      childWF.path=newNode.path;
      for (const child of childWF.nodes){
        child.parent = path.join(newNode.parent, newNode.path);
      }
      await fs.writeJson(path.resolve(dstDir, newNode.jsonFile), childWF, {spaces: 4});
      await this._delegate(newNode);
    }catch(e){
      e.index = node.currentIndex;
      logger.warn('fatal error occurred during loop child dispatching.', e);
      return Promise.reject(e);
    }
    logger.debug('loop finished at index =', node.currentIndex);
    node.childLoopRunning=false;
  }
  async _PSHandler(node){
    logger.debug('_PSHandler called', node.name);
    const srcDir = path.resolve(this.cwfDir, node.path);
    const paramSettingsFilename = path.resolve(srcDir, node.parameterFile);
    const paramSettings = JSON.parse(await promisify(fs.readFile)(paramSettingsFilename));

    const targetFile = paramSettings.target_file;
    let paramSpace = removeInvalid(paramSettings.target_param);
    // ignore all filenames in file type parameter space and parameter study setting file
    let ignoreFiles=getFilenames(paramSpace).map((e)=>{
      return path.resolve(srcDir, e);
    });
    ignoreFiles.push(paramSettingsFilename);

    let promises=[]
    node.numTotal = getParamSize(paramSpace);
    for(let paramVec of paramVecGenerator(paramSpace)){
      let dstDir=paramVec.reduce((p,e)=>{
        let v = e.value;
        if(e.type === "file" ){
          v = (e.value).replace(path.sep, '_');
        }
        return `${p}_${e.key}_${v}`;
      }, node.path);
      dstDir = path.resolve(this.cwfDir, dstDir);
      // copy file which is specified as parameter
      let includeFiles=paramVec
        .filter((e)=>{
          return e.type === "file";
        })
        .map((e)=>{
          return path.resolve(srcDir, e.value);
        });
      let options={};
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
      let rewriteFile= path.resolve(dstDir, targetFile)
      await promisify(fs.writeFile)(rewriteFile, data);

      let newNode = Object.assign({}, node);
      newNode.name= path.relative(this.cwfDir, dstDir);
      newNode.path = newNode.name;
      let p = this._delegate(newNode)
      .then(()=>{
        if(newNode.state === 'finished'){
          ++(node.numFinished)
        } else if (newNode.state === 'failed'){
          ++(node.numFailed)
        }else{
          logger.warn('child state is illegal', newNode.state);
        }
      });
      promises.push(p);
    }
    return Promise.all(promises)
      .then(()=>{
        setComponentState(this.label, node, 'finished');
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
