const path = require("path");
const os = require("os");
const fs = require("fs");
const {promisify} = require("util");

let express = require('express');
const del = require("del");
const log4js = require('log4js');
const logger = log4js.getLogger('workflow');
const component = require('./workflowComponent');
const Dispatcher = require('./dispatcher');
const fileManager = require('./fileManager');
const {canConnect} = require('./sshManager');
const {getDateString} = require('./utility');
const {remoteHost} = require('../db/db');
const {getCwf, setCwf, getNode, pushNode, removeNode, getCurrentDir, readRwf, getRootDir, getCwfFilename, readProjectJson} = require('./project');
const {write, setRootDispatcher, getRootDispatcher, openProject, updateProjectJson, setProjectState, getProjectState} = require('./project');
const {commitProject, revertProject, cleanProject} =  require('./project');

async function _readWorkflow(filename){
  return JSON.parse(await promisify(fs.readFile)(filename));
}

function _getChildWorkflowFilename(label, node){
  return  path.resolve(getCurrentDir(label), node.path, node.jsonFile);
}

async function _readChildWorkflow(label, node){
  return _readWorkflow(_getChildWorkflowFilename(label, node));
}
async function _writeChildWorkflow(label, node, wf){
    return promisify(fs.writeFile)(_getChildWorkflowFilename(label, node), JSON.stringify(wf, null, 4));
}


function _hasName(name, e, i, a){
  return e.name === name;
}

function _hasChild(node){
  return node.type === 'workflow' || node.type === 'parameterStudy' || node.type === 'for' || node.type === 'while' || node.type === 'foreach';
}

/**
 * sofisticated version of getNode
 */
function _getFileLinkTargetNode(label, index){
  if(index === 'parent'){
    return getCwf(label);
  }else if(Number.isInteger(index)){
    return getNode(label, parseInt(index));
  }else{
    logger.error('illegal index specified');
    return null
  }
}
/**
 * remove null entry from inputFiles and outputFiles
 * @param node workflow componet which will be clean up
 */
function _cleanUpInputOutputFiles(node){
  if('inputFiles' in node){
    node.inputFiles=node.inputFiles.filter((e)=>{
      return e != null;
    });
  }
  if('outputFiles' in node){
    node.outputFiles=node.outputFiles.filter((e)=>{
      return e != null;
    });
  }
}

/**
 * add suffix to dirname and make directory
 * @param basename dirname
 * @param suffix   number
 * @return actual directory name
 *
 * makeDir create "basenme+suffix" direcotry. suffix is increased until the dirname is no longer duplicated.
 */
async function _makeDir(basename, suffix){
  const dirname=basename+suffix;
  return promisify(fs.mkdir)(dirname)
    .then(()=>{
      return dirname;
    })
    .catch((err)=>{
      if(err.code === 'EEXIST') {
        return _makeDir(basename, suffix+1);
      }
      logger.error('mkdir failed', err);
    });
}

async function createNode(label, request){
  const node=component.factory(request.type, request.pos, getCwfFilename(label));

  const dirName=path.resolve(getCurrentDir(label),request.type);
  const actualDirname = await _makeDir(dirName, 0)
  let tmpPath=path.relative(getCurrentDir(label),actualDirname);
  if(! tmpPath.startsWith('.')){
    tmpPath='./'+tmpPath;
  }
  node.path=tmpPath;
  node.name=path.basename(actualDirname);
  node.index=pushNode(label, node);
  if(_hasChild(node)){
    const filename = path.resolve(getCurrentDir(label),node.path,node.jsonFile)
    await promisify(fs.writeFile)(filename,JSON.stringify(node,null,4))
  }
  return node.index
}

