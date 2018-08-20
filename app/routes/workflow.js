const path = require("path");
const fs = require("fs-extra");
const {promisify} = require("util");

const memMeasurement = process.env.NODE_ENV === "development" && process.env.MEMORY_MONITOR !== undefined;

const express = require('express');
const ARsshClient = require('arssh2-client');

const {getLogger} = require('../logSettings');
const logger = getLogger('workflow');
const Dispatcher = require('./dispatcher');
const fileManager = require('./fileManager');
const workflowEditor = require("./workflowEditor2");
const {getDateString, replacePathsep, createSshConfig} = require('./utility');
const {interval, remoteHost, defaultCleanupRemoteRoot, projectJsonFilename, componentJsonFilename} = require('../db/db');
const {getCwf,
  getCurrentDir,
  readRwf,
  getRootDir,
  getCwfFilename,
  readProjectJson,
  resetProject,
  addSsh,
  removeSsh,
  getTaskStateList,
  setRootDispatcher,
  getRootDispatcher,
  deleteRootDispatcher,
  openProject,
  updateProjectJson,
  setProjectState,
  getProjectState,
  commitProject,
  revertProject,
  cleanProject,
  once,
  emit,
  getTasks,
  clearDispatchedTasks
} = require('./project');
const {cancel} = require('./executer');
const {isInitialNode, hasChild, getComponent} = require('./workflowUtil');
const {killTask} = require("./taskUtil");


function cancelDispatchedTasks(label){
  for(let task of getTasks(label)){
    if(task.state === 'finished' || task.state === 'failed') continue;
    const canceled = cancel(task);
    if(! canceled){
      killTask(task);
    }
    task.state='not-started';
  }
}
function askPassword(sio, hostname){
  return new Promise((resolve)=>{
    sio.on('password', (data)=>{
      resolve(data);
    });
    sio.emit('askPassword', hostname);
  });
}

/**
 * rewrite old-style parent property
 * after 0d2c9bc commit, parent property has relative path from root project dir
 */
function fixParentProperty(label, workflow, dir){
  workflow.nodes.filter((e)=>{return e}).forEach((node)=>{
    if(node.parent){
      if(path.posix.isAbsolute(node.parent) || path.win32.isAbsolute(node.parent)){
        node.parent = replacePathsep(path.relative(getRootDir(label),dir));
      }
    }
  });
}

/**
 * validate all components in workflow and gather remote hosts which is used in tasks
 */
function validateNodes(label, workflow, dir, hosts){
  fixParentProperty(label, workflow, dir);
  const promises=[]
  workflow.nodes.filter((e)=>{return e}).forEach((node)=>{
    if(node.type === 'task'){
      if(node.path == null) promises.push(Promise.reject(new Error(`illegal path ${node.null}`)));
      if(node.host !== 'localhost') hosts.push(node.host);
      if( node.script == null){
        promises.push(Promise.reject(new Error(`script is not specified ${node.name}`)));
      }else{
        promises.push(promisify(fs.access)(path.resolve(dir, node.path, node.script)));
      }
    }else if(node.type === 'if' || node.type === 'while'){
      if(node.condition === undefined) promises.push(Promise.reject(new Error(`condition is not specified ${node.name}`)));
    }else if(node.type === 'for'){
      if(node.start === undefined) promises.push(Promise.reject(new Error(`start is not specified ${node.name}`)));
      if(node.step === undefined)  promises.push(Promise.reject(new Error(`step is not specified ${node.name}`)));
      if(node.end === undefined)   promises.push(Promise.reject(new Error(`end is not specified ${node.name}`)));
      if(node.step === 0 || (node.end - node.start)*node.step <0)promises.push(Promise.reject(new Error(`inifinite loop ${node.name}`)));
    }else if(node.type === 'parameterStudy'){
      if(node.parameterFile === null){
        promises.push(Promise.reject(new Error(`parameter setting file is not specified ${node.name}`)));
      }
    }else if(node.type === 'foreach'){
      if(! Array.isArray(node.indexList)) promises.push(Promise.reject(new Error(`index list is broken ${node.name}`)));
      if(node.indexList.length <= 0) promises.push(Promise.reject(new Error(`index list is empty ${node.name}`)));
    }
    if(hasChild(node)){
      const childDir = path.resolve(dir, node.path);
      promises.push(
        fs.readJson(path.resolve(childDir, node.jsonFile))
        .then((childWF)=>{
          return validateNodes(label, childWF, childDir, hosts);
        })
      );
    }
  });
  const hasInitialNode = workflow.nodes.some((node)=>{
    return isInitialNode(node);
  });
  if(!hasInitialNode) promises.push(Promise.reject(new Error('no component can be run')));
  return Promise.all(promises);
}

