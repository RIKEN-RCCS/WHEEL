const path = require("path");
const fs = require("fs-extra");
const {promisify} = require("util");

const memMeasurement = process.env.NODE_ENV === "development" && process.env.MEMORY_MONITOR !== undefined;

const klaw = require('klaw');
const express = require('express');
const ARsshClient = require('arssh2-client');
const {getLogger} = require('../logSettings');
const logger = getLogger('workflow');
const Dispatcher = require('./dispatcher');
const fileManager = require('./fileManager');
const {getDateString, replacePathsep, getSystemFiles, createSshConfig} = require('./utility');
const {interval, remoteHost, defaultCleanupRemoteRoot} = require('../db/db');
const {getCwf,
  setCwf,
  getNode,
  getCurrentDir,
  readRwf, getRootDir,
  getCwfFilename,
  readProjectJson,
  resetProject, addSsh,
  removeSsh,
  getTaskStateList,
  write,
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
  gitAdd,
  getTasks,
  clearDispatchedTasks
} = require('./project');
const {cancel} = require('./executer');
const fileBrowser = require("./fileBrowser");
const {isInitialNode, hasChild, readChildWorkflow, createNode, removeNode, addLink, removeLink, removeAllLink, addFileLink, removeFileLink, removeAllFileLink, addValue, updateValue, updateInputFiles, updateOutputFiles, updateName, delValue, delInputFiles, delOutputFiles} = require('./workflowEditor');
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

async function sendWorkflow(sio, label, fromDispatcher=false){
  const wf=getCwf(label, fromDispatcher);
  const rt = JSON.parse(JSON.stringify(wf));
  for(const child of rt.nodes){
    if(child!==null){
      if(child.handler) delete child.handler;
      if(hasChild(child)){
        const childJson = await readChildWorkflow(label, child);
        child.nodes = childJson.nodes.map((grandson)=>{
          if(grandson !== null && grandson.handler) delete grandson.handler;
          return grandson;
        });
      }
    }
  }

  sio.emit('workflow', rt);
}

function isRunning(projectState){
  return projectState === 'running' || projectState === 'paused';
}

async function onWorkflowRequest(sio, label, argWorkflowFilename){
  const workflowFilename=path.resolve(argWorkflowFilename);
  logger.debug('Workflow Request event recieved: ', workflowFilename);
  await setCwf(label, workflowFilename);
  getProjectState(label);
  const projectState=getProjectState(label);
  sendWorkflow(sio, label, isRunning(projectState));
}

async function onCreateNode(sio, label, msg){
  logger.debug('create event recieved: ', msg);

  let index = await createNode(label, msg);
  logger.debug('node created: ',getNode(label, index));

  try{
    await write(label);
    sendWorkflow(sio, label);
  }catch(err){
    logger.error('node create failed', err);
  }
}

async function onUpdateNode(sio, label, msg){
  logger.debug('updateNode event recieved: ', msg);
  let index=msg.index;
  let property=msg.property;
  let value=msg.value;
  let cmd=msg.cmd;

  let targetNode=getNode(label, index);
  if(property in targetNode){
    switch(cmd){
      case 'update':
        if(property === "inputFiles"){
          await updateInputFiles(label, targetNode, value);
        }else if(property === "outputFiles"){
          await updateOutputFiles(label, targetNode, value);
        }else if(property === "name"){
          await updateName(label, targetNode, value);
        }else{
          await updateValue(label, targetNode, property, value);
        }
        break;
      case 'add':
        if(Array.isArray(targetNode[property])){
          await addValue(label, targetNode, property, value);
        }
        break;
      case 'del':
        if(Array.isArray(targetNode[property])){
          if(property === "inputFiles"){
            await delInputFiles(label, targetNode, value);
          }else if(property === "outputFiles"){
            await delOutputFiles(label, targetNode, value);
          }else{
            await delValue(label, targetNode, property, value);
          }
        }
        break;
    }
    try{
      await write(label)
      sendWorkflow(sio, label);
    }catch(err){
      logger.error('node update failed', err);
    }
  }
}

async function onRemoveNode(sio, label, index){
  logger.debug('removeNode event recieved: ', index);
  const target=getNode(label, index);
  if(! target){
    logger.warn('illegal remove node request', index);
    return
  }
  const dirName=path.resolve(getCurrentDir(label),target.path);

  removeAllLink(label, index);
  removeAllFileLink(label, index);
  removeNode(label, index);
  klaw(dirName)
    .on('data', (item)=>{
      gitAdd(label, item.path, true);
    })
    .on('end', async()=>{
      try{
        await fs.remove(dirName);
        await write(label);
        sendWorkflow(sio, label);
      }catch(err){
        logger.error('remove node failed: ', err);
      }
    });
}

