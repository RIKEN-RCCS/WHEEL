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
const {getCwf, setCwf, getNode, pushNode, removeNode, getCurrentDir, readRwf, getRootDir, getCwfFilename} = require('./project');
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

async function onWorkflowRequest(sio, sessionID, workflowFilename){
  logger.debug('Workflow Request event recieved: ', workflowFilename);
  await setCwf(sessionID, workflowFilename);
  let rt = Object.assign(getCwf(sessionID));
  let promises = rt.nodes.map((child)=>{
    if(hasChild(child)){
      return readWorkflow(path.join(getCwfDir(sessionID), child.path, child.jsonFile))
        .then((tmp)=>{
          child.nodes=tmp.nodes;
        })
    }
  });
  await Promise.all(promises);
  sio.emit('workflow', rt);
}

async function onCreateNode(sio, sessionID, msg){
  logger.debug('create event recieved: ', msg);
  let dirName=path.resolve(getCurrentDir(sessionID),msg.type);
  let actualDirname = await makeDir(dirName, 0)
  let tmpPath=path.relative(getCurrentDir(sessionID),actualDirname);
  if(! tmpPath.startsWith('.')){
    tmpPath='./'+tmpPath;
  }
  let node=component.factory(msg.type, msg.pos, getCwfFilename(sessionID));
  node.path=tmpPath;
  node.name=path.basename(actualDirname);
  node.index=pushNode(sessionID, node);
  logger.debug('node created: ',node);
  try{
    if(hasChild(node)){
      const filename = path.resolve(getCurrentDir(sessionID),node.path,node.jsonFile)
      await promisify(fs.writeFile)(filename,JSON.stringify(node,null,4))
    }
    await write(sessionID);
    sio.emit('workflow', getCwf(sessionID));
  }catch(err){
    logger.error('node create failed: ', err);
  }
}

function updateNode(node, property, value){
  node[property]=value;
  if(hasChild(node)){
    let childDir = path.resolve(getCurrentDir(), node.path);
    let childWorkflowFilename= path.resolve(childDir, node.jsonFile);
    promisify(fs.writeFile)(childWorkflowFilename, JSON.stringify(node, null, 4));
  }
}