/**
 * check if all scripts and remote host setting are available or not
 */
async function validationCheck(label, workflow, sio){
  const rootDir = getRootDir(label);
  let hosts=[];
  await validateNodes(label, workflow, rootDir, hosts);

  hosts = Array.from(new Set(hosts));
  // remoteHostName is name property of remote host entry
  // hostInfo.host is hostname or IP address of remote host
  await hosts.reduce(async (promise, remoteHostName)=>{
    await promise;
    const id=remoteHost.getID('name', remoteHostName);
    const hostInfo = remoteHost.get(id);
    if(!hostInfo)  return Promise.reject(new Error(`illegal remote host specified ${remoteHostName}`));
    const password = await askPassword(sio, remoteHostName);
    const config = await createSshConfig(hostInfo, password);
    const arssh = new ARsshClient(config, {connectionRetryDelay: 1000, verbose: true});
    if(hostInfo.renewInterval){
      arssh.renewInterval=hostInfo.renewInterval*60*1000
    }
    if(hostInfo.renewDelay){
      arssh.renewDelay=hostInfo.renewDelay*1000
    }
    addSsh(label, hostInfo.host, arssh);
    return arssh.canConnect()
    .catch(async (err)=>{
      if(err.reason === "invalid passphrase" || err.reason === "authentication failure"){
        const newPassword = await askPassword(sio, remoteHostName);
        if(config.passphrase) config.passphrase = newPassword;
        if(config.password) config.password = newPassword;
        arssh.overwriteConfig(config);
        return arssh.canConnect();
      }else{
        return Promise.reject(err);
      }
    })
    .catch(async (err)=>{
      if(err.reason === "invalid passphrase" || err.reason === "authentication failure"){
        const newPassword = await askPassword(sio, remoteHostName);
        if(config.passphrase) config.passphrase = newPassword;
        if(config.password) config.password = newPassword;
        arssh.overwriteConfig(config);
        return arssh.canConnect();
      }else{
        return Promise.reject(err);
      }
    })
    .catch((err)=>{
      if(err.reason === "invalid passphrase" || err.reason === "authentication failure"){
        return Promise.reject(new Error('wrong password for 3 times'));
      }else{
        return Promise.reject(err);
      }
    });
  }, Promise.resolve());
}

async function onRunProject(sio, label){
  logger.debug("run event recieved");
  const rootDir = getRootDir(label);
  if(memMeasurement){
    logger.debug("used heap size at start point =", process.memoryUsage().heapUsed/1024/1024,"MB");
  }
  const rwf = await readRwf(label);
  const projectState=getProjectState(label);
  if(projectState === 'not-started'){
    try{
      await validationCheck(label, rwf, sio)
    }catch(err){
      logger.error('invalid root workflow:', err);
      removeSsh(label);
      return false
    }
    await commitProject(label);
    let cleanup = rwf.cleanupFlag;
    if(! cleanup){
      cleanup = defaultCleanupRemoteRoot;
    }
    rwf.cleanupFlag = cleanup;
  }
  await setProjectState(label, 'running');
  sio.emit('projectJson', await readProjectJson(label));

  const rootDispatcher = new Dispatcher(rwf, rootDir, rootDir, getDateString(), label);
  setRootDispatcher(label, rootDispatcher);
  sio.emit('projectJson', await readProjectJson(label));

  // event listener for task state changed
  function onTaskStateChanged(){
    const tasks=getTaskStateList(label);
    sio.emit('taskStateList', tasks);
    sendWorkflow(sio.emit.bind(sio), label);
    setTimeout(()=>{
      once(label, 'taskStateChanged', onTaskStateChanged);
    },interval);
  }

  // event listener for component state changed
  function onComponentStateChanged(){
    sendWorkflow(sio.emit.bind(sio), label);
    setTimeout(()=>{
      once(label, 'componentStateChanged', onComponentStateChanged);
    }, interval);
  }

  once(label, 'taskStateChanged', onTaskStateChanged);
  once(label, 'componentStateChanged', onComponentStateChanged);

  // project start here
  try{
    let timeout;
    if(memMeasurement){
      logger.debug("used heap size just before execution", process.memoryUsage().heapUsed/1024/1024,"MB");
      timeout = setInterval(()=>{
        logger.debug("used heap size ", process.memoryUsage().heapUsed/1024/1024,"MB");
      }, 30000);
    }
    const projectState=await rootDispatcher.start();
    if(memMeasurement){
      logger.debug("used heap size immediately after execution=", process.memoryUsage().heapUsed/1024/1024,"MB");
      clearInterval(timeout);
    }
    await setProjectState(label, projectState);
  }catch(err){
    logger.error('fatal error occurred while parsing workflow:',err);
    await setProjectState(label, 'failed');
  }

  emit(label, 'taskStateChanged');
  //TODO taskStateChanged とcomponentStateChangedのremoveListener
  sio.emit('projectJson', await readProjectJson(label));
  rootDispatcher.remove();
  deleteRootDispatcher(label);
  removeSsh(label);
  // TODO taskstate listはキープする必要ありここでclearしてはいけない
  clearDispatchedTasks(label);
  //TODO dispatcherから各ワークフローのstatusを取り出してファイルに書き込む必要あり
  if(memMeasurement){
    logger.debug("used heap size at the end", process.memoryUsage().heapUsed/1024/1024,"MB");
  }
}

