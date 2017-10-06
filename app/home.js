"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const util = require('util');

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
function removeTrailingPathSep(filename){
  if(filename.endsWith(path.sep)){
    return removeTrailingPathSep(filename.slice(0,-1));
  }
  return filename;
}
var onCreate = function (sio, msg) {
    logger.debug("onCreate " + msg);
    var pathDirectory = removeTrailingPathSep(msg);
    if(!pathDirectory.endsWith(config.suffix)){
      pathDirectory += config.suffix;
    }
    var projectName = path.basename(pathDirectory.slice(0,-config.suffix.length));
    projectManager.create(pathDirectory, projectName)
      .then(function (projectFileName) {
        projectListManager.add(projectFileName);
    })
    .then(function(){
        projectListManager.getAllProject().then(function(results){
          sio.emit('projectList', results);
        });
    })
    .catch(function(err){
        logger.error('project creation failed');
        logger.error('reason: ',err);
      });
};
var onAdd = function (sio, projectJsonFilepath) {
    logger.debug('add: ',projectJsonFilepath);
    util.promisify(fs.readFile)(projectJsonFilepath)
    .then(function(data){
      var tmp = JSON.parse(data.toString());
      return tmp.name;
    })
    .then(function(projectName){
      var projectRootDir=path.dirname(projectJsonFilepath);
      var dirName=path.basename(projectRootDir);
      var expectedDirName=projectName+config.suffix;
      logger.debug('dirName        : ', dirName);
      logger.debug('expectedDirName: ', expectedDirName);
      if(dirName !== expectedDirName){
        logger.debug('rename project directory!');
        var parentDir=path.dirname(projectRootDir);
        util.promisify(fs.rename)(path.resolve(parentDir,dirName), path.resolve(parentDir,expectedDirName))
          .then(function(){
            var filename=path.basename(projectJsonFilepath);
            projectJsonFilepath=path.resolve(parentDir, expectedDirName, filename);
          });
      }
      logger.debug('projectJsonFilepath: ', projectJsonFilepath);
      projectListManager.add(projectJsonFilepath)
      .then(function(results){
        sio.emit('projectList', results);
      });
    });
};
var onRemove = function (sio, msg) {
    logger.debug(`remove: ${msg}`);
    var target = projectListManager.getProject(msg);
    var targetDir = path.dirname(target.path);
    del(targetDir, { force: true }).catch(function () {
        logger.warn(`directory remove failed: ${targetDir}`);
    })
    .then(function () {
      projectListManager.remove(msg)
      .then(function(results){
        sio.emit('projectList', results);
      });
    });
};
var onRename = function (sio, msg) {
    logger.debug(`rename: ${msg}`);
    if (!(msg.hasOwnProperty('oldName') && msg.hasOwnProperty('newName'))) {
        logger.warn(`illegal request ${msg}`);
        return;
    }
    projectListManager.rename(msg.oldName, msg.newName)
    .then(function(results){
      sio.emit('projectList', results);
    });
};
var onReorder = function (sio, msg) {
    logger.debug(`reorder: ${msg}`);
    var data = JSON.parse(msg);
    projectListManager.reorder(data)
    .then(function(results){
      sio.emit('projectList', results);
    });
};
function setup(sio) {
    var sioHome=sio.of('/home');
    sioHome.on('connect', (socket) => {
        projectListManager.getAllProject().then(function(results){
          socket.emit('projectList', results);
        });
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
