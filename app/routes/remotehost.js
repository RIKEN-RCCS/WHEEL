'use strict';
const express = require('express');
const fs = require("fs");
const path = require("path");
const os = require("os");
const {promisify} = require("util");

const logger = require("../logger");
const fileBrowser = require("./fileBrowser");
const {remoteHost} = require('../db/db');
const {doAndEmit} = require('./utility');
const {canConnect} = require('./sshManager');

function sendFileList(sio, request){
  logger.debug(`current dir = ${request}`);
  const rootDir = config.rootDir;
  var target = request ? path.normalize(request) : rootDir || os.homedir() || '/';
  fileBrowser(sio, 'fileList', target, {
    "request": request,
    "withParentDir" : true
  });
}

module.exports = function(io){
  var sio=io.of('/remotehost');
  let doAndEmit = function(func, msg){
    func(msg).then(()=>{
      sio.emit('hostList', remoteHost.getAll());
    });
  }
  sio.on('connect', (socket) => {
    socket.on('getHostList', ()=>{
      socket.emit('hostList', remoteHost.getAll());
    });
    socket.on('addHost',    doAndEmit.bind(null, remoteHost.add.bind(remoteHost)));
    socket.on('removeHost', doAndEmit.bind(null, remoteHost.remove.bind(remoteHost)));
    socket.on('updateHost', doAndEmit.bind(null, remoteHost.update.bind(remoteHost)));
    socket.on('copyHost',   doAndEmit.bind(null, remoteHost.copy.bind(remoteHost)));
    socket.on('getFileList', sendFileList.bind(null, socket));
    socket.on('tryConnectHost', async (id, password, fn)=>{
      const hostInfo = remoteHost.get(id);
      canConnect(hostInfo, password)
        .then(()=>{
          fn(true);
        })
        .catch((err)=>{
          logger.error('connection failed\n',err);
          fn(false);
        })
    });
  });

  let router = express.Router();
  router.get('/', function (req, res, next) {
    res.sendFile(path.resolve(__dirname, '../views/remoteHost.html'));
  });
  return router;
}