async function onPauseProject(sio, label){
  logger.debug("pause event recieved");
  const rootDispatcher=getRootDispatcher(label);
  if(rootDispatcher){
    rootDispatcher.pause();
  }
  //TODO dispatcherから各ワークフローのstatusを取り出してファイルに書き込む必要あり
  await cancelDispatchedTasks(label);
  removeSsh(label);
  await setProjectState(label, 'paused');
  sio.emit('projectJson', await readProjectJson(label));
}
async function onCleanProject(emit, label){
  logger.debug("clean event recieved");
  const rootDispatcher = getRootDispatcher(label);
  if(rootDispatcher){
    rootDispatcher.remove();
    deleteRootDispatcher(label);
  }
  await cancelDispatchedTasks(label);
  clearDispatchedTasks(label);
  sio.emit('taskStateList', []);
  await cleanProject(label);
  await resetProject(label);
  await sendWorkflow(sio.emit.bind(sio), label);
  await setProjectState(label, 'not-started');
  sio.emit('projectJson', await readProjectJson(label));
}

async function onSaveProject(sio, label){
  logger.debug("saveProject event recieved");
  const projectState=getProjectState(label);
  if('not-started'=== projectState){
    await commitProject(label);
    sio.emit('projectJson', await readProjectJson(label));
  }else{
    logger.error(projectState,'project can not be saved');
  }
}
async function onRevertProject(sio, label){
  logger.debug("revertProject event recieved");
  await revertProject(label);
  await setProjectState(label, 'not-started');
  await sendWorkflow(sio.emit.bind(sio), label);
  sio.emit('projectJson', await readProjectJson(label));
}

function onTaskStateListRequest(sio, label, msg){
  logger.debug('getTaskStateList event recieved:', msg);
  const tasks=getTaskStateList(label);
  sio.emit('taskStateList', tasks);
}

module.exports = function(io){
  let label="project not loaded";

  const sio = io.of('/workflow');
  sio.on('connect', function (socket) {
    //event listeners for project operation
    socket.on('getTaskStateList', onTaskStateListRequest.bind(null, socket, label));
    socket.on('runProject',       onRunProject.bind(null, socket, label));
    socket.on('pauseProject',     onPauseProject.bind(null, socket, label));
    socket.on('cleanProject',     onCleanProject.bind(null, socket, label));
    socket.on('saveProject',      onSaveProject.bind(null, socket, label));
    socket.on('revertProject',    onRevertProject.bind(null, socket, label));
    socket.on('stopProject',     async ()=>{
      await onPauseProject(socket, label);
      await onCleanProject(socket, label);
    });

    socket.on('updateProjectJson', (data)=>{
      updateProjectJson(label, data);
    });

    socket.on('getProjectState', ()=>{
      socket.emit('projectState', getProjectState(label));
    });
    socket.on('getHostList', ()=>{
      socket.emit('hostList', remoteHost.getAll());
    });
    socket.on('getProjectJson', async ()=>{
      socket.emit('projectJson', await readProjectJson(label));
    });

    //event listeners for workflow editing
    workflowEditor(socket, label);
    //event listeners for file operation
    fileManager(socket, label);
  });

  const router = express.Router();
  router.post('/', async (req, res)=>{
    const projectRootDir =req.body.project;
    label = projectRootDir;
    await openProject(label);
    const {ID} = await getComponent(projectRootDir, path.resolve(projectRootDir, componentJsonFilename));
    res.cookie('root', ID);
    res.cookie('rootDir', getCurrentDir(label));
    res.cookie('project', path.resolve(label, projectJsonFilename));
    res.sendFile(path.resolve(__dirname, '../views/workflow.html'));
  });
  return router;
}
