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

var removeTrailingPathSep = function (filename){
  if(filename.endsWith(path.sep)){
    return removeTrailingPathSep(filename.slice(0,-1));
  }
  return filename;
}

var renameAsync=function(oldPath, newPath){
  return new Promise(function(resolve, reject){
    fs.rename(oldPath, newPath, function(err){
      if(err) reject(err);
      resolve(newPath);
    });
  });
}

var fixProjectDirectory = function(projectJsonFilepath){
    return util.promisify(fs.readFile)(projectJsonFilepath)
      .then(function(data){
        var tmp = JSON.parse(data.toString());
        return tmp.name;
      })
      .then(function(projectName){
        var projectRootDir=path.dirname(projectJsonFilepath);
        var dirName=path.basename(projectRootDir);
        var parentDir=path.dirname(projectRootDir);
        var expectedDirName=projectName+config.suffix;
        return renameAsync(path.resolve(parentDir,dirName), path.resolve(parentDir,expectedDirName));
      });
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
      return projectListManager.add(projectFileName);
    })
    .then(function(projectList){
      sio.emit('projectList', projectList);
    })
    .catch(function(err){
      logger.error('create project failed');
      logger.error('reason: ',err);
    });
};
var onAdd = function (sio, projectJsonFilepath) {
    logger.debug('add: ',projectJsonFilepath);
    fixProjectDirectory(projectJsonFilepath)
      .then(function(newProjectDirectory){
        var filename=path.basename(projectJsonFilepath);
        return projectListManager.add(path.resolve(newProjectDirectory, filename));
      })
      .then(function(projectList){
        sio.emit('projectList', projectList);
      })
      .catch(function(err){
        logger.error('import project failed');
        logger.error('reason: ',err);
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
      return projectListManager.remove(msg)
    })
    .then(function(projectList){
      sio.emit('projectList', projectList);
    })
    .catch(function(err){
      logger.error('remove project failed');
      logger.error('reason: ',err);
    });
};
var onRename = function (sio, msg) {
    logger.debug('rename:', msg);
    if (!(msg.hasOwnProperty('id') && msg.hasOwnProperty('newName')&& msg.hasOwnProperty('path'))) {
        logger.warn('illegal request ',msg);
        return;
    }
    var projectJsonFilepath=msg.path;
    projectManager.rename(projectJsonFilepath, msg.newName)
      .then(function(){
        return fixProjectDirectory(projectJsonFilepath)
      })
      .then(function(newProjectDirectory){
        var filename=path.basename(projectJsonFilepath);
        return projectListManager.rename(msg.id, path.resolve(newProjectDirectory, filename));
      })
      .then(function(results){
        sio.emit('projectList', results);
      })
      .catch(function(err){
        logger.error('rename project failed');
        logger.error('reason: ',err);
      });
};
var onReorder = function (sio, orderList) {
    logger.debug('reorder: ',orderList);
    projectListManager.reorder(orderList)
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
