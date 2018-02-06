const path = require("path");
const os = require("os");
const fs = require("fs");
const {promisify} = require("util");

let express = require('express');
const del = require("del");

const logger = require("../logger");
const component = require('./workflowComponent');
const Dispatcher = require('./dispatcher');
const fileManager = require('./fileManager');
const {canConnect} = require('./sshManager');
const {getDateString} = require('./utility');
const {remoteHost} = require('../db/db');
const {getCwf, setCwf, getNode, pushNode, removeNode, getCurrentDir, readRwf, getRootDir, getCwfFilename, readProjectJson} = require('./project');
const {write, setRootDispatcher, getRootDispatcher, openProject, updateProjectJson, setProjectState, getProjectState} = require('./project');
const {commitProject, revertProject, cleanProject} =  require('./project');

function hasChild(node){
return node.type === 'workflow' || node.type === 'parameterStudy' || node.type === 'for' || node.type === 'while' || node.type === 'foreach';
}

/**
 * make directory
 * @param basename dirname
 * @param suffix   number
 * @return actual directory name
 *
 * makeDir create "basenme+suffix" direcotry. suffix is increased until the dirname is no longer duplicated.
 */
function makeDir(basename, suffix){
  let dirname=basename+suffix;
  return promisify(fs.mkdir)(dirname)
    .then(function(){
      return dirname;
    })
    .catch(function(err){
      if(err.code === 'EEXIST') {
        return makeDir(basename, suffix+1);
      }
    });
}

/**
 * remove null entry from inputFiles and outputFiles
 * @param node workflow componet which will be clean up
 */
function cleanUpNode(node){
  if('inputFiles' in node){
    node.inputFiles=node.inputFiles.filter(function(e){
      return e != null;
    });
  }
  if('outputFiles' in node){
    node.outputFiles=node.outputFiles.filter(function(e){
      return e != null;
    });
  }
}

function askPassword(sio){
  return new Promise((resolve, reject)=>{
    sio.on('password', (data)=>{
      resolve(data);
    });
    sio.emit('askPassword');
  });
}

/**
 * check if all scripts and remote host setting are available or not
 */
function validationCheck(workflow, dir, sio){
  let promises=[]
  if(dir == null ){
    promises.push(Promise.reject(new Error('Project dir is null or undefined')));
  }
  let hosts=[];
  workflow.nodes.forEach((node)=>{
    if(node == null) return;
    if(node.type === 'task'){
      if(node.path == null){
        promises.push(Promise.reject(new Error(`node.path is null or undefined ${node.name}`)));
      }
      if(node.host !== 'localhost'){
        hosts.push(node.host);
      }
      if( node.script == null){
        promises.push(Promise.reject(new Error(`script is null or undefined ${node.name}`)));
      }else{
        promises.push(promisify(fs.access)(path.resolve(dir, node.path, node.script)));
      }
    }else if(hasChild(node)){
      let childDir = path.resolve(dir, node.path);
      let childWorkflowFilename= path.resolve(childDir, node.jsonFile);
      let tmp = promisify(fs.readFile)(childWorkflowFilename)
      .then((data)=>{
        let childWF=JSON.parse(data);
        return validationCheck(childWF, childDir, sio)
      });
      promises.push(tmp);
    }
  });

  hosts = Array.from(new Set(hosts));
  let hostPromises = hosts.map((e)=>{
    let id=remoteHost.getID('name', e);
    const hostInfo = remoteHost.get(id);
    return canConnect(hostInfo)
      .catch((err)=>{
        return askPassword(sio, e)
          .then((password)=>{
            canConnect(hostInfo, password);
          });
      });
  });

  return Promise.all(promises.concat(hostPromises));
}

async function readWorkflow(filename){
  return JSON.parse(await promisify(fs.readFile)(filename));
}

