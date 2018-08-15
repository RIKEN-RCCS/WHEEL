'use strict';
const express = require('express');
const path = require("path");
const os = require("os");
const ARsshClient = require('arssh2-client');

const {getLogger} = require('../logSettings');
const logger = getLogger('remotehost');
const fileBrowser = require("./fileBrowser");
const {remoteHost, rootDir} = require('../db/db');
const {createSshConfig} = require('./utility');

async function sendFileList(sio, request){
  logger.debug(`current dir = ${request}`);
  var target = request ? path.normalize(request) : rootDir || os.homedir() || '/';
  const result = await fileBrowser(target, {
    "request": request,
    "withParentDir" : true
  });
  sio.emit("fileList", result);
}

async function trySshConnectionWrapper(hostInfo, password, cb){
  const config = await createSshConfig(hostInfo, password);
  config.readyTimeout = 1000;//TODO remotehost画面でホスト毎に別の値を入力できるようにする
  const arssh = new ARsshClient(config, {connectionRetry: 1, connectionRetryDelay: 2000});
  logger.debug('try to connect', config.host,':',config.port);
  arssh.canConnect()
    .then(()=>{
      cb(true);
    })
    .catch((err)=>{
      err.config = Object.assign({}, config);
      if(err.config.hasOwnProperty('privateKey')) err.config.privateKey='privateKey was defined but omitted'
      if(err.config.hasOwnProperty('password'))   err.config.password='password  was defined but omitted'
      if(err.config.hasOwnProperty('passphrase')) err.config.passphrase='passphrase  was defined but omitted'
      cb(false);
      logger.error(err);
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
    socket.on('tryConnectHost', trySshConnectionWrapper.bind(null));
    socket.on('tryConnectHostById', async (id, password, cb)=>{
      const hostInfo = remoteHost.get(id);
      await trySshConnectionWrapper(hostInfo, password, cb);
    });
  });

  let router = express.Router();
  router.get('/', function (req, res) {
    res.sendFile(path.resolve(__dirname, '../views/remotehost.html'));
  });
  return router;
}
