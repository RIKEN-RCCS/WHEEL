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

//TODO move these resource to resourceManager
// current workflow object which is editting
let cwf=null;
// current workflow dir
let cwfDir=null;
// current workflow filename
let cwfFilename=null;
// project root workflow dir
let rwfDir=null;
// project root workflow file
let rwfFilename=null;
// dispatcher for root workflow
let rwfDispatcher=null

let projectJson=null;
let projectState='not-started';
let projectJsonFilename=null;

function hasChild(node){
return node.type === 'workflow' || node.type === 'parameterStudy' || node.type === 'for' || node.type === 'while' || node.type === 'foreach';
}

function isValidNode(index){
  return cwf.nodes[index];
}

/**
 * write data and emit to client with promise
 * @param {object} data - object to be writen and emitted
 * @param {string} filename
 * @param {object} sio  - instance of socket.io
 * @param {string} eventName - eventName to send workflow
 */
async function writeAndEmit(data, filename, sio, eventName){
  projectJson.mtime=getDateString();
  await promisify(fs.writeFile)(projectJsonFilename, JSON.stringify(projectJson, null, 4));
  await promisify(fs.writeFile)(filename, JSON.stringify(data, null, 4));
  sio.emit(eventName, data);
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
 * check if all scripts are available or not
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

async function onWorkflowRequest(sio, msg){
  logger.debug('Workflow Request event recieved: ', msg);
  cwfFilename=msg;
  cwfDir = path.dirname(cwfFilename);
  cwf = await readWorkflow(cwfFilename)
    .catch(function(err){
      logger.error('workflow file read error\n', err);
    });
  let rt = Object.assign(cwf);
  let promises = rt.nodes.map((child)=>{
    if(hasChild(child)){
      return readWorkflow(path.join(cwfDir,child.path, child.jsonFile))
        .then((tmp)=>{
          child.nodes=tmp.nodes;
        })
    }
  });
  await Promise.all(promises);
  // logger.debug(JSON.stringify(rt,null,4));
  sio.emit('workflow', rt);
}

// current workflow object which is editting
let wf=null;
// current workflow dir
let wfDir=null;
// current workflow filename
let wfFilename=null;

async function onNodesRequest(sio, msg){
  logger.debug('Nodes Request event recieved: ', msg);
  wfFilename=msg;
  wfDir = path.dirname(wfFilename);
  wf = await readWorkflow(wfFilename)
    .catch(function(err){
      logger.error('Nodes read error\n', err);
    });
  sio.emit('nodes', wf);
}

function onCreateNode(sio, msg){
  logger.debug('create event recieved: ', msg);
  let dirName=path.resolve(path.dirname(cwfFilename),msg.type);
  makeDir(dirName, 0)
    .then(function(actualDirname){
      let tmpPath=path.relative(path.dirname(cwfFilename),actualDirname);
      if(! tmpPath.startsWith('.')){
        tmpPath='./'+tmpPath;
      }
      var node=component.factory(msg.type, msg.pos, cwfFilename);
      node.path=tmpPath;
      node.name=path.basename(actualDirname);
      node.index=cwf.nodes.push(node)-1;
      logger.debug('node created: ',node);
      return node;
    })
    .then(function(node){
      if(hasChild(node)){
        const filename = path.resolve(path.dirname(cwfFilename),node.path,node.jsonFile)
        return promisify(fs.writeFile)(filename,JSON.stringify(node,null,4))
      }
    })
    .then(function(){
      return writeAndEmit(cwf, cwfFilename, sio, 'workflow')
    })
    .catch(function(err){
      logger.error('node create failed: ', err);
    });
}

function updateNode(node, property, value){
  node[property]=value;
  if(hasChild(node)){
    let childDir = path.resolve(cwfDir, node.path);
    let childWorkflowFilename= path.resolve(childDir, node.jsonFile);
    promisify(fs.writeFile)(childWorkflowFilename, JSON.stringify(node, null, 4));
  }
}

async function onUpdateNode(sio, msg){
  logger.debug('updateNode event recieved: ', msg);
  let index=msg.index;
  let property=msg.property;
  let value=msg.value;
  let cmd=msg.cmd;

  let targetNode=cwf.nodes[index];
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
    writeAndEmit(cwf, cwfFilename, sio, 'workflow')
      .catch(function(err){
        logger.error('node update failed: ', err);
      });
  }
}
function onRemoveNode(sio, index){
  logger.debug('removeNode event recieved: ', index);
  let target=cwf.nodes[index];
  let dirName=path.resolve(path.dirname(cwfFilename),target.path);
  del(dirName, { force: true }).catch(function () {
    logger.warn('directory remove failed: ', dirName);
  })
  .then(function(){
    /*
     *              previous
     *                 |
     * inputFiles -- index -- outputFiles
     *                 |
     *            next, else
     */
    // remove index from next property of previous tasks
    target.previous.forEach((p)=>{
      let pNode=cwf.nodes[p];
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
      let nNode=cwf.nodes[p];
      nNode.previous=nNode.previous.filter((e)=>{
        return e!==index;
      });
    });
    // remove index from previous property of next tasks (else)
    if(target.else != null){
      target.else.forEach((p)=>{
        let nNode=cwf.nodes[p];
        nNode.previous=nNode.previous.filter((e)=>{
          return e!==index;
        });
      });
    }
    // remove index from outputFiles property of tasks which have file dependency
    target.inputFiles.forEach((p)=>{
      let pFNode=cwf.nodes[p.srcNode];
      pFNode.outputFiles.forEach((outputFile)=>{
        outputFile.dst=outputFile.dst.filter((e)=>{
          return e.dstNode!==index;
        });
      });
    });
    // remove index from inputFiles property of tasks which have file dependency
    target.outputFiles.forEach((outputFile)=>{
      outputFile.dst.forEach((dst)=>{
        let nFNode=cwf.nodes[dst.dstNode];
        nFNode.inputFiles.forEach((e)=>{
          if(e.srcNode === index){
            e.srcNode = null;
            e.srcName = null;
          }
        });
      });
    });

    //remove target node
    cwf.nodes[index]=null;

    return writeAndEmit(cwf, cwfFilename, sio, 'workflow');
  })
  .catch(function(err){
      logger.error('remove node failed: ', err);
  });
}
function onAddLink(sio, msg){
  logger.debug('addLink event recieved: ', msg);
  let src=msg.src;
  let dst=msg.dst;
  if(!isValidNode(src) || !isValidNode(dst)){
    logger.error('illegal addLink request', msg);
    return
  }
  let isElse=msg.isElse;
  if(isElse){
    cwf.nodes[src].else.push(dst);
  }else{
    cwf.nodes[src].next.push(dst);
  }
  cwf.nodes[dst].previous.push(src);
  writeAndEmit(cwf, cwfFilename, sio, 'workflow')
    .catch(function(err){
      logger.error('add link failed: ', err);
    });
}
function onAddFileLink(sio, msg){
  logger.debug('addFileLink event recieved: ', msg);
  let src=msg.src;
  let dst=msg.dst;
  if((!isValidNode(src) && src !== 'parent')||( !isValidNode(dst) && dst !=='parent')){
    logger.error('illegal addFileLink request', msg);
    return
  }

  const srcNode=src !== 'parent'? cwf.nodes[parseInt(src)] : cwf;
  const dstNode=dst !== 'parent'? cwf.nodes[parseInt(dst)] : cwf;
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
    let formerSrcNode = cwf.nodes[dstEntry.srcNode];
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

  writeAndEmit(cwf, cwfFilename, sio, 'workflow')
    .catch((err)=>{
      logger.error('add filelink failed: ', err);
    });
}
function onRemoveLink(sio, msg){
  logger.warn('removeLink event recieved:', msg);
  let src=msg.src;
  let dst=msg.dst;
  if(!isValidNode(src) || !isValidNode(dst)){
    logger.error('illegal addLink request', msg);
    return
  }

  let srcNode=cwf.nodes[src];
  srcNode.next=srcNode.next.filter((e)=>{
    return e!==dst;
  });
  let dstNode=cwf.nodes[dst];
  dstNode.previous=dstNode.previous.filter((e)=>{
    return e!==src;
  });

  writeAndEmit(cwf, cwfFilename, sio, 'workflow')
    .catch((err)=>{
      logger.error('remove link failed: ', err);
    });
}

