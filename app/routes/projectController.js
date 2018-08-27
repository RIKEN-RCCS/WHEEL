const memMeasurement = process.env.NODE_ENV === "development" && process.env.MEMORY_MONITOR !== undefined;
const fs = require("fs-extra");
const path = require("path");

const ARsshClient = require('arssh2-client');
const {getLogger} = require('../logSettings');
const logger = getLogger('workflow');
const Dispatcher = require('./dispatcher');

const {getDateString, createSshConfig} = require('./utility');
const {interval, remoteHost, defaultCleanupRemoteRoot, projectJsonFilename, componentJsonFilename} = require('../db/db');
const {getChildren, sendProjectJson, sendWorkflow} = require("./workflowUtil");
const {
  openProject,
  addSsh,
  removeSsh,
  getTaskStateList,
  setRootDispatcher,
  getRootDispatcher,
  deleteRootDispatcher,
  commitProject,
  revertProject,
  cleanProject,
  once,
  getTasks,
  clearDispatchedTasks,
  gitAdd
} = require('./projectResource');
const {cancel} = require('./executer');
const {isInitialNode, hasChild, getComponent} = require('./workflowUtil');
const {killTask} = require("./taskUtil");

async function getProjectState(projectRootDir){
  const projectJson = fs.readJson(path.resolve(projectRootDir, projectJsonFilename));
  return projectJson.state;
}

function cancelDispatchedTasks(projectRootDir){
  for(let task of getTasks(projectRootDir)){
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

async function validateTask(component, parent, hosts){
  if(component.name == null) return Promise.reject(new Error(`illegal path ${component.null}`));
  if(component.host !== 'localhost') hosts.push(component.host);
  if( component.script == null){
    return Promise.reject(new Error(`script is not specified ${component.name}`));
  }else{
    return fs.pathExists(path.resolve(parent, component.name, component.script));
  }
}
async function validateConditionalCheck(component){
  if(component.condition === undefined) return Promise.reject(new Error(`condition is not specified ${component.name}`));
}

async function validateForLoop(component){
  if(component.start === undefined) return Promise.reject(new Error(`start is not specified ${component.name}`));
  if(component.step === undefined)  return Promise.reject(new Error(`step is not specified ${component.name}`));
  if(component.end === undefined)   return Promise.reject(new Error(`end is not specified ${component.name}`));
  if(component.step === 0 || (component.end - component.start)*component.step <0) return Promise.reject(new Error(`inifinite loop ${component.name}`));
}

async function validateParameterStudy(component){
  if(component.parameterFile === null) return Promise.reject(new Error(`parameter setting file is not specified ${component.name}`));
}

async function validateForeach(component){
  if(! Array.isArray(component.indexList)) return Promise.reject(new Error(`index list is broken ${component.name}`));
  if(component.indexList.length <= 0)      return Promise.reject(new Error(`index list is empty ${component.name}`));
}

/**
 * validate all components in workflow and gather remote hosts which is used in tasks
 */
async function validateComponents(projectRootDir, prarentDir, hosts){
  const promises=[]
  const children= await getChildren(prarentDir);
  children.map((component)=>{
    if(component.type === 'task'){
      promises.push(validateTask(component, prarentDir, hosts));
    }else if(component.type === 'if' || component.type === 'while'){
      promises.push(validateConditionalCheck(component));
    }else if(component.type === 'for'){
      promises.push(validateForLoop(component));
    }else if(component.type === 'parameterStudy'){
      promises.push(validateParameterStudy(component));
    }else if(component.type === 'foreach'){
      promises.push(validateForeach(component));
    }
    if(hasChild(component)){
      promises.push(validateComponents(projectRootDir, path.resolve(prarentDir, component.name), hosts));
    }
  });

  const hasInitialNode = children.nodes.some((component)=>{
    return isInitialNode(component);
  });
  if(!hasInitialNode) promises.push(Promise.reject(new Error('no component can be run')));

  return Promise.all(promises);
}

/**
 * check if all scripts and remote host setting are available or not
 */
async function validationCheck(projectRootDir, sio){
  let hosts=[];
  await validateComponents(projectRootDir, projectRootDir, hosts);

  hosts = Array.from(new Set(hosts)); //remove duplicate

  // ask password to user and make session to each remote hosts
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

    // remoteHostName is name property of remote host entry
    // hostInfo.host is hostname or IP address of remote host
    addSsh(projectRootDir, hostInfo.host, arssh);
    try{
      //1st try
      await arssh.canConnect();
    }catch(e){
      if(e.reason !== "invalid passphrase" && e.reason !== "authentication failure") return Promise.reject(e);
      const newPassword = await askPassword(sio, remoteHostName);
      if(config.passphrase) config.passphrase = newPassword;
      if(config.password) config.password = newPassword;
      arssh.overwriteConfig(config);
      try{
        //2nd try
        await arssh.canConnect();
      }catch(e){
        if(e.reason !== "invalid passphrase" && e.reason !== "authentication failure") return Promise.reject(e);
        const newPassword = await askPassword(sio, remoteHostName);
        if(config.passphrase) config.passphrase = newPassword;
        if(config.password) config.password = newPassword;
        arssh.overwriteConfig(config);
        try{
          //3rd try
          await arssh.canConnect();
        }catch(e){
          if(e.reason !== "invalid passphrase" && e.reason !== "authentication failure") return Promise.reject(e);
          return Promise.reject(new Error('wrong password for 3 times'));
        }
      }
    }
  }, Promise.resolve());
}