async function onWorkflowRequest(sio, label, argWorkflowFilename){
  let workflowFilename=path.resolve(argWorkflowFilename);
  logger.debug('Workflow Request event recieved: ', workflowFilename);
  await setCwf(label, workflowFilename);
  let rt = Object.assign(getCwf(label));
  let promises = rt.nodes.map((child)=>{
    if(child && hasChild(child)){
      return readWorkflow(path.join(getCurrentDir(label), child.path, child.jsonFile))
        .then((tmp)=>{
          child.nodes=tmp.nodes;
        })
    }
  });
  await Promise.all(promises);
  sio.emit('workflow', rt);
}

async function onCreateNode(sio, label, msg){
  logger.debug('create event recieved: ', msg);
  let dirName=path.resolve(getCurrentDir(label),msg.type);
  let actualDirname = await makeDir(dirName, 0)
  let tmpPath=path.relative(getCurrentDir(label),actualDirname);
  if(! tmpPath.startsWith('.')){
    tmpPath='./'+tmpPath;
  }
  let node=component.factory(msg.type, msg.pos, getCwfFilename(label));
  node.path=tmpPath;
  node.name=path.basename(actualDirname);
  node.index=pushNode(label, node);
  logger.debug('node created: ',node);
  try{
    if(hasChild(node)){
      const filename = path.resolve(getCurrentDir(label),node.path,node.jsonFile)
      await promisify(fs.writeFile)(filename,JSON.stringify(node,null,4))
    }
    await write(label);
    sio.emit('workflow', getCwf(label));
  }catch(err){
    logger.error('node create failed: ', err);
  }
}

async function updateValue(label, node, property, value){
  node[property]=value;
  if(hasChild(node)){
    const childWorkflowFilename= path.resolve(getCurrentDir(label), node.path, node.jsonFile);
    const childWorkflow = JSON.parse(await promisify(fs.readFile)(childWorkflowFilename));
    childWorkflow[property] = value;
    return promisify(fs.writeFile)(childWorkflowFilename, JSON.stringify(childWorkflow, null, 4));
  }
}
async function addValue(label, node, property, value){
  node[property].push(value);
  if(hasChild(node)){
    const childWorkflowFilename= path.resolve(getCurrentDir(label), node.path, node.jsonFile);
    const childWorkflow = JSON.parse(await promisify(fs.readFile)(childWorkflowFilename));
    //TODO inputFilesとoutputFilesは逆転させる必要あり!!
    childWorkflow[property].push(value);
    return promisify(fs.writeFile)(childWorkflowFilename, JSON.stringify(childWorkflow, null, 4));
  }
}

async function delValue(label, node, property, value){
  let index = node[property].findIndex((e)=>{
    if(e===value) return true
    // for input/outputFiles
    if(e.hasOwnProperty('name') && value.hasOwnProperty('name') && e.name === value.name) return true
  })
  node[property][index]=null;
  if(hasChild(node)){
    const childWorkflowFilename = path.resolve(getCurrentDir(label), node.path, node.jsonFile);
    const childWorkflow = JSON.parse(await promisify(fs.readFile)(childWorkflowFilename));
    //TODO inputFilesとoutputFilesは逆転させる必要あり!!
    childWorkflow[property][index]=null;
    return promisify(fs.writeFile)(childWorkflowFilename, JSON.stringify(childWorkflow, null, 4));
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
        await updateValue(label, targetNode, property, value);
        break;
      case 'add':
        if(Array.isArray(targetNode[property])){
          await addValue(label, targetNode, property, value);
        }
        break;
      case 'del':
        if(Array.isArray(targetNode[property])){
          await delValue(label, targetNode, property, value);
        }
        break;
    }
    cleanUpNode(targetNode);
    try{
      await write(label)
      sio.emit('workflow', getCwf(label));
    }catch(err){
      logger.error('node update failed: ', err);
    }
  }
}

