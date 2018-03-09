'use strict';
const express = require('express');
const fs = require("fs");
const path = require("path");
const os = require("os");
const {promisify} = require("util");

const {getLogger} = require('../logSettings');
const logger = getLogger('remotehost');
const fileBrowser = require("./fileBrowser");
const {remoteHost, rootDir} = require('../db/db');
const {doAndEmit} = require('./utility');
const {getSsh, canConnect} = require('./sshManager');

function sendFileList(sio, request){
  logger.debug(`current dir = ${request}`);
  var target = request ? path.normalize(request) : rootDir || os.homedir() || '/';
  fileBrowser(sio, 'fileList', target, {
    "request": request,
    "withParentDir" : true
  });
}

async function trySshConnection(hostInfo, password, cb){
  const ssh = getSsh({host: hostInfo.host, username: hostInfo.username});
  await ssh.disconnect();
  canConnect(hostInfo, password)
    .then(()=>{
      cb(true);
    })
    .catch((err)=>{
      logger.error('connection failed',err);
      cb(false);
    })
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
    socket.on('tryConnectHost', trySshConnection.bind(null));
    socket.on('tryConnectHostById', (id, password, cb)=>{
      const hostInfo = remoteHost.get(id);
      trySshConnection(hostInfo, password, cb);
    });
  });

  let router = express.Router();
  router.get('/', function (req, res, next) {
    res.sendFile(path.resolve(__dirname, '../views/remoteHost.html'));
  });
  return router;
}
