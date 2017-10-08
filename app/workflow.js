const path = require("path");
const os = require("os");
const fs = require("fs");
const util = require("util");

const siofu = require("socketio-file-upload");
const del = require("del");

const logger = require("./logger");
const fileBrowser = require("./fileBrowser");
const component = require('./workflowComponent');

function onRemove(sio, msg){
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

function onRename(sio, msg){
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
    logger.warn(`rename failed: ${err}`);
    logger.debug(`path:    ${msg.path}`);
    logger.debug(`oldName: ${msg.oldName}`);
    logger.debug(`newName: ${msg.newName}`);
  });
}

function onDownload(sio, msg){
  logger.debug(`download event recieved: ${msg}`);
  logger.warn('download function is not implemented yet.');
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
  logger.debug(`create event recieved: ${msg}`);
  switch(msg.type){
    case 'task':
      var node=new component.Task(msg.pos);
      break;
    case 'workflow':
      var node=new component.Workflow(msg.pos);
      break;
    case 'PS':
      var node=new component.ParameterStudy(msg.pos);
      break;
    case 'if':
      var node=new component.If(msg.pos);
      break;
    case 'for':
      var node=new component.Loop(msg.pos);
      break;
    case 'foreach':
      var node=new component.Foreach(msg.pos);
      break;
  }
  //TODO push to root workflow
  logger.debug('new node created: ',node);
}
function onRemoveNode(sio, msg){
  logger.debug(`removeNode event recieved: ${msg}`);
  logger.warn('removeNode function is not implemented yet.');
}
function onAddLink(sio, msg){
  logger.warn('AddLink function is not implemented yet.');
}
function onRemoveLink(sio, msg){
  logger.warn('DeleteLink function is not implemented yet.');
}

function setup(sio) {
  var sioWF = sio.of('/swf/workflow');

  sioWF.on('connect', function (socket) {
    var uploader = new siofu();
    uploader.listen(socket);
    uploader.dir = os.homedir();
    uploader.on("saved", function (event) {
      logger.info(`upload completed ${event.file.pathName} [${event.file.size} Byte]`);
      fileBrowser(sioWF, 'fileList', uploader.dir);
    });
    uploader.on("error", function (event) {
      logger.error(`Error from uploader ${event}`);
    });
    socket.on('fileListRequest', onFileListRequest.bind(null, uploader, sioWF));
    socket.on('remove',   onRemove.bind(null, sioWF));
    socket.on('rename',   onRename.bind(null, sioWF));
    socket.on('download', onDownload.bind(null, sioWF));
    socket.on('createNode', onCreateNode.bind(null, sioWF));
    socket.on('removeNode', onRemoveNode.bind(null, sioWF));
  });
}
module.exports = setup;