async function onRemoveNode(sio, label, index){
  logger.debug('removeNode event recieved: ', index);
  let target=getNode(label, index);
  let dirName=path.resolve(getCurrentDir(label),target.path);
  await del(dirName, { force: true })
    .catch(function () {
      logger.warn('directory remove failed: ', dirName);
    })
    /*
     *              previous
     *                 |
     * inputFiles -- index -- outputFiles
     *                 |
     *            next, else
     */
    // remove index from next property of previous tasks
    target.previous.forEach((p)=>{
      let pNode=getNode(label, p);
      pNode.next=pNode.next.filter((e)=>{
        return e!==index;
      });
      if(pNode.else != null){
         pNode.else=pNode.else.filter((e)=>{
          return e!==index;
        });
      }
    });
    // remove index from previous property of next tasks
    target.next.forEach((p)=>{
      let nNode=getNode(label, p);
      nNode.previous=nNode.previous.filter((e)=>{
        return e!==index;
      });
    });
    // remove index from previous property of next tasks (else)
    if(target.else != null){
      target.else.forEach((p)=>{
        let nNode=getNode(label, p);
        nNode.previous=nNode.previous.filter((e)=>{
          return e!==index;
        });
      });
    }
    // remove index from outputFiles property of tasks which have file dependency
    target.inputFiles.forEach((p)=>{
      let pFNode=getNode(label, p.srcNode);
      pFNode.outputFiles.forEach((outputFile)=>{
        outputFile.dst=outputFile.dst.filter((e)=>{
          return e.dstNode!==index;
        });
      });
    });
    // remove index from inputFiles property of tasks which have file dependency
    target.outputFiles.forEach((outputFile)=>{
      outputFile.dst.forEach((dst)=>{
        let nFNode=getNode(label, dst.dstNode);
        nFNode.inputFiles.forEach((e)=>{
          if(e.srcNode === index){
            e.srcNode = null;
            e.srcName = null;
          }
        });
      });
    });

    //remove target node
    removeNode(label, index);

  try{
    await write(label)
    sio.emit('workflow', getCwf(label));
  }catch(err){
    logger.error('remove node failed: ', err);
  }
}
async function onAddLink(sio, label, msg){
  logger.debug('addLink event recieved: ', msg);
  let src=msg.src;
  let dst=msg.dst;
  if(!getNode(label, src) || !getNode(label, dst)){
    logger.error('illegal addLink request', msg);
    return
  }
  let isElse=msg.isElse;
  if(isElse){
    getNode(label, src).else.push(dst);
  }else{
    getNode(label, src).next.push(dst);
  }
  getNode(label, dst).previous.push(src);

  try{
    await write(label)
    sio.emit('workflow', getCwf(label));
  }catch(err){
    logger.error('add link failed: ', err);
  }
}

function onRemoveLink(sio, label, msg){
  logger.debug('removeLink event recieved:', msg);
  let src=msg.src;
  let dst=msg.dst;
  if(!getNode(label, src) || !getNode(label, dst)){
    logger.error('illegal addLink request', msg);
    return
  }

  let srcNode=getNode(label, src);
  srcNode.next=srcNode.next.filter((e)=>{
    return e!==dst;
  });
  let dstNode=getNode(label, dst);
  dstNode.previous=dstNode.previous.filter((e)=>{
    return e!==src;
  });

  write(label)
    .then(()=>{
      sio.emit('workflow', getCwf(label));
    })
    .catch((err)=>{
      logger.error('remove link failed: ', err);
    });
}

function getFileLinkTargetNode(label, index){
  if(index === 'parent'){
    return getCwf(label);
  }else if(Number.isInteger(index)){
    return getNode(label, parseInt(index));
  }else{
    logger.error('illegal index specified');
    return null
  }
}

function hasName(name, e, i, a){
  return e.name === name;
}