function onRemoveFileLink(sio, msg){
  logger.warn('removeFileLink event recieved:', msg);
  let src=msg.src;
  let dst=msg.dst;
  if((!isValidNode(src) && src !== 'parent')||( !isValidNode(dst) && dst !=='parent')){
    logger.error('illegal addFileLink request', msg);
    return
  }

  const srcNode=src !== 'parent'? cwf.nodes[parseInt(src)] : cwf;
  const dstNode=dst !== 'parent'? cwf.nodes[parseInt(dst)] : cwf;

  srcNode.outputFiles.forEach((outputFile)=>{
    outputFile.dst=outputFiles.dst.filter((dst)=>{
      return dst.dstNode !== dst;
    });
  });
  dstNode.inputFiles=dstNode.inputFiles.filter((inputFile)=>{
    return inputFile.srcNode !== src;
  });

  writeAndEmit(cwf, cwfFilename, sio, 'workflow')
    .catch((err)=>{
      logger.error('remove file link failed: ', err);
    });
}

async function onRunProject(sio, msg){
  logger.debug(`run event recieved: ${msg}`);
  let rwf = await readWorkflow(rwfFilename)
    .catch((err)=>{
      err.wf=rwfFilename;
      logger.error('read root workflow failure:\n',err);
    });
  try{
    await validationCheck(rwf, path.dirname(rwfFilename), sio)
  }catch(err){
    logger.error('invalid root workflow:\n', err);
    return false
  }
  projectState = 'running'
  rwfDispatcher = new Dispatcher(rwf, path.dirname(rwfFilename), rwfDir);
  sio.emit('projectState', projectState);

  try{
    projectState = await rwfDispatcher.dispatch()
  }catch(err){
    logger.error('fatal error occurred while parseing root workflow: \n',err);
    return false;
  }
  sio.emit('projectState', projectState);
}
function onPauseProject(sio, msg){
  logger.debug(`pause event recieved: ${msg}`);
  rwfDispatcher.pause();
  sio.emit('projectState', 'paused');
}
function onCleanProject(sio, msg){
  logger.debug(`clean event recieved: ${msg}`);
  if(rwfDispatcher != null) rwfDispatcher.remove();
  //TODO 途中経過ファイルなども削除する
  onWorkflowRequest(sio, cwfFilename);
  projectState='cleared'
  sio.emit('projectState', projectState);
}

