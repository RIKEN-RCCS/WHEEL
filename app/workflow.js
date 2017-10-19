const path = require("path");
const os = require("os");
const fs = require("fs");
const util = require("util");

const siofu = require("socketio-file-upload");
const del = require("del");

const logger = require("./logger");
const fileBrowser = require("./fileBrowser");
const component = require('./workflowComponent');

var rootWorkflow=null;
var rootWorkflowFilename=null;

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

function onRemoveFile(sio, msg){
  logger.debug(`remove event recieved: ${msg}`);
  var parentDir = path.dirname(msg);
  del(msg, { force: true })
  .then(function () {
      fileBrowser(sio, 'fileList', parentDir);
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
      fileBrowser(sio, 'fileList', targetDir, request);
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
    fileBrowser(sio, 'fileList', msg.path);
  })
  .catch(function (err) {
    logger.warn('rename failed: ',err);
    logger.debug('path:    ', msg.path);
    logger.debug('oldName: ', msg.oldName);
    logger.debug('newName: ', msg.newName);
  });
}

function onDownloadFile(sio, filename){
  logger.debug('download event recieved: ',filename);
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
}
function onPauseProject(sio, msg){
  logger.debug(`pause event recieved: ${msg}`);
}
function onCleanProject(sio, msg){
  logger.debug(`clean event recieved: ${msg}`);
}

function onEditWrokflow(sio, msg){
  logger.debug(`edit event recieved: ${msg}`);
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
      if(node.type === 'workflow' || node.type === 'parameterStudy'){
        const filename = path.resolve(path.dirname(rootWorkflowFilename),node.path,node.jsonFile)
        return util.promisify(fs.writeFile)(filename,JSON.stringify(node,null,4))
      }
    })
    .then(function(){
      return util.promisify(fs.writeFile)(rootWorkflowFilename, JSON.stringify(rootWorkflow, null, 4));
    })
    .then(function(){
      sio.emit('workflow', rootWorkflow);
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
            if(e===value) return true;
          })
          targetNode[property][targetIndex]=null;
        }
        break;
      case 'update':
        targetNode[property]=value;
        break;
    }
    util.promisify(fs.writeFile)(rootWorkflowFilename, JSON.stringify(rootWorkflow, null, 4))
    .then(function(){
      sio.emit('workflow', rootWorkflow);
    })
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
    rootWorkflow.nodes[index]=null;
    return util.promisify(fs.writeFile)(rootWorkflowFilename, JSON.stringify(rootWorkflow, null, 4));
  })
  .then(function(){
    sio.emit('workflow', rootWorkflow);
  });

}
function onAddLink(sio, msg){
  logger.warn('AddLink function is not implemented yet.');
}
function onRemoveLink(sio, msg){
  logger.warn('DeleteLink function is not implemented yet.');
}

function setup(sio) {
  sio.of('/workflow').on('connect', function (socket) {
    var uploader = new siofu();
    uploader.listen(socket);
    uploader.dir = os.homedir();
    uploader.on("saved", function (event) {
      logger.info(`upload completed ${event.file.pathName} [${event.file.size} Byte]`);
      fileBrowser(socket, 'fileList', uploader.dir);
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
  });
}
module.exports = setup;