async function updateInputFiles(label, node, value){
  node.inputFiles.forEach((e,i)=>{
    const newName = value[i].name;
    const oldName = e.name;
    if(oldName === newName) return;
    e.name=newName;
    const srcNode = _getFileLinkTargetNode(label, e.srcNode);
    if(! srcNode) return;
    clearOutputFile(srcNode.outputFiles, e.srcName, node.index, oldName);
    addOutputFile(srcNode.outputFiles, e.srcName, node.index, newName);
  });
  if(_hasChild(node)){
    const childWorkflow = await _readChildWorkflow(label, node);
    childWorkflow.outputFiles.forEach((e,i)=>{
      const newName = value[i].name;
      const oldName = e.name;
      if(oldName === newName) return;
      e.name=newName;
      e.dst.forEach((dstEntry)=>{
        const dstNode = childWorkflow.nodes[dstEntry.dstNode];
        if(! dstNode) return;
        clearInputFile(dstNode.inputFiles, dstEntry.dstName);
        addInputFile(dstNode.inputFiles, dstEntry.dstName, "parent", newName)
      });
    });
    return _writeChildWorkflow(label, node, childWorkflow);
  }
}

async function updateOutputFiles(label, node, value){
  node.outputFiles.forEach((outputFile,i)=>{
    const newName = value[i].name;
    const oldName = outputFile.name;
    if(oldName === newName) return;
    outputFile.name=newName;
    outputFile.dst.forEach((dst)=>{
      const dstNode = _getFileLinkTargetNode(label, dst.dstNode);
      if(! dstNode) return;
      clearInputFile(dstNode.inputFiles, dst.dstName);
      addInputFile(dstNode.inputFiles, dst.dstName, node.index, newName);
    });
  });
  if(_hasChild(node)){
    const childWorkflow = await _readChildWorkflow(label, node);
    childWorkflow.inputFiles.forEach((inputFile, i)=>{
      const newName = value[i].name;
      const oldName = inputFile.name;
      if(oldName === newName) return;
      inputFile.name = newName;
      const srcNode = _getFileLinkTargetNode(label, inputFile.srcNode);
      if(! srcNode) return;
      clearOutputFile(srcNode.outputFiles, inputFile.srcName, "parent", oldName);
      addOutputFile(srcNode.outputFiles,  inputFile.srcName, "parent", newName);
    });
    return _writeChildWorkflow(label, node, childWorkflow);
  }
}

async function updateValue(label, node, property, value){
  node[property]=value;
  if(_hasChild(node)){
    const childWorkflow = await _readChildWorkflow(label, node);
    childWorkflow[property] = value;
    return _writeChildWorkflow(label, node, childWorkflow);
  }
}

async function addValue(label, node, property, value){
  node[property].push(value);
  if(_hasChild(node)){
    const childWorkflow = await _readChildWorkflow(label, node);
    let target = property;
    if(property === "inputFiles"){
      target = "outputFiles";
      value={name: value.name, dst:[]};
    }else if(property === "outputFiles"){
      target = "inputFiles";
      value={name: value.name, srcNode: null, srcName: null};
    }
    childWorkflow[target].push(value);
    return _writeChildWorkflow(label, node, childWorkflow);
  }
}

