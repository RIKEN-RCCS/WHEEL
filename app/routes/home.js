"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const util = require('util');

let express = require('express');
const del = require("del");

const logger = require("../logger");
const fileBrowser = require("./fileBrowser");
const projectListManager = require("./projectListManager");
const projectManager = require("./projectManager");
const config = require('../config/server.json');

const escape = require('./utility').escapeRegExp;;
const noDotFiles = /^[^\.].*$/;
const ProjectJSON = new RegExp(`^.*${escape(config.extension.project)}$`);
const noWheelDir = new RegExp(`^(?!^.*${escape(config.suffix)}$).*$`);

let adaptorSendFiles = function (withFile, dirFilter, sio, msg) {
    const target = msg ? path.normalize(msg) : config.rootDir || os.homedir() || '/';
    const request = msg || target;
    fileBrowser(sio, 'fileList', target, {
      "request": request,
      "sendFilename"  : withFile,
      "filter"        : {
        "all": noDotFiles,
        "file": ProjectJSON,
        "dir": dirFilter
      },
      "withParentDir" : true
    });
};

let removeTrailingPathSep = function (filename){
  if(filename.endsWith(path.sep)){
    return removeTrailingPathSep(filename.slice(0,-1));
  }
  return filename;
}

let renameAsync=function(oldPath, newPath){
  return new Promise(function(resolve, reject){
    fs.rename(oldPath, newPath, function(err){
      if(err) reject(err);
      resolve(newPath);
    });
  });
}

let fixProjectDirectory = function(projectJsonFilepath){
    return util.promisify(fs.readFile)(projectJsonFilepath)
      .then(function(data){
        const tmp = JSON.parse(data.toString());
        return tmp.name;
      })
      .then(function(projectName){
        const projectRootDir=path.dirname(projectJsonFilepath);
        const dirName=path.basename(projectRootDir);
        const parentDir=path.dirname(projectRootDir);
        const expectedDirName=projectName+config.suffix;
        return renameAsync(path.resolve(parentDir,dirName), path.resolve(parentDir,expectedDirName));
      });
}

let onAdd = function (sio, msg) {
    logger.debug("onAdd", msg);
    let pathDirectory = removeTrailingPathSep(msg);
    if(!pathDirectory.endsWith(config.suffix)){
      pathDirectory += config.suffix;
    }
    let projectName = path.basename(pathDirectory.slice(0,-config.suffix.length));
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
let onImport= function (sio, projectJsonFilepath) {
    logger.debug('import: ',projectJsonFilepath);
    fixProjectDirectory(projectJsonFilepath)
      .then(function(newProjectDirectory){
        const filename=path.basename(projectJsonFilepath);
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
let onRemove = function (sio, msg) {
    logger.debug('remove: ',msg);
    const target = projectListManager.getProject(msg);
    const targetDir = path.dirname(target.path);
    del(targetDir, { force: true }).catch(function () {
        logger.warn('directory remove failed: ', targetDir);
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
let onRename = function (sio, msg) {
    logger.debug('rename:', msg);
    if (!(msg.hasOwnProperty('id') && msg.hasOwnProperty('newName')&& msg.hasOwnProperty('path'))) {
        logger.warn('illegal request ',msg);
        return;
    }
    const projectJsonFilepath=msg.path;
    projectManager.rename(projectJsonFilepath, msg.newName)
      .then(function(){
        return fixProjectDirectory(projectJsonFilepath)
      })
      .then(function(newProjectDirectory){
        const filename=path.basename(projectJsonFilepath);
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

let onGetProjectList = function(sio){
    projectListManager.getAllProject()
    .then((results)=>{
      sio.emit('projectList', results);
    });
}

module.exports = function(io){
  let sio=io.of('/home');
  sio.on('connect', (socket) => {
    socket.on('getProjectList', onGetProjectList.bind(null, socket));
    socket.on('getDirList',     adaptorSendFiles.bind(null, false, noWheelDir, socket));
    socket.on('getDirListAndProjectJson', adaptorSendFiles.bind(null, true,  null, socket));
    socket.on('addProject',     onAdd.bind(null, socket));
    socket.on('importProject',  onImport.bind(null, socket));
    socket.on('removeProject',  onRemove.bind(null, socket));
    socket.on('renameProject',  onRename.bind(null, socket));
    socket.on('reorderProject', onReorder.bind(null, socket));
  });
  const router = express.Router();
  router.get('/', function (req, res, next) {
    res.sendFile(path.join(__dirname, '../views/home.html'));
  });
  return router;
}