async function onUpdateNode(sio, sessionID, msg){
  logger.debug('updateNode event recieved: ', msg);
  let index=msg.index;
  let property=msg.property;
  let value=msg.value;
  let cmd=msg.cmd;

  let targetNode=getNode(sessionID, index);
  if(property in targetNode){
    switch(cmd){
      case 'add':
        if(Array.isArray(targetNode[property])){
          targetNode[property].push(value);
        }
        break;
      case 'del':
        if(Array.isArray(targetNode[property])){
          let targetIndex = targetNode[property].findIndex(function(e){
            if(e===value) return true
            // for input/outputFiles
            if(e.hasOwnProperty('name') && value.hasOwnProperty('name') && e.name === value.name) return true
          })
          targetNode[property][targetIndex]=null;
        }
        break;
      case 'update':
        await updateNode(targetNode, property, value);
        break;
      case 'updateArrayProperty':
        targetNode[property]=value;
        break;
    }
    cleanUpNode(targetNode);
    try{
      await write(sessionID)
      sio.emit('workflow', getCwf(sessionID));
    }catch(err){
      logger.error('node update failed: ', err);
    }
  }
}
async function onRemoveNode(sio, sessionID, index){
  logger.debug('removeNode event recieved: ', index);
  let target=getNode(sessionID, index);
  let dirName=path.resolve(getCurrentDir(sessionID),target.path);
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
      let pNode=getNode(sessionID, p);
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
      let nNode=getNode(sessionID, p);
      nNode.previous=nNode.previous.filter((e)=>{
        return e!==index;
      });
    });
    // remove index from previous property of next tasks (else)
    if(target.else != null){
      target.else.forEach((p)=>{
        let nNode=getNode(sessionID, p);
        nNode.previous=nNode.previous.filter((e)=>{
          return e!==index;
        });
      });
    }
    // remove index from outputFiles property of tasks which have file dependency
    target.inputFiles.forEach((p)=>{
      let pFNode=getNode(sessionID, p.srcNode);
      pFNode.outputFiles.forEach((outputFile)=>{
        outputFile.dst=outputFile.dst.filter((e)=>{
          return e.dstNode!==index;
        });
      });
    });
    // remove index from inputFiles property of tasks which have file dependency
    target.outputFiles.forEach((outputFile)=>{
      outputFile.dst.forEach((dst)=>{
        let nFNode=getNode(sessionID, dst.dstNode);
        nFNode.inputFiles.forEach((e)=>{
          if(e.srcNode === index){
            e.srcNode = null;
            e.srcName = null;
          }
        });
      });
    });

    //remove target node
    removeNode(sessionID, index);

  try{
    await write(sessionID)
    sio.emit('workflow', getCwf(sessionID));
  }catch(err){
    logger.error('remove node failed: ', err);
  }
}
async function onAddLink(sio, sessionID, msg){
  logger.debug('addLink event recieved: ', msg);
  let src=msg.src;
  let dst=msg.dst;
  if(!getNode(sessionID, src) || !getNode(sessionID, dst)){
    logger.error('illegal addLink request', msg);
    return
  }
  let isElse=msg.isElse;
  if(isElse){
    getNode(sessionID, src).else.push(dst);
  }else{
    getNode(sessionID, src).next.push(dst);
  }
  getNode(sessionID, dst).previous.push(src);

  try{
    await write(sessionID)
    sio.emit('workflow', getCwf(sessionID));
  }catch(err){
    logger.error('add link failed: ', err);
  }
}
function onAddFileLink(sio, sessionID, msg){
  logger.debug('addFileLink event recieved: ', msg);
  let src=msg.src;
  let dst=msg.dst;
  if((!getNode(sessionID, src) && src !== 'parent')||( !getNode(sessionID, dst) && dst !=='parent')){
    logger.error('illegal addFileLink request', msg);
    return
  }

  const srcNode=src !== 'parent'? getNode(sessionID, parseInt(src)) : getCwf(sessionID);
  const dstNode=dst !== 'parent'? getNode(sessionID, parseInt(dst)) : getCwf(sessionID);
  const srcName = msg.srcName
  const dstName = msg.dstName

  // add outputFile entry on src node.
  let srcEntry = srcNode.outputFiles.find((e)=>{
    return e.name === srcName;
  });
  srcEntry.dst.push({"dstNode": dst, "dstName": dstName});
  // get inputFile entry on dst node.
  let dstEntry = dstNode.inputFiles.find((e)=>{
    return e.name === dstName;
  });
  // remove outputFiles entry from former src node
  if(dstEntry.srcNode != null){
    let formerSrcNode = getNode(sessionID, dstEntry.srcNode);
    let formerSrcEntry = formerSrcNode.outputFiles.find(function(e){
      return e.name === dstEntry.srcName
    });
    formerSrcEntry.dst = formerSrcEntry.dst.filter(function(e){
      return !(e.dstNode === dst && e.dstName === dstName);
    });
  }
  // replace inputFiles entry on dst node.
  dstEntry.srcNode=src;
  dstEntry.srcName=srcName;

  write(sessionID)
    .then(()=>{
      sio.emit('workflow', getCwf(sessionID));
    })
    .catch((err)=>{
      logger.error('add filelink failed: ', err);
    });
}
function onRemoveLink(sio, sessionID, msg){
  logger.warn('removeLink event recieved:', msg);
  let src=msg.src;
  let dst=msg.dst;
  if(!getNode(sessionID, src) || !getNode(sessionID, dst)){
    logger.error('illegal addLink request', msg);
    return
  }

  let srcNode=getNode(sessionID, src);
  srcNode.next=srcNode.next.filter((e)=>{
    return e!==dst;
  });
  let dstNode=getNode(sessionID, dst);
  dstNode.previous=dstNode.previous.filter((e)=>{
    return e!==src;
  });

  write(sessionID)
    .then(()=>{
      sio.emit('workflow', getCwf(sessionID));
    })
    .catch((err)=>{
      logger.error('remove link failed: ', err);
    });
}

function onRemoveFileLink(sio, sessionID, msg){
  logger.warn('removeFileLink event recieved:', msg);
  let src=msg.src;
  let dst=msg.dst;
  if((!getNode(sessionID, src) && src !== 'parent')||( !getNode(sessionID, dst) && dst !=='parent')){
    logger.error('illegal addFileLink request', msg);
    return
  }

  const srcNode=src !== 'parent'? getNode(sessionID, parseInt(src)) : getCwf(sessionID);
  const dstNode=dst !== 'parent'? getNode(sessionID, parseInt(dst)) : getCwf(sessionID);

  srcNode.outputFiles.forEach((outputFile)=>{
    outputFile.dst=outputFiles.dst.filter((dst)=>{
      return dst.dstNode !== dst;
    });
  });
  dstNode.inputFiles=dstNode.inputFiles.filter((inputFile)=>{
    return inputFile.srcNode !== src;
  });

  write(sessionID)
    .then(()=>{
      sio.emit('workflow', getCwf(sessionID));
    })
    .catch((err)=>{
      logger.error('remove file link failed: ', err);
    });
}

