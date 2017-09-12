import fs = require('fs');
import os = require('os');
import path=require('path');

import logger = require('./logger');
import sioHelper from './socketioHelper';
import sendFiles from './sendFiles';
import * as projectListManager from './projectListManager';
import * as projectManager from './projectManager';

const config=require('./config/server.json');

const noDotFiles= /^[^\.].*$/;
const ProjectJSON = new RegExp(`^.*${config.extension.project.replace(/\./g, '\\.')}$`);

 var adaptorSendFiles=function(sio: SocketIO.Server, withFile: boolean, msg: string){
  var target=msg ? path.normalize(msg) : config.rootDir||os.homedir()||'/';
  sendFiles(sio, 'fileList', target, true, withFile, true, {'hide': noDotFiles, 'hideFile': ProjectJSON});
 }

 var onCreate=function(sio: SocketIO.Server, msg: string){
  logger.debug("onCreate"+msg);
  var pathDirectory=msg;
  projectManager.create(pathDirectory);
  var label=path.basename(pathDirectory);
  projectListManager.add(label, pathDirectory);
  //TODO prj.jsonのnameをlabelで書き換える
  sio.emit('projectList', projectListManager.getAllProject());
 }

 var onAdd=function(sio: SocketIO.Server, msg: string){
  logger.debug(`add: ${msg}`);
  var tmp = JSON.parse(fs.readFileSync(msg).toString());
  console.log(tmp.name);
  projectListManager.add(tmp.name, msg);
  sio.emit('projectList', projectListManager.getAllProject());
 }

var onRemove=function(sio: SocketIO.Server, msg: string){
  logger.debug(`remove: ${msg}`);
  projectListManager.remove(msg)
  sio.emit('projectList', projectListManager.getAllProject());
}

var onRename=function(sio: SocketIO.Server, msg: string){
  logger.debug(`rename: ${msg}`);
  var data=JSON.parse(msg);
  if(! (data.hasOwnProperty('oldLabel') && data.hasOenProperty('newLabel'))){
    logger.warn(`illegal request ${msg}`);
    return;
  }
  projectListManager.rename(data.oldLabel, data.newLabel)
  sio.emit('projectList', projectListManager.getAllProject());
}

var onReorder=function(sio: SocketIO.Server, msg: string){
  logger.debug(`reorder: ${msg}`);
  var data=JSON.parse(msg);

  projectListManager.reorder(data)
  sio.emit('projectList', projectListManager.getAllProject());
}

/*
 * helper function for socketio.on()
 * @param sio       socket.io's namespace
 * @param eventName event name
 * @param callback  callback function
 *
 */
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
