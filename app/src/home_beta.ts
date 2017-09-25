import fs = require('fs');
import os = require('os');
import path=require('path');
import del=require('del');

import logger = require('./logger');
import sioHelper from './socketioHelper';
import fileBrowser from './fileBrowser';
import * as projectListManager from './projectListManager';
import * as projectManager from './projectManager';

const config=require('./config/server.json');

const noDotFiles= /^[^\.].*$/;
const ProjectJSON = new RegExp(`^.*${config.extension.project.replace(/\./g, '\\.')}$`);

 var adaptorSendFiles=function(sio: SocketIO.Server, withFile: boolean, msg: string){
  var target=msg ? path.normalize(msg) : config.rootDir||os.homedir()||'/';
  fileBrowser(sio, 'fileList', target, true, withFile, true, {'hide': noDotFiles, 'hideFile': ProjectJSON});
 }

 var onCreate=function(sio: SocketIO.Server, msg: string){
  logger.debug("onCreate "+msg);
  var pathDirectory=msg;
  var label=path.basename(pathDirectory);
  projectManager.create(pathDirectory, label)
  .then(function(projectFileName){
    projectListManager.add(label, path.resolve(pathDirectory, projectFileName));
    sio.emit('projectList', projectListManager.getAllProject());
  });
 }

 var onAdd=function(sio: SocketIO.Server, msg: string){
  logger.debug(`add: ${msg}`);
  var tmp = JSON.parse(fs.readFileSync(msg).toString());
  projectListManager.add(tmp.name, msg);
  sio.emit('projectList', projectListManager.getAllProject());
 }

var onRemove=function(sio: SocketIO.Server, msg: string){
  logger.debug(`remove: ${msg}`);
  var target=projectListManager.getProject(msg);
  projectListManager.remove(msg)

  var targetDir=path.dirname(target.path);
  del(targetDir,{force: true}).catch(function(){
    logger.warn(`directory remove failed: ${targetDir}`);
  })
  .then(function(){
    sio.emit('projectList', projectListManager.getAllProject());
  });
}

var onRename=function(sio: SocketIO.Server, msg: string){
  logger.debug(`rename: ${msg}`);
  var data=JSON.parse(msg.toString());
  if(! (data.hasOwnProperty('oldName') && data.hasOwnProperty('newName'))){
    logger.warn(`illegal request ${msg}`);
    return;
  }
  projectListManager.rename(data.oldName, data.newName)
  sio.emit('projectList', projectListManager.getAllProject());
}

var onReorder=function(sio: SocketIO.Server, msg: string){
  logger.debug(`reorder: ${msg}`);
  var data=JSON.parse(msg);

  projectListManager.reorder(data)
  sio.emit('projectList', projectListManager.getAllProject());
}

export function setup(sio: SocketIO.Server) {
    sio.of('/home').on('connect', (socket: SocketIO.Socket)=>{
      socket.emit('projectList', projectListManager.getAllProject());
    });
    sioHelper(sio.of('/home'), 'new',     adaptorSendFiles.bind(null, sio.of('/home'), false));
    sioHelper(sio.of('/home'), 'import',  adaptorSendFiles.bind(null, sio.of('/home'), true));
    sioHelper(sio.of('/home'), 'create',  onCreate.bind(null,sio.of('/home')));
    sioHelper(sio.of('/home'), 'add',     onAdd.bind(null, sio.of('/home')));
    sioHelper(sio.of('/home'), 'remove',  onRemove.bind(null,sio.of('/home')));
    sioHelper(sio.of('/home'), 'rename',  onRename.bind(null,sio.of('/home')));
    sioHelper(sio.of('/home'), 'reorder', onReorder.bind(null,sio.of('/home')));
}