function addOutputFile(outputFiles, name, dstNode, dstName){
  const outputFile = outputFiles.find(hasName.bind(null, name));
  if(! outputFile){
    logger.error(name, 'not found in outputFiles');
    return
  }
  const index = outputFile.dst.findIndex((e)=>{
    return e.dstNode === dstNode && e.dstName === dstName;
  });
  if(index !== -1) return;

  const newEntry={"dstNode": dstNode, "dstName": dstName};
  outputFile.dst.push(newEntry);
}
function addInputFile(inputFiles, name, srcNode, srcName){
  const inputFile = inputFiles.find(hasName.bind(null, name));
  if(! inputFile){
    logger.error(name, 'not found in inputFiles');
    return [null, null];
  }
  const oldSrcNode = inputFile.srcNode;
  const oldSrcName = inputFile.srcName;
  if(oldSrcNode === srcNode && oldSrcName === srcName){
    return [null, null];
  }
  const rt = [oldSrcNode,oldSrcName];
  inputFile.srcNode = srcNode;
  inputFile.srcName = srcName;
  return rt;
}
function clearInputFile(inputFiles, name){
  const inputFile = inputFiles.find(hasName.bind(null, name));
  if(! inputFile){
    logger.error(name, 'not found in inputFiles');
    return null;
  }
  inputFile.srcNode = null;
  inputFile.srcName = null;
}
function clearOutputFile(outputFiles, name, dstNode, dstName){
  const outputFile = outputFiles.find(hasName.bind(null, name));
  if(! outputFile){
    logger.error(name, 'not found in outputFiles');
    return null;
  }
  outputFile.dst=outputFile.dst.filter((e)=>{
    return e.dstNode !== dstNode && e.dstName !== dstName;
  });
}

function onAddFileLink(sio, label, msg){
  logger.debug('addFileLink event recieved: ', msg);
  const src = msg.src;
  const dst = msg.dst;
  const srcNode = getFileLinkTargetNode(label, src);
  const dstNode = getFileLinkTargetNode(label, dst);
  if(src === dst || srcNode === null || dstNode === null){
    logger.error('illegal addFileLink request', msg);
    return
  }
  const srcName = msg.srcName;
  const dstName = msg.dstName;

  addOutputFile(srcNode.outputFiles, srcName, dst, dstName);
  const [oldSrc, oldSrcName]= addInputFile(dstNode.inputFiles, dstName, src, srcName);
  if(oldSrc!== null){
    const oldSrcNode = getFileLinkTargetNode(label, oldSrc);
    clearOutputFile(oldSrcNode.outputFiles, oldSrcName, dst, dstName);
  }
  write(label)
    .then(()=>{
      sio.emit('workflow', getCwf(label));
    })
    .catch((err)=>{
      logger.error('add filelink failed: ', err);
    });
}

function onRemoveFileLink(sio, label, msg){
  logger.debug('removeFileLink event recieved:', msg);
  const src=msg.src;
  const dst=msg.dst;
  const srcNode = getFileLinkTargetNode(label, src);
  const dstNode = getFileLinkTargetNode(label, dst);
  if(src === dst || srcNode === null || dstNode === null){
    logger.error('illegal removeFileLink request', msg);
    return
  }
  const srcName = msg.srcName;
  const dstName = msg.dstName;
  clearOutputFile(srcNode.outputFiles, srcName, dst, dstName);
  clearInputFile(dstNode.inputFiles, dstName);

  write(label)
    .then(()=>{
      sio.emit('workflow', getCwf(label));
    })
    .catch((err)=>{
      logger.error('remove file link failed: ', err);
    });
}

async function onRunProject(sio, label, msg){
  logger.debug(`run event recieved: ${msg}`);
  let rwf = await readRwf(label);
  try{
    await validationCheck(rwf, getRootDir(label), sio)
  }catch(err){
    logger.error('invalid root workflow:\n', err);
    return false
  }
  await commitProject(label);
  setProjectState(label, 'running');
  let rootDir = getRootDir(label);
  setRootDispatcher(label, new Dispatcher(rwf, rootDir, rootDir));
  sio.emit('projectState', getProjectState(label));
  try{
    setProjectState(label, await getRootDispatcher(label).dispatch());
  }catch(err){
    logger.error('fatal error occurred while parseing root workflow: \n',err);
    return false;
  }
  sio.emit('projectState', getProjectState(label));
}