function onTaskStateListRequest(sio, msg){
  logger.debug('getTaskStateList event recieved:', msg);
  logger.debug('not implimented yet !!');
}

function onUpdateProjectJson(sio, data){
  for(let key in projectJson){
    if(data.hasOwnProperty(key)){
      projectJson[key] = data[key];
    }
  }
}

module.exports = function(io){
  const sio = io.of('/workflow');
  sio.on('connect', function (socket) {
    fileManager(socket);

    socket.on('getWorkflow',      onWorkflowRequest.bind(null, socket));
    socket.on('createNode',       onCreateNode.bind(null, socket));
    socket.on('updateNode',       onUpdateNode.bind(null, socket));
    socket.on('removeNode',       onRemoveNode.bind(null, socket));
    socket.on('addLink',          onAddLink.bind(null, socket));
    socket.on('addFileLink',      onAddFileLink.bind(null, socket));
    socket.on('removeLink',       onRemoveLink.bind(null, socket));
    socket.on('removeFileLink',   onRemoveFileLink.bind(null, socket));
    socket.on('getTaskStateList', onTaskStateListRequest.bind(null, socket));
    socket.on('runProject',       onRunProject.bind(null, socket));
    socket.on('pauseProject',     onPauseProject.bind(null, socket));
    socket.on('cleanProject',     onCleanProject.bind(null, socket));
    socket.on('updateProjectJson', onUpdateProjectJson.bind(null, socket));
    socket.on('stopProject',     (msg)=>{
      onPauseProject(socket,msg);
      onCleanProject(socket,msg);
    });
    socket.on('getHostList', ()=>{
      socket.emit('hostList', remoteHost.getAll());
    });
    socket.on('getProjectJson', ()=>{
      socket.emit('projectJson', projectJson);
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
  router.post('/', function (req, res, next) {
    projectJsonFilename=req.body.project;
    rwfDir=path.dirname(projectJsonFilename);
    promisify(fs.readFile)(projectJsonFilename)
      .then(function(data){
        projectJson = JSON.parse(data);
        rwfFilename=path.resolve(rwfDir, projectJson.path_workflow);
        res.cookie('root', rwfFilename);
        res.cookie('rootDir', rwfDir);
        res.cookie('project', projectJsonFilename);
        res.sendFile(path.resolve(__dirname, '../views/workflow.html'));
      })
  });
  return router;
}
