const path = require("path");
const os = require("os");
const fs = require("fs");
const util = require("util");

const del = require("del");
const siofu = require("socketio-file-upload");

const logger = require("../logger");
const fileBrowser = require("./fileBrowser");
const config = require('../config/server.json');
const escape = require('./utility').escapeRegExp;;
const systemFiles = new RegExp(`^(?!^.*(${escape(config.extension.project)}|${escape(config.extension.workflow)}|${escape(config.extension.pstudy)})$).*$`);

function list(uploader, sio, requestDir){
  logger.debug(`current dir = ${requestDir}`);
  // work around
  var targetDir=null
  util.promisify(fs.stat)(requestDir)
    .then(function(stat){
      if(stat.isFile()){
        targetDir = path.dirname(requestDir)
      }else if(stat.isDirectory()){
        targetDir = requestDir;
      }else{
        return Promise.reject(new Error("illegal directory browse requestDir"));
      }
      logger.debug('targetDir = ', targetDir);
      fileBrowser(sio, 'fileList', targetDir, {"requestDir": requestDir, "filter": {file: systemFiles}});
      uploader.dir = targetDir;
    })
    .catch(function(err){
      logger.error('directory not found!', err);
    })
}

function removeFile(sio, target){
  logger.debug(`removeFile event recieved: ${target}`);
  var parentDir = path.dirname(target);
  del(target, { force: true })
  .then(function () {
      fileBrowser(sio, 'fileList', parentDir, {"filter": {file: systemFiles}});
  })
  .catch(function (err) {
    logger.warn(`removeFile failed: ${err}`);
  });
}

function renameFile(sio, msg){
  logger.debug(`renameFile event recieved: ${msg}`);
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
    logger.warn('renameFile failed: ',err);
    logger.debug('path:    ', msg.path);
    logger.debug('oldName: ', msg.oldName);
    logger.debug('newName: ', msg.newName);
  });
}

function downloadFile(sio, msg){
  logger.debug('downloadFile event recieved: ', msg);
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

function registerListeners(socket){
    let uploader = new siofu();
    uploader.listen(socket);
    uploader.dir = os.homedir();
    uploader.on("saved", function (event) {
      logger.info(`upload completed ${event.file.pathName} [${event.file.size} Byte]`);
      fileBrowser(socket, 'fileList', uploader.dir, {"filter": {file: systemFiles}});
    });
    uploader.on("error", function (event) {
      logger.error(`Error from uploader ${event}`);
    });
    socket.on('getFileList', list.bind(null, uploader, socket));
    socket.on('removeFile',          removeFile.bind(null, socket));
    socket.on('renameFile',          renameFile.bind(null, socket));
    socket.on('downloadFile',        downloadFile.bind(null, socket));
}

module.exports = registerListeners;
