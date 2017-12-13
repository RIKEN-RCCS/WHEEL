'use strict';
const express = require('express');
const fs = require("fs");
const path = require("path");
const os = require("os");
const {promisify} = require("util");

const logger = require("../logger");
const fileBrowser = require("./fileBrowser");
const config = require('../config/server.json')
const jsonArrayManager = require("./jsonArrayManager");
const {doAndEmit, readPrivateKey} = require('./utility');
const getSsh = require('./sshManager');

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
  const remotehostFilename = path.resolve('./app', config.remotehost);
  let remoteHost= new jsonArrayManager(remotehostFilename);

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
      let config={
        host: hostInfo.host,
        port: hostInfo.port,
        username: hostInfo.username
      }
      debugger;
      await readPrivateKey(hostInfo.keyFile, config, password)
        .catch((err)=>{
          logger.error('private key read failed', err);
          fn(false);
          return
        });

      let arssh = getSsh(config, {connectionRetryDelay: 100});
      arssh.canConnect()
        .then((rt)=>{
          fn(true);
        })
        .catch((err)=>{
          logger.error('connection failed');
          if(config.hasOwnProperty('privateKey')) config.privateKey='privateKey was defined but omitted'
          if(config.hasOwnProperty('password')) config.password='password  was defined but omitted'
          if(config.hasOwnProperty('passphrase')) config.passphrase='passphrase  was defined but omitted'
          logger.error('config:',config);
          logger.error('err:',err);
          fn(false);
        });
    });
  });

  let router = express.Router();
  router.get('/', function (req, res, next) {
    res.sendFile(path.resolve(__dirname, '../views/remoteHost.html'));
  });
  return router;
}
