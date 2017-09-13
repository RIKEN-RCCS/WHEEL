"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const os = require("os");
const path = require("path");
const del = require("del");
const logger = require("./logger");
const socketioHelper_1 = require("./socketioHelper");
const sendFiles_1 = require("./sendFiles");
const projectListManager = require("./projectListManager");
const projectManager = require("./projectManager");
const config = require('./config/server.json');
const noDotFiles = /^[^\.].*$/;
const ProjectJSON = new RegExp(`^.*${config.extension.project.replace(/\./g, '\\.')}$`);
var adaptorSendFiles = function (sio, withFile, msg) {
    var target = msg ? path.normalize(msg) : config.rootDir || os.homedir() || '/';
    sendFiles_1.default(sio, 'fileList', target, true, withFile, true, { 'hide': noDotFiles, 'hideFile': ProjectJSON });
};
var onCreate = function (sio, msg) {
    logger.debug("onCreate " + msg);
    var pathDirectory = msg;
    var label = path.basename(pathDirectory);
    projectManager.create(pathDirectory, label)
        .then(function (projectFileName) {
        projectListManager.add(label, path.resolve(pathDirectory, projectFileName));
        sio.emit('projectList', projectListManager.getAllProject());
    });
};
var onAdd = function (sio, msg) {
    logger.debug(`add: ${msg}`);
    var tmp = JSON.parse(fs.readFileSync(msg).toString());
    console.log(tmp.name);
    projectListManager.add(tmp.name, msg);
    sio.emit('projectList', projectListManager.getAllProject());
};
var onRemove = function (sio, msg) {
    logger.debug(`remove: ${msg}`);
    var target = projectListManager.getProject(msg);
    projectListManager.remove(msg);
    var targetDir = path.dirname(target.path);
    del(targetDir, { force: true }).catch(function () {
        logger.warn(`directory remove failed: ${targetDir}`);
    });
    sio.emit('projectList', projectListManager.getAllProject());
};
var onRename = function (sio, msg) {
    logger.debug(`rename: ${msg}`);
    var data = JSON.parse(msg);
    if (!(data.hasOwnProperty('oldLabel') && data.hasOenProperty('newLabel'))) {
        logger.warn(`illegal request ${msg}`);
        return;
    }
    projectListManager.rename(data.oldLabel, data.newLabel);
    sio.emit('projectList', projectListManager.getAllProject());
};
var onReorder = function (sio, msg) {
    logger.debug(`reorder: ${msg}`);
    var data = JSON.parse(msg);
    projectListManager.reorder(data);
    sio.emit('projectList', projectListManager.getAllProject());
};
function setup(sio) {
    sio.of('/home').on('connect', (socket) => {
        socket.emit('projectList', projectListManager.getAllProject());
    });
    socketioHelper_1.default(sio.of('/home'), 'new', adaptorSendFiles.bind(null, sio.of('/home'), false));
    socketioHelper_1.default(sio.of('/home'), 'import', adaptorSendFiles.bind(null, sio.of('/home'), true));
    socketioHelper_1.default(sio.of('/home'), 'create', onCreate.bind(null, sio.of('/home')));
    socketioHelper_1.default(sio.of('/home'), 'add', onAdd.bind(null, sio.of('/home')));
    socketioHelper_1.default(sio.of('/home'), 'remove', onRemove.bind(null, sio.of('/home')));
    socketioHelper_1.default(sio.of('/home'), 'rename', onRename.bind(null, sio.of('/home')));
    socketioHelper_1.default(sio.of('/home'), 'reorder', onReorder.bind(null, sio.of('/home')));
}
exports.setup = setup;
//# sourceMappingURL=home_beta.js.map