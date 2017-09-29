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
});
}
module.exports = setup;
