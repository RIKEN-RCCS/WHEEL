const fs= require('fs-extra');
const path= require('path');
const {promisify} = require('util');
const child_process = require('child_process');

const uuidv1 = require('uuid/v1');
const glob = require('glob');
const {ensureDir,copy} = require('fs-extra');
const {getLogger} = require('../logSettings');
const logger = getLogger('workflow');

const {interval, remoteHost, jobScheduler} = require('../db/db');
const executer = require('./executer');
const { addXSync, doCleanup} = require('./utility');
const { paramVecGenerator, getParamSize, getFilenames, removeInvalid}  = require('./parameterParser');
const {isInitialNode} = require('./workflowEditor');

async function cancelRemoteJob(task, ssh){
  const hostinfo = remoteHost.get(task.remotehostID);
  const JS = jobScheduler[hostinfo.jobScheduler];
  const cancelCmd = `${JS.del} ${task.handler}`;
  await ssh.exec(cancelCmd);
}
async function cancelLocalJob(task){
}
function killLocalProcess(task){
  if(task.handler && task.handler.connect) task.handler.kill();
}
async function killTask(task){
  if(task.remotehostID !== 'localhost'){
    const hostinfo = remoteHost.get(task.remotehostID);
    const config = {
      host: hostinfo.host,
      port: hostinfo.port,
      username: hostinfo.username,
    }
    const arssh = getSsh(config);
    if(task.useJobScheduler){
      await cancelRemoteJob(task, arssh);
    }else{
      logger.warn('kill remote process is not supported');
      //TODO nohupとか使われてなければ接続を切ればremoteのプロセスも死ぬはず
      //nohupは諦める・・・?
      //とすると、再実行時のリモート環境のrootディレクトリ名は変えた方が良いか?
    }
  }else{
    if(task.useJobScheduler){
      await cancelLocalJob(task);
    }else{
      await killLocalProcess(task);
    }
  }
  task.state = 'not-started';
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

function convertPathSep(pathString){
  if(path.sep === path.posix.sep){
    return pathString.replace(new RegExp("\\"+path.win32.sep,"g"), path.sep);
  }else{
    return pathString.replace(new RegExp(path.posix.sep,"g"), path.sep);
  }
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
  addXSync(script);
  let dir = path.dirname(script)
  let options = {
    "cwd": dir
  }
  return child_process.spawnSync(script, options).status === 0;
}

/**
 * parse workflow graph and dispatch ready tasks to executer
 * @param {Object[]} nodes - node in current workflow
 * @param {string} cwfDir -  path to current workflow dir
 * @param {string} rwfDir -  path to project root workflow dir
 * @param {string} startTime - start time of project
 * @param {SocketIO} sio - SocketIO object which is used to send task state list
 */
class Dispatcher{
  constructor(wf, cwfDir, rwfDir, startTime, sio){
    this.wf=wf;
    this.cwfDir=cwfDir;
    this.rwfDir=rwfDir;
    this.projectStartTime=startTime;
    this.sio = sio; //never pass to child dispatcher
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

  deliverOutputFiles(node){
    const promises = node.outputFiles.map(async(e)=>{
      //memo src can be glob pattern
      const src = e.name;
      const srcRoot= path.resolve(this.cwfDir, node.path);
      const srces = await promisify(glob)(src, {cwd: srcRoot});
      const p1 = srces.map((srcFile)=>{
        const p2 = e.dst.map(async (dst)=>{
          const tmp = dst.dstNode === "parent" ? "./" : this.wf.nodes[dst.dstNode].path;
          const dstName = dst.dstName ? convertPathSep(dst.dstName) : "";
          let dstRoot = path.resolve(this.cwfDir, tmp);

          // link srcFile -> dstName
          let newPath = path.resolve(dstRoot, dstName);

          // link srcFile -> dstName/srcFile
          if(srces.length>1 || dstName.endsWith(path.sep)){
            newPath = path.resolve(dstRoot, dstName, srcFile);
          }

          // remove dst file if it exist
          try{
            await promisify(fs.unlink)(newPath);
          }catch(e){
            if(e.code !== 'ENOENT' && e.code !== 'EISDIR' && e.code !== 'EPERM'){
              return Promise.reject(e);
            }
          }

          // make destination directory
          await ensureDir(path.dirname(newPath));

          // make symlink
          const oldPath = path.resolve(srcRoot, srcFile);
          logger.debug('make symlink from', oldPath, "to", newPath);
          const stats = await promisify(fs.stat)(oldPath);
          const type = stats.isDirectory ? "dir" : "file";
          return promisify(fs.symlink)(oldPath, newPath, type)
          .catch((e)=>{
            if (e.code==='EPERM'){
              return copy(oldPath, newPath);
            }
          });
        });
        return Promise.all(p2);
      });
      return Promise.all(p1);
    });
    return Promise.all(promises);
  }

  dispatch(){
    return new Promise((resolve, reject)=>{
      this.timeout = setInterval(()=>{
        if(this.dispatching) return
        this.dispatching=true;
        logger.trace('currentList:',this.currentSearchList);
        let promises=[];
        while(this.currentSearchList.length>0){
          let target = this.currentSearchList.shift();
          if(this._isReady(target)){
            let node = this.nodes[target]
            let cmd  = this._cmdFactory(node.type);
            node.status='running';
            promises.push(
              cmd.call(this, node)
              .then(()=>{
                if(node.type !== "task"){
                  this.deliverOutputFiles(node);
                }
              })
            );
          }else{
            this.nextSearchList.push(target);
          }
        }
        Promise.all(promises)
          .then(()=>{
            let tmp = new Set(this.nextSearchList);
            this.currentSearchList=Array.from(tmp.values());
            this.nextSearchList=[];
            const p = this.dispatchedTaskList.filter((task)=>{
              return _isFinishedState(task.state);
            }).map((task)=>{
              return this.deliverOutputFiles(task);
            });
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
            return Promise.all(p);
          })
          .catch((err)=>{
            logger.error('Error occurred while parsing workflow: ',err)
            reject(err);
          });
        if(this.sio){
          const tasks=[];
          this._getTaskList(tasks);
          this.sio.emit('taskStateList', tasks);
        }
      }, interval);
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
  async pause(){
    clearInterval(this.timeout);
    const p1 = this.children.map((child)=>{
      return child.pause();
    });
    await Promise.all(p1);
    const p2 =  this.dispatchedTaskList.map((task)=>{
      executer.cancel(task);
      return killTask(task);
    });
    return Promise.all(p2);
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

  _getTaskList(tasks){
    this.children.forEach((child)=>{
      child._getTaskList(tasks);
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
    task.workingDir=path.resolve(this.cwfDir, task.path);
    task.rwfDir= this.rwfDir;
    task.doCleanup = doCleanup(task.cleanupFlag, this.wf.cleanupFlag);
    if(this.wf.currentIndex) task.currentIndex=this.wf.currentIndex;
    await executer.exec(task);
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
    node.state='finished';
  }

  async _createChild(node){
    let childDir= path.resolve(this.cwfDir, node.path);
    let childWorkflowFilename= path.resolve(childDir, node.jsonFile);
    let childWF = await fs.readJSON(childWorkflowFilename);
    if(node.currentIndex){
      childWF.currentIndex = node.currentIndex;
    }
    // this.sio must not pass to child
    return new Dispatcher(childWF, childDir, this.rwfDir, this.projectStartTime);
  }
  async _delegate(node){
    logger.debug('_delegate called', node.name);
    let child = await this._createChild(node);
    this.children.push(child);
    return child.dispatch()
      .then(()=>{
        node.state='finished';
      })
      .catch((err)=>{
        logger.error("fatal error occurred while dispatching sub workflow",err);
        node.state='failed';
      }).then(()=>{
        Array.prototype.push.apply(this.nextSearchList, node.next);
      });
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

    // temporaly rename node.name
    node.name = `${node.originalName}_${node.currentIndex}`;

    // copy loop dir
    let dstDir = `${node.originalPath}_${node.currentIndex}`;
    // temporaly overwrite node.path by child's
    node.path=dstDir;
    dstDir = path.resolve(this.cwfDir, dstDir);


    await copy(srcDir, dstDir)
      .catch((err)=>{
        logger.error('fatal error occurred while copying loop dir', err);
      });

    //TODO nodeをコピーしてthis._delegateを呼び出す方式に変更
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
      await copy(srcDir, dstDir, options);

      let data = await promisify(fs.readFile)(path.resolve(srcDir, targetFile));
      data = data.toString();
      paramVec.forEach((e)=>{
        data=data.replace(new RegExp(`%%${e.key}%%`,"g"), e.value.toString());
      });
      let rewriteFile= path.resolve(dstDir, targetFile)
      await promisify(fs.writeFile)(rewriteFile, data);

      let newNode = Object.assign({}, node);
      newNode.name= path.relative(this.cwfDir, dstDir);
      newNode.path = path.name;
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
        node.state='finished'
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