async function onRunProject(sio, sessionID, msg){
  logger.debug(`run event recieved: ${msg}`);
  let rwf = await readRwf(sessionID);
  try{
    await validationCheck(rwf, getRootDir(sessionID), sio)
  }catch(err){
    logger.error('invalid root workflow:\n', err);
    return false
  }
  await commitProject(sessionID);
  setProjectState(sessionID, 'running');
  let rootDir = getRootDir(sessionID);
  setRootDispatcher(sessionID, new Dispatcher(rwf, rootDir, rootDir));
  sio.emit('projectState', getProjectState(sessionID));
  try{
    setProjectState(sessionID, await getRootDispatcher(sessionID).dispatch());
  }catch(err){
    logger.error('fatal error occurred while parseing root workflow: \n',err);
    return false;
  }
  sio.emit('projectState', getProjectState(sessionID));
}

function onPauseProject(sio, sessionID, msg){
  logger.debug(`pause event recieved: ${msg}`);
  getRootDispatcher(sessionID).pause();
  setProjectState(sessionID, 'paused');
  sio.emit('projectState', getProjectState(sessionID));
}
async function onCleanProject(sio, sessionID, msg){
  logger.debug(`clean event recieved: ${msg}`);
  let rootDispatcher=getRootDispatcher(sessionID);
  if(rootDispatcher != null) rootDispatcher.remove();
  await cleanProject(sessionID);
  onWorkflowRequest(sio, sessionID, getCwfFilename(sessionID));
  setProjectState(sessionID, 'not-started');
  sio.emit('projectState', getProjectState(sessionID));
}

async function onSaveProject(sio, sessionID, msg){
  logger.debug(`saveProject event recieved: ${msg}`);
  await commitProject(sessionID);
  sio.emit('projectState', getProjectState(sessionID));
}
async function onRevertProject(sio, sessionID, msg){
  logger.debug(`revertProject event recieved: ${msg}`);
  await revertProject(sessionID);
  sio.emit('projectState', getProjectState(sessionID));
}

function onTaskStateListRequest(sio, sessionID, msg){
  logger.debug('getTaskStateList event recieved:', msg);
  logger.debug('not implimented yet !!');
}

module.exports = function(io){
  let sessionID="initial";

  const sio = io.of('/workflow');
  sio.on('connect', function (socket) {
    fileManager(socket, sessionID);
    socket.on('getWorkflow',      onWorkflowRequest.bind(null, socket, sessionID));
    socket.on('createNode',       onCreateNode.bind(null, socket, sessionID));
    socket.on('updateNode',       onUpdateNode.bind(null, socket, sessionID));
    socket.on('removeNode',       onRemoveNode.bind(null, socket, sessionID));
    socket.on('addLink',          onAddLink.bind(null, socket, sessionID));
    socket.on('addFileLink',      onAddFileLink.bind(null, socket, sessionID));
    socket.on('removeLink',       onRemoveLink.bind(null, socket, sessionID));     //not tested
    socket.on('removeFileLink',   onRemoveFileLink.bind(null, socket, sessionID)); //not tested
    socket.on('getTaskStateList', onTaskStateListRequest.bind(null, socket, sessionID));
    socket.on('runProject',       onRunProject.bind(null, socket, sessionID));
    socket.on('pauseProject',     onPauseProject.bind(null, socket, sessionID));
    socket.on('cleanProject',     onCleanProject.bind(null, socket, sessionID));
    socket.on('saveProject',      onSaveProject.bind(null, socket, sessionID));
    socket.on('revertProject',    onRevertProject.bind(null, socket, sessionID));
    socket.on('updateProjectJson', (data)=>{
      updateProjectJson(sessionID, data);
    });
    socket.on('stopProject',     (msg)=>{
      onPauseProject(socket,msg);
      onCleanProject(socket,msg);
    });
    socket.on('getHostList', ()=>{
      socket.emit('hostList', remoteHost.getAll());
    });
    socket.on('getProjectJson', async ()=>{
      socket.emit('projectJson', await readProjectJson(sessionID));
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
    await openProject(sessionID, projectJsonFilename);
    // cwf is set in openProject()
    res.cookie('root', getCwfFilename(sessionID));
    res.cookie('rootDir', getCurrentDir(sessionID));
    res.cookie('project', projectJsonFilename);
    res.sendFile(path.resolve(__dirname, '../views/workflow.html'));
  });
  return router;
}
