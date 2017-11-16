const path = require("path");
const os = require("os");
const fs = require("fs");
const util = require("util");

let express = require('express');
const del = require("del");

const logger = require("../logger");
const component = require('./workflowComponent');
const Dispatcher = require('./dispatcher');
const fileManager = require('./fileManager');

//TODO move these resource to resourceManager
// workflow object which is editting
let rootWorkflow=null;
// workflow filename which is editting
let rootWorkflowFilename=null;
// dispatcher for root workflow
let rootWorkflowDispatcher=null

/**
 * write data and emit to client with promise
 * @param {object} data - object to be writen and emitted
 * @param {string} filename
 * @param {object} sio  - instance of socket.io
 * @param {string} eventName - eventName to send workflow
 */
function writeAndEmit(data, filename, sio, eventName){
  return util.promisify(fs.writeFile)(filename, JSON.stringify(data, null, 4))
    .then(function(){
      sio.emit(eventName, data);
    });
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
  return util.promisify(fs.mkdir)(dirname)
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

function onWorkflowRequest(sio, msg){
  logger.debug('Workflow Request event recieved: ', msg);
  rootWorkflowFilename=msg;
  util.promisify(fs.readFile)(rootWorkflowFilename)
    .then(function(data){
      rootWorkflow=JSON.parse(data);
      sio.emit('workflow', rootWorkflow);
    })
  .catch(function(err){
    logger.error('workflow file read error');
    logger.error('reason: ',err);
  });
}

function onCreateNode(sio, msg){
  logger.debug('create event recieved: ', msg);
  let dirName=path.resolve(path.dirname(rootWorkflowFilename),msg.type);
  makeDir(dirName, 0)
    .then(function(actualDirname){
      let tmpPath=path.relative(path.dirname(rootWorkflowFilename),actualDirname);
      if(! tmpPath.startsWith('.')){
        tmpPath='./'+tmpPath;
      }
      var node=component.factory(msg.type, msg.pos, rootWorkflowFilename);
      node.path=tmpPath;
      node.name=path.basename(actualDirname);
      node.index=rootWorkflow.nodes.push(node)-1;
      logger.debug('node created: ',node);
      return node;
    })
    .then(function(node){
      if(node.type === 'workflow' || node.type === 'parameterStudy' || node.type === 'for' || node.type === 'while' || node.type === 'foreach'){
        const filename = path.resolve(path.dirname(rootWorkflowFilename),node.path,node.jsonFile)
        return util.promisify(fs.writeFile)(filename,JSON.stringify(node,null,4))
      }
    })
    .then(function(){
      return writeAndEmit(rootWorkflow, rootWorkflowFilename, sio, 'workflow')
    })
    .catch(function(err){
      logger.error('node create failed: ', err);
    });
}

function onUpdateNode(sio, msg){
  logger.debug('updateNode event recieved: ', msg);
  let index=msg.index;
  let property=msg.property;
  let value=msg.value;
  let cmd=msg.cmd;

  let targetNode=rootWorkflow.nodes[index];
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
        targetNode[property]=value;
        break;
    }
    cleanUpNode(targetNode);
    writeAndEmit(rootWorkflow, rootWorkflowFilename, sio, 'workflow')
      .catch(function(err){
        logger.error('node update failed: ', err);
      });
  }
}
function onRemoveNode(sio, index){
  logger.debug('removeNode event recieved: ', index);
  let target=rootWorkflow.nodes[index];
  let dirName=path.resolve(path.dirname(rootWorkflowFilename),target.path);
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
      let pNode=rootWorkflow.nodes[p];
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
      let nNode=rootWorkflow.nodes[p];
      nNode.previous=nNode.previous.filter((e)=>{
        return e!==index;
      });
    });
    // remove index from previous property of next tasks (else)
    if(target.else != null){
      target.else.forEach((p)=>{
        let nNode=rootWorkflow.nodes[p];
        nNode.previous=nNode.previous.filter((e)=>{
          return e!==index;
        });
      });
    }
    // remove index from outputFiles property of tasks which have file dependency
    target.inputFiles.forEach((p)=>{
      let pFNode=rootWorkflow.nodes[p.srcNode];
      pFNode.outputFiles.forEach((outputFile)=>{
        outputFile.dst=outputFile.dst.filter((e)=>{
          return e.dstNode!==index;
        });
      });
    });
    // remove index from inputFiles property of tasks which have file dependency
    target.outputFiles.forEach((outputFile)=>{
      outputFile.dst.forEach((dst)=>{
        let nFNode=rootWorkflow.nodes[dst.dstNode];
        nFNode.inputFiles.forEach((e)=>{
          if(e.srcNode === index){
            e.srcNode = null;
            e.srcName = null;
          }
        });
      });
    });

    //remove target node
    rootWorkflow.nodes[index]=null;

    return writeAndEmit(rootWorkflow, rootWorkflowFilename, sio, 'workflow');
  })
  .catch(function(err){
      logger.error('remove node failed: ', err);
  });
}
function onAddLink(sio, msg){
  logger.debug('addLink event recieved: ', msg);
  let src=msg.src;
  let dst=msg.dst;
  let isElse=msg.isElse;
  if(isElse){
    rootWorkflow.nodes[src].else.push(dst);
  }else{
    rootWorkflow.nodes[src].next.push(dst);
  }
  rootWorkflow.nodes[dst].previous.push(src);
  writeAndEmit(rootWorkflow, rootWorkflowFilename, sio, 'workflow')
    .catch(function(err){
      logger.error('add link failed: ', err);
    });
}
function onAddFileLink(sio, msg){
  logger.debug('addFileLink event recieved: ', msg);
  const src=msg.src;
  const dst=msg.dst;
  const srcName = msg.srcName
  const dstName = msg.dstName

  // add outputFile entry on src node.
  let srcEntry = rootWorkflow.nodes[src].outputFiles.find(function(e){
    return e.name === srcName;
  });
  srcEntry.dst.push({"dstNode": dst, "dstName": dstName});

  // get inputFile entry on dst node.
  let dstEntry = rootWorkflow.nodes[dst].inputFiles.find(function(e){
    return e.name === dstName;
  });

  // remove outputFiles entry from former src node
  if(dstEntry.srcNode != null){
    let formerSrcNode = rootWorkflow.nodes[dstEntry.srcNode];
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
  writeAndEmit(rootWorkflow, rootWorkflowFilename, sio, 'workflow')
    .catch(function(err){
      logger.error('add filelink failed: ', err);
    });
}
function onRemoveLink(sio, msg){
  logger.warn('DeleteLink function is not implemented yet.');
}
function onRemoveFileLink(sio, msg){
  logger.warn('DeleteFileLink function is not implemented yet.');
}



function onRunProject(sio, msg){
  logger.debug(`run event recieved: ${msg}`);
  rootWorkflowDispatcher = new Dispatcher(rootWorkflow, path.dirname(rootWorkflowFilename));
  sio.emit('projectState', 'running');
  rootWorkflowDispatcher.dispatch()
  .catch((err)=>{
    logger.error('fatal occurred while parseing root workflow: ',err);
  });
}
function onPauseProject(sio, msg){
  logger.debug(`pause event recieved: ${msg}`);
  rootWorkflowDispatcher.pause();
  sio.emit('projectState', 'paused');
}
function onCleanProject(sio, msg){
  logger.debug(`clean event recieved: ${msg}`);
  rootWorkflowDispatcher.remove();
  //TODO 途中経過ファイルなども削除する(TaskStateManagerの責務)
  sio.emit('projectState', 'cleared');
}


module.exports = function(io){
  const sio = io.of('/workflow');
  sio.on('connect', function (socket) {
    fileManager(socket);

    socket.on('workflowRequest', onWorkflowRequest.bind(null, socket));
    socket.on('createNode',      onCreateNode.bind(null, socket));
    socket.on('updateNode',      onUpdateNode.bind(null, socket));
    socket.on('removeNode',      onRemoveNode.bind(null, socket));
    socket.on('addLink',         onAddLink.bind(null, socket));
    socket.on('addFileLink',     onAddFileLink.bind(null, socket));

    socket.on('runProject',      onRunProject.bind(null, socket));
    socket.on('pauseProject',    onPauseProject.bind(null, socket));
    socket.on('cleanProject',    onCleanProject.bind(null, socket));
    socket.on('stopProject',     (msg)=>{
      onPauseProject(socket,msg);
      onCleanProject(socket,msg);
    });
  });

  let router = express.Router();
  router.post('/', function (req, res, next) {
    const projectJSON=req.body.project;
    const projectDir=path.dirname(projectJSON);
    util.promisify(fs.readFile)(projectJSON)
      .then(function(data){
        const tmp = JSON.parse(data);
        const rootWorkflow=path.resolve(projectDir,tmp.path_workflow);
        res.cookie('root', rootWorkflow);
        res.cookie('rootDir', projectDir);
        res.cookie('project', projectJSON);
        res.sendFile(path.resolve('app/views/workflow.html'));
      })
  });
  return router;
}