async function onAddLink(sio, label, msg){
  logger.debug('addLink event recieved: ', msg);
  addLink(label, msg.src, msg.dst, msg.isElse);
  try{
    await write(label)
      sendWorkflow(sio, label);
  }catch(err){
    logger.error('add link failed: ', err);
  }
}
function onRemoveLink(sio, label, msg){
  logger.debug('removeLink event recieved:', msg);
  removeLink(label, msg.src, msg.dst, msg.isElse);

  write(label)
    .then(()=>{
      sendWorkflow(sio, label);
    })
    .catch((err)=>{
      logger.error('remove link failed: ', err);
    });
}

async function onAddFileLink(sio, label, msg){
  logger.debug('addFileLink event recieved: ', msg);
  addFileLink(label, msg.src, msg.dst, msg.srcName, msg.dstName);
  try{
    await write(label);
      sendWorkflow(sio, label);
  }catch(err){
    logger.error('add filelink failed:', err);
  }
}

async function onRemoveFileLink(sio, label, msg){
  logger.debug('removeFileLink event recieved:', msg);
  removeFileLink(label, msg.src, msg.dst, msg.srcName, msg.dstName);
  try{
    await write(label);
      sendWorkflow(sio, label);
  }catch(err){
    logger.error('remove file link failed:', err);
  }
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
    sendWorkflow(sio, label, true);
    setTimeout(()=>{
      once(label, 'taskStateChanged', onTaskStateChanged);
    }, interval);
  }

  // event listener for component state changed
  function onComponentStateChanged(){
    sendWorkflow(sio, label, true);
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

  sio.emit('projectJson', await readProjectJson(label));
  sendWorkflow(sio, label, true);
  rootDispatcher.remove();
  deleteRootDispatcher(label);
  removeSsh(label);
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
async function onCleanProject(sio, label){
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
  await sendWorkflow(sio, label);
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
  await sendWorkflow(sio, label);
  sio.emit('projectJson', await readProjectJson(label));
}

function onTaskStateListRequest(sio, label, msg){
  logger.debug('getTaskStateList event recieved:', msg);
  const tasks=getTaskStateList(label);
  sio.emit('taskStateList', tasks);
}

async function onCreateNewFile(sio, label, filename, cb){
  try{
    await promisify(fs.writeFile)(filename, '')
    await gitAdd(label, filename);
    fileBrowser(sio, 'fileList', path.dirname(filename), {"filter": {file: getSystemFiles()}});
    cb(true);
  }catch(e){
    logger.error('create new file failed', e);
    cb(false);
  }
}
async function onCreateNewDir(sio, label, dirname, cb){
  try{
    await promisify(fs.mkdir)(dirname)
    await promisify(fs.writeFile)(path.resolve(dirname,'.gitkeep'), '')
    await gitAdd(label, path.resolve(dirname,'.gitkeep'));
    fileBrowser(sio, 'fileList', path.dirname(dirname), {"filter": {file: getSystemFiles()}});
    cb(true);
  }catch(e){
    logger.error('create new directory failed', e);
    cb(false);
  }
}

module.exports = function(io){
  let label="initial";

  const sio = io.of('/workflow');
  sio.on('connect', function (socket) {
    //event listners for workflow editor
    socket.on('getWorkflow',      onWorkflowRequest.bind(null, socket, label));
    socket.on('createNode',       onCreateNode.bind(null, socket, label));
    socket.on('updateNode',       onUpdateNode.bind(null, socket, label));
    socket.on('removeNode',       onRemoveNode.bind(null, socket, label));
    socket.on('addLink',          onAddLink.bind(null, socket, label));
    socket.on('addFileLink',      onAddFileLink.bind(null, socket, label));
    socket.on('removeLink',       onRemoveLink.bind(null, socket, label));
    socket.on('removeFileLink',   onRemoveFileLink.bind(null, socket, label));

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

    // not used for now
    socket.on('getProjectState', ()=>{
      socket.emit('projectState', getProjectState(label));
    });
    socket.on('getHostList', ()=>{
      socket.emit('hostList', remoteHost.getAll());
    });
    socket.on('getProjectJson', async ()=>{
      socket.emit('projectJson', await readProjectJson(label));
    });

    //event listeners for file operation
    fileManager(socket, label);
    socket.on('createNewFile', onCreateNewFile.bind(null, socket, label));
    socket.on('createNewDir', onCreateNewDir.bind(null, socket, label));
  });

  const router = express.Router();
  router.post('/', async (req, res)=>{
    const projectJsonFilename=req.body.project;
    //TODO label must be stored in session
    //otherwise each request from clients are messed up
    label = path.dirname(projectJsonFilename);
    await openProject(label, projectJsonFilename);
    res.cookie('root', getCwfFilename(label));
    res.cookie('rootDir', getCurrentDir(label));
    res.cookie('project', projectJsonFilename);
    res.sendFile(path.resolve(__dirname, '../views/workflow.html'));
  });
  return router;
}
