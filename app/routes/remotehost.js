'use strict';
const express = require('express');
const fs = require("fs");
const path = require("path");
const os = require("os");
const util = require("util");

const logger = require("../logger");
const fileBrowser = require("./fileBrowser");
const config = require('../config/server.json')
const jsonArrayManager = require("./jsonArrayManager");
const doAndEmit = require('./utility').doAndEmit;;

const sshConnection = require("../sshConnection");

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
    socket.on('hostListRequest', ()=>{
      socket.emit('hostList', remoteHost.getAll());
    });
    socket.on('addHost',    doAndEmit.bind(null, remoteHost.add.bind(remoteHost)));
    socket.on('removeHost', doAndEmit.bind(null, remoteHost.remove.bind(remoteHost)));
    socket.on('updateHost', doAndEmit.bind(null, remoteHost.update.bind(remoteHost)));
    socket.on('copyHost',   doAndEmit.bind(null, remoteHost.copy.bind(remoteHost)));

    socket.on('fileListRequest', sendFileList.bind(null, socket));
    socket.on('testSshConnection', (id, password, fn)=>{
      const host = remoteHost.get(id);
      sshConnection.sshConnectTest(host, password, (err) => {
        if (err) {
          logger.error(err);
          fn(false);
        } else {
          fn(true);
        }
      });
    });
  });

  let router = express.Router();
  router.get('/', function (req, res, next) {
    res.sendFile(path.resolve('app/views/remoteHost.html'));
  });
  return router;
}