async function delInputFiles(label, node, value){
  const targetIndex = node.inputFiles.findIndex((e)=>{
    return e.name === value.name;
  });
  if(targetIndex === -1) return;
  const srcNode = _getFileLinkTargetNode(label, node.inputFiles[targetIndex].srcNode);
  if(srcNode){
    clearOutputFile(srcNode.outputFiles, node.inputFiles[targetIndex].srcName, node.index, value.name);
  }
  node.inputFiles.splice(targetIndex, 1);
  if(_hasChild(node)){
    const childWorkflow = await _readChildWorkflow(label, node);
    const targetIndex2 = childWorkflow.outputFiles.findIndex((e)=>{
      return e.name === value.name;
    });
    if(targetIndex2 === -1) return;
    childWorkflow.outputFiles[targetIndex2].dst.forEach((e)=>{
      const dstNode = _getFileLinkTargetNode(label, e.dstNode);
      clearInputFile(dstNode.inputFiles, e.dstName);
    });
    childWorkflow.outputFiles.splice(targetIndex2, 1);
    return _writeChildWorkflow(label, node, childWorkflow);
  }
}
async function delOutputFiles(label, node, value){
  const targetIndex = node.outputFiles.findIndex((e)=>{
    return e.name === value.name;
  });
  if(targetIndex === -1) return;
  node.outputFiles[targetIndex].dst.forEach((e)=>{
    const dstNode = _getFileLinkTargetNode(label, e.dstNode);
    clearInputFile(dstNode.inputFiles, e.dstName);
  });
  node.outputFiles.splice(targetIndex, 1);
  if(_hasChild(node)){
    const childWorkflow = await _readChildWorkflow(label, node);
    const targetIndex2 = childWorkflow.inputFiles.findIndex((e)=>{
      return e.name === value.name;
    });
    if(targetIndex2 === -1) return;
    const srcNode = _getFileLinkTargetNode(label, childWorkflow.inputFiles[targetIndex2].srcNode);
    clearOutputFile(srcNode.outputFiles, childWorkflow.inputFiles[targetIndex2].srcName, "parent", value.name);
    childWorkflow.inputFiles.splice(targetIndex2, 1);
    return _writeChildWorkflow(label, node, childWorkflow);
  }
}

async function delValue(label, node, property, value){
  let index = node[property].findIndex((e)=>{
    return e === value;
  })
  node[property][index]=null;
  if(_hasChild(node)){
    const childWorkflow = await _readChildWorkflow(label, node);
    let target = property
    childWorkflow[target][index]=null;
    return _writeChildWorkflow(label, node, childWorkflow);
  }
}

/**
 * add new inputFile entry
 * @param inputFiles - inputFile array which will be modified
 * @param name       - target entry's name
 */
