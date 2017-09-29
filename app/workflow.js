const path = require("path");
const os = require("os");
const fs = require("fs");
const util = require("util");

const siofu = require("socketio-file-upload");
const del = require("del");

const logger = require("./logger");
const fileBrowser = require("./fileBrowser");

function onRemove(sio, msg){
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
  var data = JSON.parse(msg.toString());
  if (!(data.hasOwnProperty('oldName') && data.hasOwnProperty('newName') && data.hasOwnProperty('path'))) {
    logger.warn(`illegal request ${msg}`);
    return;
  }
  var oldName = path.resolve(data.path, data.oldName);
  var newName = path.resolve(data.path, data.newName);
  util.promisify(fs.rename)(oldName, newName)
  .then(function () {
    fileBrowser(sio, 'fileList', data.path);
  })
  .catch(function (err) {
    logger.warn(`rename failed: ${err}`);
    logger.debug(`path:    ${data.path}`);
    logger.debug(`oldName: ${data.oldName}`);
    logger.debug(`newName: ${data.newName}`);
  });
}
function onDownload(sio, msg){
  logger.warn('download function is not implemented yet.');
}

function onFileListRequest(uploader, sio, msg){
  logger.debug(`current dir = ${msg}`);
  fileBrowser(sio, 'fileList', msg);
  uploader.dir = msg;
}

function onReadTreeJson (socket) {
    const eventName = 'readTreeJson';
    socket.on(eventName, (workflowJsonFilePath) => {
        const roodDirectory = path.dirname(workflowJsonFilePath);
        try {
            logger.debug(`tree json=${workflowJsonFilePath}`);
            const createJsonFile = ServerUtility.createTreeJson(workflowJsonFilePath);
            socket.json.emit(eventName, createJsonFile);
        }
        catch (error) {
            logger.error(error);
            socket.emit(eventName);
        }
    });
};
function onGetFileStat (socket) {
    const eventName = 'onGetFileStat';
    socket.on(eventName, (filepath) => {
        fs.stat(filepath, (err, stats) => {
            if (err) {
                socket.emit(eventName);
            }
            else {
                socket.json.emit(eventName, stats);
            }
        });
    });
};
function onWriteTreeJson (socket) {
    const eventName = 'writeTreeJson';
    socket.on(eventName, (projectDirectory, json) => {
        const queue = [];
        writeTreeJson.setQueue(queue, projectDirectory, json);
        writeTreeJson.saveTreeJson(queue, () => {
            socket.emit(eventName);
        });
    });
};
function onGetJsonFile (socket) {
    const eventName = 'onGetJsonFile';
    socket.on(eventName, (filetype) => {
        console.log('DEBUG: recieved GetJsonFile request');
        const filepath = ServerUtility.getTypeOfJson(filetype).getTemplateFilePath();
        fs.readFile(filepath, (err, data) => {
            if (err) {
                logger.error(err);
                socket.emit(eventName);
            }
            else {
                socket.json.emit(eventName, JSON.parse(data.toString()));
            }
        });
    });
};

function onGetRemoteHostList (socket) {
    const eventName = 'onGetRemoteHostList';
    socket.on(eventName, () => {
        ServerUtility.getHostInfo((err, hostList) => {
            if (err) {
                logger.error(err);
                socket.emit(eventName);
            }
            else if (!hostList) {
                logger.error('host list does not exist');
                socket.emit(eventName);
            }
            else {
                logger.debug(hostList);
                socket.json.emit(eventName, hostList);
            }
        });
    });
};
function onDeleteDirectory (socket) {
    const eventName = 'onDeleteDirectory';
    socket.on(eventName, (directorys) => {
        (function loop() {
            const directory = directorys.shift();
            if (!directory) {
                socket.emit(eventName);
                return;
            }
            ServerUtility.unlinkDirectoryAsync(directory, (err) => {
                if (!err) {
                    logger.info(`delete  dir=${directory}`);
                }
                loop();
            });
        })();
    });
};

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
    socket.on('remove', onRemove.bind(null, sioWF));
    socket.on('rename', onRename.bind(null, sioWF));
    socket.on('download', onDownload.bind(null, sioWF));

    // socket.on('readTreeJson',        onReadTreeJson.bind(null, sioWF));
    // socket.on('onGetFileStat',       onGetFileStat.bind(null, sioWF));
    // socket.on('writeTreeJson',       onWriteTreeJson.bind(null, sioWF));
    // socket.on('onGetJsonFile',       onGetJsonFile.bind(null, sioWF));
    // socket.on('onGetRemoteHostList', onGetRemoteHostList.bind(null, sioWF));
    // socket.on('onDeleteDirectory',   onDeleteDirectory.bind(null, sioWF));

  });
}
module.exports = setup;