function onPauseProject(sio, label, msg){
  logger.debug(`pause event recieved: ${msg}`);
  getRootDispatcher(label).pause();
  setProjectState(label, 'paused');
  sio.emit('projectState', getProjectState(label));
}
async function onCleanProject(sio, label, msg){
  logger.debug(`clean event recieved: ${msg}`);
  let rootDispatcher=getRootDispatcher(label);
  if(rootDispatcher != null) rootDispatcher.remove();
  await cleanProject(label);
  onWorkflowRequest(sio, label, getCwfFilename(label));
  setProjectState(label, 'not-started');
  sio.emit('projectState', getProjectState(label));
}

async function onSaveProject(sio, label, msg){
  logger.debug(`saveProject event recieved: ${msg}`);
  await commitProject(label);
  sio.emit('projectState', getProjectState(label));
}
async function onRevertProject(sio, label, msg){
  logger.debug(`revertProject event recieved: ${msg}`);
  await revertProject(label);
  sio.emit('projectState', getProjectState(label));
}

function onTaskStateListRequest(sio, label, msg){
  logger.debug('getTaskStateList event recieved:', msg);
  logger.debug('not implimented yet !!');
}

module.exports = function(io){
  let label="initial";

  const sio = io.of('/workflow');
  sio.on('connect', function (socket) {
    fileManager(socket, label);
    socket.on('getWorkflow',      onWorkflowRequest.bind(null, socket, label));
    socket.on('createNode',       onCreateNode.bind(null, socket, label));
    socket.on('updateNode',       onUpdateNode.bind(null, socket, label));
    socket.on('removeNode',       onRemoveNode.bind(null, socket, label));
    socket.on('addLink',          onAddLink.bind(null, socket, label));
    socket.on('addFileLink',      onAddFileLink.bind(null, socket, label));
    socket.on('removeLink',       onRemoveLink.bind(null, socket, label));     //not tested
    socket.on('removeFileLink',   onRemoveFileLink.bind(null, socket, label));
    socket.on('getTaskStateList', onTaskStateListRequest.bind(null, socket, label));
    socket.on('runProject',       onRunProject.bind(null, socket, label));
    socket.on('pauseProject',     onPauseProject.bind(null, socket, label));
    socket.on('cleanProject',     onCleanProject.bind(null, socket, label));
    socket.on('saveProject',      onSaveProject.bind(null, socket, label));
    socket.on('revertProject',    onRevertProject.bind(null, socket, label));
    socket.on('updateProjectJson', (data)=>{
      updateProjectJson(label, data);
    });
    socket.on('stopProject',     (msg)=>{
      onPauseProject(socket,msg);
      onCleanProject(socket,msg);
    });
    socket.on('getHostList', ()=>{
      socket.emit('hostList', remoteHost.getAll());
    });
    socket.on('getProjectJson', async ()=>{
      socket.emit('projectJson', await readProjectJson(label));
    });
    socket.on('getProjectList', ()=>{
      socket.emit('projectState', projectState);
    });
    socket.on('createNewFile', (filename, cb)=>{
      promisify(fs.writeFile)(filename, '')
      .then(()=>{
        cb(true);
      })
      .catch((err)=>{
        logger.error('create new file failed', err);
        cb(false);
      });
    });
    socket.on('createNewDir', (dirname, cb)=>{
      promisify(fs.mkdir)(dirname)
      .then(()=>{
        cb(true);
      })
      .catch((err)=>{
        logger.error('create new directory failed', err);
        cb(false);
      });
    });
  });

  let router = express.Router();
  router.post('/', async (req, res, next)=>{
    let projectJsonFilename=req.body.project;
    //TODO get session ID from req.body
    await openProject(label, projectJsonFilename);
    // cwf is set in openProject()
    res.cookie('root', getCwfFilename(label));
    res.cookie('rootDir', getCurrentDir(label));
    res.cookie('project', projectJsonFilename);
    res.sendFile(path.resolve(__dirname, '../views/workflow.html'));
  });
  return router;
}