function addInputFile(inputFiles, name, srcNode, srcName){
  const inputFile = inputFiles.find(_hasName.bind(null, name));
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

/**
 * remove specified inputFile entry
 * @param inputFiles - inputFile array which will be modified
 * @param name       - target entry's name
 */
function clearInputFile(inputFiles, name){
  const inputFile = inputFiles.find(_hasName.bind(null, name));
  if(! inputFile){
    logger.error(name, 'not found in inputFiles');
    return null;
  }
  inputFile.srcNode = null;
  inputFile.srcName = null;
}

/**
 * add new outputFile entry
 * @param outputFiles - outputFile array which will be modified
 * @param name        - target entry's name
 * @param dstNode     - target entry's destination node
 * @param dstName     - target entry's filename on dst node
 */
function addOutputFile(outputFiles, name, dstNode, dstName){
  const outputFile = outputFiles.find(_hasName.bind(null, name));
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


/**
 * remove specified outputFile entry
 * @param outputFiles - outputFile array which will be modified
 * @param name        - target entry's name
 * @param dstNode     - target entry's destination node
 * @param dstName     - target entry's filename on dst node
 */
function clearOutputFile(outputFiles, name, dstNode, dstName){
  const outputFile = outputFiles.find(_hasName.bind(null, name));
  if(! outputFile){
    logger.error(name, 'not found in outputFiles');
    return null;
  }
  outputFile.dst=outputFile.dst.filter((e)=>{
    return e.dstNode !== dstNode && e.dstName !== dstName;
  });
}

/**
 * add link between nodes
 * @param label - identifier of currently opend project
 * @param srcIndex {Number} - index number of src node
 * @param dstIndex {Number} - index number of dst node
 * @param isElse {Boolean} - flag to remove 'else' link
 */
function addLink (label, srcIndex, dstIndex, isElse=false){
  const srcNode=getNode(label, srcIndex);
  if(srcNode === null){
    logger.error("srcNode does not exist");
    return;
  }
  let dstNode=getNode(label, dstIndex);
  if(dstNode === null){
    logger.error("dstNode does not exist");
    return;
  }

  if(isElse){
    srcNode.else.push(dstIndex);
  }else{
    srcNode.next.push(dstIndex);
  }
  dstNode.previous.push(srcIndex);
}

/**
 * remove link between nodes
 * @param label - identifier of currently opend project
 * @param srcIndex {Number} - index number of src node
 * @param dstIndex {Number} - index number of dst node
 * @param isElse {Boolean} - flag to remove 'else' link
 */
function removeLink(label, srcIndex, dstIndex, isElse=false){
  const srcNode=getNode(label, srcIndex);
  if(srcNode === null){
    logger.error("srcNode does not exist");
    return;
  }
  let dstNode=getNode(label, dstIndex);
  if(dstNode === null){
    logger.error("dstNode does not exist");
    return;
  }

  if(isElse && Array.isArray(srcNode.else)){
    srcNode.else=srcNode.else.filter((e)=>{
      return e!==dstIndex;
    });
  }else{
    srcNode.next=srcNode.next.filter((e)=>{
      return e!==dstIndex;
    });
  }
  dstNode.previous=dstNode.previous.filter((e)=>{
    return e!==srcIndex;
  });
}

/**
 * add file link
 * @param label - identifier of currently opend project
 * @param srcIndex {Number|string} - index number of src node or "parent"
 * @param dstIndex {Number|string} - index number of dst node or "parent"
 * @param srcName {string} - file/directory/glob patturn on src node
 * @param dstName {string} - file/directory/glob patturn on dst node
 */
function addFileLink(label, srcIndex, dstIndex, srcName, dstName){
  if(srcIndex === dstIndex){
    logger.error("loop file link is not allowed");
    return;
  }
  const srcNode = _getFileLinkTargetNode(label, srcIndex);
  if(srcNode === null){
    logger.error("srcNode does not exist");
    return;
  }
  const dstNode = _getFileLinkTargetNode(label, dstIndex);
  if(dstNode === null){
    logger.error("dstNode does not exist");
    return;
  }

  addOutputFile(srcNode.outputFiles, srcName, dstIndex, dstName);
  const [oldSrc, oldSrcName]= addInputFile(dstNode.inputFiles, dstName, srcIndex, srcName);
  if(oldSrc!== null){
    const oldSrcNode = _getFileLinkTargetNode(label, oldSrc);
    clearOutputFile(oldSrcNode.outputFiles, oldSrcName, dstIndex, dstName);
  }
}

/**
 * remove file link
 */
function removeFileLink(label, srcIndex, dstIndex, srcName, dstName){
  const srcNode = _getFileLinkTargetNode(label, srcIndex);
  if(srcNode === null){
    logger.error("srcNode does not exist");
    return;
  }
  const dstNode = _getFileLinkTargetNode(label, dstIndex);
  if(dstNode === null){
    logger.error("dstNode does not exist");
    return;
  }

  clearOutputFile(srcNode.outputFiles, srcName, dstIndex, dstName);
  clearInputFile(dstNode.inputFiles, dstName);
}

/**
 * remove all link on the node
 * @param label - identifier of currently opend project
 * @param index - target node's index
 */
function removeAllLink(label, index){
  const target=getNode(label, index);
  target.previous.forEach((p)=>{
    removeLink(label, p, index, false);
    removeLink(label, p, index, true);
  });
  target.next.forEach((n)=>{
    removeLink(label, index, n, false);
  });
  if(target.else){
    target.else.forEach((n)=>{
      removeLink(label, index, n, true);
    });
  }
}

/**
 * remove all file link on the node
 * @param label - identifier of currently opend project
 * @param index - target node's index
 */
function removeAllFileLink(label, index){
  const target=getNode(label, index);
  target.inputFiles.forEach((inputFile)=>{
    const srcNode=_getFileLinkTargetNode(label, inputFile.srcNode);
    if(srcNode){
      clearOutputFile(srcNode.outputFiles, inputFile.srcName, index, inputFile.name);
    }
  });
  target.outputFiles.forEach((outputFile)=>{
    outputFile.dst.forEach((e)=>{
      const dstNode = _getFileLinkTargetNode(label, e.dstNode);
      if(dstNode){
        clearInputFile(dstNode.inputFiles, e.dstName);
      }
    });
  });
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
function validationCheck(label, workflow, dir, sio){
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
    }else if(_hasChild(node)){
      const childDir = path.resolve(dir, node.path);
      promises.push(
        _readChildWorkflow(label, node)
        .then((childWF)=>{
          validationCheck(label, childWF, childDir, sio)
        })
      );
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

async function onWorkflowRequest(sio, label, argWorkflowFilename){
  let workflowFilename=path.resolve(argWorkflowFilename);
  logger.debug('Workflow Request event recieved: ', workflowFilename);
  await setCwf(label, workflowFilename);
  let rt = Object.assign(getCwf(label));
  let promises = rt.nodes.map((child)=>{
    if(child !== null && _hasChild(child)){
      return _readChildWorkflow(label, child)
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

  let index = await createNode(label, msg);
  logger.debug('node created: ',getNode(label, index));

  try{
    await write(label);
    sio.emit('workflow', getCwf(label));
  }catch(err){
    logger.error('node create failed: ', err);
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
    _cleanUpInputOutputFiles(targetNode);
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
  const target=getNode(label, index);
  if(! target){
    logger.error('illegal remove node request', msg);
    return
  }
  const dirName=path.resolve(getCurrentDir(label),target.path);

  removeAllLink(label, index);
  removeAllFileLink(label, index);
  removeNode(label, index);
  try{
    await del(dirName, { force: true });
    await write(label);
    sio.emit('workflow', getCwf(label));
  }catch(err){
    logger.error('remove node failed: ', err);
  }
}

async function onAddLink(sio, label, msg){
  logger.debug('addLink event recieved: ', msg);
  addLink(label, msg.src, msg.dst, msg.isElse);
  try{
    await write(label)
    sio.emit('workflow', getCwf(label));
  }catch(err){
    logger.error('add link failed: ', err);
  }
}
function onRemoveLink(sio, label, msg){
  logger.debug('removeLink event recieved:', msg);
  removeLink(label, msg.src, msg.dst, msg.isElse);

  write(label)
    .then(()=>{
      sio.emit('workflow', getCwf(label));
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
    sio.emit('workflow', getCwf(label));
  }catch(err){
    logger.error('add filelink failed:', err);
  }
}

async function onRemoveFileLink(sio, label, msg){
  logger.debug('removeFileLink event recieved:', msg);
  removeFileLink(label, msg.src, msg.dst, msg.srcName, msg.dstName);
  try{
    await write(label);
    sio.emit('workflow', getCwf(label));
  }catch(err){
    logger.error('remove file link failed:', err);
  }
}

async function onRunProject(sio, label, msg){
  logger.debug(`run event recieved: ${msg}`);
  let rwf = await readRwf(label);
  try{
    await validationCheck(label, rwf, getRootDir(label), sio)
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
  await onWorkflowRequest(sio, label, getCwfFilename(label));
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
  await onWorkflowRequest(sio, label, getCwfFilename(label));
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
    socket.on('stopProject',     (msg)=>{
      onPauseProject(socket, msg);
      onCleanProject(socket, msg);
    });
    socket.on('getProjectState', ()=>{
      socket.emit('projectState', getProjectState(label));
    });

    socket.on('updateProjectJson', (data)=>{
      updateProjectJson(label, data);
    });

    socket.on('getHostList', ()=>{
      socket.emit('hostList', remoteHost.getAll());
    });
    socket.on('getProjectJson', async ()=>{
      socket.emit('projectJson', await readProjectJson(label));
    });

    //event listeners for file operation
    fileManager(socket, label);
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
    //TODO openProject will return label(index number of opend project)
    // so update label var here
    await openProject(label, projectJsonFilename);
    // cwf is set in openProject()
    res.cookie('root', getCwfFilename(label));
    res.cookie('rootDir', getCurrentDir(label));
    res.cookie('project', projectJsonFilename);
    res.sendFile(path.resolve(__dirname, '../views/workflow.html'));
  });
  return router;
}