async function onRunProject(sio, projectRootDir, cb){
  logger.debug("run event recieved");
  const emit = sio.emit.bind(sio);
  if(memMeasurement){
    logger.debug("used heap size at start point =", process.memoryUsage().heapUsed/1024/1024,"MB");
  }
  const projectState=await getProjectState(projectRootDir);
  if(projectState === 'not-started'){
    try{
      await validationCheck(projectRootDir, sio)
    }catch(err){
      logger.error('invalid root workflow:', err);
      removeSsh(projectRootDir);
      cb(false);
      return
    }
    await commitProject(projectRootDir);
  }
  await sendProjectJson(emit, projectRootDir, 'running');

  const rootWF = await getComponent(projectRootDir, path.join(projectRootDir, componentJsonFilename));
  const rootDispatcher = new Dispatcher(projectRootDir, rootWF.ID, projectRootDir, getDateString(), logger);
  if(rootWF.cleanupFlag === "2"){
    rootDispatcher.doCleanup = defaultCleanupRemoteRoot;
  }
  setRootDispatcher(projectRootDir, rootDispatcher);

  // event listener for task state changed
  function onTaskStateChanged(){
    const tasks=getTaskStateList(projectRootDir);
    emit('taskStateList', tasks);
    sendWorkflow(emit, projectRootDir);
    setTimeout(()=>{
      once(projectRootDir, 'taskStateChanged', onTaskStateChanged);
    },interval);
  }

  // event listener for component state changed
  function onComponentStateChanged(){
    sendWorkflow(emit, projectRootDir);
    setTimeout(()=>{
      once(projectRootDir, 'componentStateChanged', onComponentStateChanged);
    }, interval);
  }

  once(projectRootDir, 'taskStateChanged', onTaskStateChanged);
  once(projectRootDir, 'componentStateChanged', onComponentStateChanged);

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
    await sendProjectJson(emit, projectRootDir, projectState);
  }catch(err){
    logger.error('fatal error occurred while parsing workflow:',err);
    await sendProjectJson(emit, projectRootDir, 'failed');
  }

  //TODO fix following line
  sendProjectJson(emit, projectRootDir);

  const tasks=getTaskStateList(projectRootDir);
  emit('taskStateList', tasks);
  sendWorkflow(emit, projectRootDir);


  //TODO taskStateChanged とcomponentStateChangedのremoveListener
  rootDispatcher.remove();
  deleteRootDispatcher(projectRootDir);
  removeSsh(projectRootDir);
  // TODO taskstate listはキープする必要ありここでclearしてはいけない
  clearDispatchedTasks(projectRootDir);
  //TODO dispatcherから各ワークフローのstatusを取り出してファイルに書き込む必要あり

  if(memMeasurement){
    logger.debug("used heap size at the end", process.memoryUsage().heapUsed/1024/1024,"MB");
  }
}

