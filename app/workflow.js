const path = require("path");
const os = require("os");
const fs = require("fs");
const util = require("util");

const siofu = require("socketio-file-upload");
const del = require("del");

const logger = require("./logger");
const fileBrowser = require("./fileBrowser");
const component = require('./workflowComponent');
const config = require('./config/server.json');
const escape = require('./utility').escapeRegExp;;
const Dispatcher = require('./dispatcher');

//TODO move these resource to resourceManager
// workflow object which is editting
var rootWorkflow=null;
// workflow filename which is editting
var rootWorkflowFilename=null;


const systemFiles = new RegExp(`^(?!^.*(${escape(config.extension.project)}|${escape(config.extension.workflow)}|${escape(config.extension.pstudy)})$).*$`);

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
 * save workflow and emit to client with promise
 * @param workflow object
 * @param filename workflow filename
 * @param sio instance of socket.io
 * @param eventName eventName to send workflow
 */
function writeAndEmit(wf, filename, sio, eventName){
  return util.promisify(fs.writeFile)(filename, JSON.stringify(wf, null, 4))
  .then(function(){
    sio.emit(eventName, wf);
  });
}

/**
 * remove null from inputFiles and outputFiles
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

function onRemoveFile(sio, msg){
  logger.debug(`remove event recieved: ${msg}`);
  var parentDir = path.dirname(msg);
  del(msg, { force: true })
  .then(function () {
      fileBrowser(sio, 'fileList', parentDir, {"filter": {file: systemFiles}});
  })
  .catch(function (err) {
    logger.warn(`remove failed: ${err}`);
    logger.debug(`remove msg: ${msg}`);
  });
}

function onFileListRequest(uploader, sio, request){
  logger.debug(`current dir = ${request}`);
  // work around
  var targetDir=null
  util.promisify(fs.stat)(request)
    .then(function(stat){
      if(stat.isFile()){
        targetDir = path.dirname(request)
      }else if(stat.isDirectory()){
        targetDir = request;
      }else{
        return Promise.reject(new Error("illegal directory browse request"));
      }
      logger.debug('targetDir = ', targetDir);
      fileBrowser(sio, 'fileList', targetDir, {"request": request, "filter": {file: systemFiles}});
      uploader.dir = targetDir;
    })
    .catch(function(err){
      logger.error('directory not found!');
    })
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

function onRenameFile(sio, msg){
  logger.debug(`rename event recieved: ${msg}`);
  if (!(msg.hasOwnProperty('oldName') && msg.hasOwnProperty('newName') && msg.hasOwnProperty('path'))) {
    logger.warn(`illegal request ${msg}`);
    return;
  }
  var oldName = path.resolve(msg.path, msg.oldName);
  var newName = path.resolve(msg.path, msg.newName);
  util.promisify(fs.rename)(oldName, newName)
  .then(function () {
    fileBrowser(sio, 'fileList', msg.path, {"filter": {file: systemFiles}});
  })
  .catch(function (err) {
    logger.warn('rename failed: ',err);
    logger.debug('path:    ', msg.path);
    logger.debug('oldName: ', msg.oldName);
    logger.debug('newName: ', msg.newName);
  });
}

function onDownloadFile(sio, msg){
  logger.debug('download event recieved: ', msg);
  let filename = path.resolve(msg.path, msg.name);
  //TODO ディレクトリが要求された時に対応する
  util.promisify(fs.readFile)(filename)
    .then(function(data){
      sio.emit('download', data);
    })
  .catch(function(err){
    logger.error('file download failed', err);
  });
}


function onRunProject(sio, msg){
  logger.debug(`run event recieved: ${msg}`);
  let d = new Dispatcher(rootWorkflow);
  d.dispatch();
  setInterval(function(){
    if(d.isFinished()){
      d.remove();
    }
    //TODO project 終了処理
  }, config.interval);
}
function onPauseProject(sio, msg){
  logger.debug(`pause event recieved: ${msg}`);
}
function onCleanProject(sio, msg){
  logger.debug(`clean event recieved: ${msg}`);
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

function setup(sio) {
  sio.of('/workflow').on('connect', function (socket) {
    var uploader = new siofu();
    uploader.listen(socket);
    uploader.dir = os.homedir();
    uploader.on("saved", function (event) {
      logger.info(`upload completed ${event.file.pathName} [${event.file.size} Byte]`);
      fileBrowser(socket, 'fileList', uploader.dir, {"filter": {file: systemFiles}});
    });
    uploader.on("error", function (event) {
      logger.error(`Error from uploader ${event}`);
    });
    socket.on('fileListRequest', onFileListRequest.bind(null, uploader, socket));
    socket.on('workflowRequest', onWorkflowRequest.bind(null, socket));
    socket.on('remove',          onRemoveFile.bind(null, socket));
    socket.on('rename',          onRenameFile.bind(null, socket));
    socket.on('download',        onDownloadFile.bind(null, socket));
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
}
module.exports = setup;
