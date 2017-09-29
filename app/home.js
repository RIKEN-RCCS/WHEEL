"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");

const del = require("del");

const logger = require("./logger");
const fileBrowser = require("./fileBrowser");
const projectListManager = require("./projectListManager");
const projectManager = require("./projectManager");
const config = require('./config/server.json');

const noDotFiles = /^[^\.].*$/;
const ProjectJSON = new RegExp(`^.*${config.extension.project.replace(/\./g, '\\.')}$`);

var adaptorSendFiles = function (withFile, sio, msg) {
    var target = msg ? path.normalize(msg) : config.rootDir || os.homedir() || '/';
    fileBrowser(sio, 'fileList', target, true, withFile, true, { 'hide': noDotFiles, 'hideFile': ProjectJSON });
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
    })
        .then(function () {
        sio.emit('projectList', projectListManager.getAllProject());
    });
};
var onRename = function (sio, msg) {
    logger.debug(`rename: ${msg}`);
    var data = JSON.parse(msg.toString());
    if (!(data.hasOwnProperty('oldName') && data.hasOwnProperty('newName'))) {
        logger.warn(`illegal request ${msg}`);
        return;
    }
    projectListManager.rename(data.oldName, data.newName);
    sio.emit('projectList', projectListManager.getAllProject());
};
var onReorder = function (sio, msg) {
    logger.debug(`reorder: ${msg}`);
    var data = JSON.parse(msg);
    projectListManager.reorder(data);
    sio.emit('projectList', projectListManager.getAllProject());
};
function setup(sio) {
    var sioHome=sio.of('/home');
    sioHome.on('connect', (socket) => {
        socket.emit('projectList', projectListManager.getAllProject());
        socket.on('new',    adaptorSendFiles.bind(null, false, sioHome));
        socket.on('import', adaptorSendFiles.bind(null, true,  sioHome));
        socket.on('create', onCreate.bind(null, sioHome));
        socket.on('add',    onAdd.bind(null, sioHome));
        socket.on('remove', onRemove.bind(null, sioHome));
        socket.on('rename', onRename.bind(null, sioHome));
        socket.on('reorder', onReorder.bind(null, sioHome));
    });
}
module.exports = setup;