async function onPauseProject(emit, projectRootDir){
  logger.debug("pause event recieved");
  const rootDispatcher=getRootDispatcher(projectRootDir);
  if(rootDispatcher){
    rootDispatcher.pause();
  }
  //TODO dispatcherから各ワークフローのstatusを取り出してファイルに書き込む必要あり
  await cancelDispatchedTasks(projectRootDir);
  removeSsh(projectRootDir);
  await sendProjectJson(emit, projectRootDir, 'paused');
}
async function onCleanProject(emit, projectRootDir){
  logger.debug("clean event recieved");
  const rootDispatcher = getRootDispatcher(projectRootDir);
  if(rootDispatcher){
    rootDispatcher.remove();
    deleteRootDispatcher(projectRootDir);
  }
  await cancelDispatchedTasks(projectRootDir);
  clearDispatchedTasks(projectRootDir);
  emit('taskStateList', []);
  await cleanProject(projectRootDir);
  await openProject(projectRootDir);
  await sendWorkflow(emit, projectRootDir);
  await sendProjectJson(emit, projectRootDir, 'not-started');
}

async function onSaveProject(emit, projectRootDir){
  logger.debug("saveProject event recieved");
  const projectState=await getProjectState(projectRootDir);
  if('not-started'=== projectState){
    await commitProject(projectRootDir);
    await sendProjectJson(emit, projectRootDir);
  }else{
    logger.error(projectState,'project can not be saved');
  }
}
async function onRevertProject(emit, projectRootDir){
  logger.debug("revertProject event recieved");
  await revertProject(projectRootDir);
  await sendProjectJson(emit, projectRootDir, 'not-started');
  await sendWorkflow(emit, projectRootDir);
}

async function onUpdateProjectJson(emit, projectRootDir, prop, value, cb){
  logger.debug("updateProjectJson event recieved:",prop, value);
  const filename = path.resolve(projectRootDir, projectJsonFilename);
  try{
  const projectJson = await fs.readJson(filename);
  projectJson[prop] = value
  await fs.writeJson(filename, projectJson, {spaces: 4});
  await gitAdd(projectRootDir, filename);
  }catch(e){
    logger.error("update project Json failed", e);
    cb(false);
  }
  cb(true);
}

async function onGetProjectState(emit, projectRootDir, cb){
  try{
    const state = await getProjectState(projectRootDir)
    emit('projectState', state);
  }catch(e){
    logger.error("send project state failed", e);
    cb(false);
  }
  cb(true);
}

async function onGetProjectJson(emit, projectRootDir, cb){
  try{
    await sendProjectJson(emit, projectRootDir);
  }catch(e){
    logger.error("send project state failed", e);
    cb(false);
  }
  cb(true);
}

async function onTaskStateListRequest(emit, projectRootDir, msg){
  logger.debug('getTaskStateList event recieved:', msg);
  const tasks=getTaskStateList(projectRootDir);
  emit('taskStateList', tasks);
}

function registerListeners(socket, projectRootDir){
    const emit = socket.emit.bind(socket);
    socket.on('runProject',       onRunProject.bind(null, socket, projectRootDir));
    socket.on('pauseProject',     onPauseProject.bind(null, emit, projectRootDir));
    socket.on('cleanProject',     onCleanProject.bind(null, emit, projectRootDir));
    socket.on('saveProject',      onSaveProject.bind(null, emit, projectRootDir));
    socket.on('revertProject',    onRevertProject.bind(null, emit, projectRootDir));
    socket.on('stopProject',     async ()=>{
      await onPauseProject(emit, projectRootDir);
      await onCleanProject(emit, projectRootDir);
    });
    socket.on('updateProjectJson', onUpdateProjectJson.bind(null, emit, projectRootDir));
    socket.on('getProjectState', onGetProjectState.bind(null, emit, projectRootDir));
    socket.on('getProjectJson', onGetProjectJson.bind(null, emit, projectRootDir));
    socket.on('getTaskStateList', onTaskStateListRequest.bind(null, emit, projectRootDir));
}

module.exports = registerListeners;
