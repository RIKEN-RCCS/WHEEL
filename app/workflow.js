const del = require("del");

const logger = require("./logger");
const socketioHelper_1 = require("./socketioHelper");
const fileBrowser_1 = require("./fileBrowser");

var sioNamespace = '/swf/workflow';

function setup(sio) {
sio.of(sioNamespace).on('connect', function (socket) {
    var uploader = new siofu();
    uploader.listen(socket);
    uploader.dir = os.homedir();
    uploader.on("saved", function (event) {
        logger.info(`upload completed ${event.file.pathName} [${event.file.size} Byte]`);
        fileBrowser_1.default(sio.of(sioNamespace), 'fileList', uploader.dir);
    });
    uploader.on("error", function (event) {
        logger.error(`Error from uploader ${event}`);
    });
    socket.on('fileListRequest', function (target) {
        logger.debug(`current dir = ${target}`);
        fileBrowser_1.default(sio.of(sioNamespace), 'fileList', target);
        uploader.dir = target;
    });
    socket.on('remove', function (target) {
        var parentDir = path.dirname(target);
        del(target, { force: true })
            .then(function () {
            fileBrowser_1.default(sio.of(sioNamespace), 'fileList', parentDir);
        })
            .catch(function (err) {
            logger.warn(`remove failed: ${err}`);
            logger.debug(`remove target: ${target}`);
        });
    });
    socket.on('rename', function (msg) {
        var data = JSON.parse(msg.toString());
        if (!(data.hasOwnProperty('oldName') && data.hasOwnProperty('newName') && data.hasOwnProperty('path'))) {
            logger.warn(`illegal request ${msg}`);
            return;
        }
        var oldName = path.resolve(data.path, data.oldName);
        var newName = path.resolve(data.path, data.newName);
        util.promisify(fs.rename)(oldName, newName)
            .then(function () {
            fileBrowser_1.default(sio.of(sioNamespace), 'fileList', data.path);
        })
            .catch(function (err) {
            logger.warn(`rename failed: ${err}`);
            logger.debug(`path:    ${data.path}`);
            logger.debug(`oldName: ${data.oldName}`);
            logger.debug(`newName: ${data.newName}`);
        });
    });
    socket.on('download', function (msg) {
        //TODO 
        logger.warn('download function is not implemented yet.');
    });
});
}
module.exports = setup;
