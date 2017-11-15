'use strict';
const express = require('express');
let router = express.Router();
const fs = require("fs");
const path = require("path");
const os = require("os");
const util = require("util");

const logger = require("../logger");
const fileBrowser = require("../fileBrowser");

const config = require('../config/server.json')
const rootDir = config.rootDir;

const remotehostFilename = path.resolve('./app', config.remotehost);
const jsonArrayManager = require("../jsonArrayManager");

const ServerUtility = require("../serverUtility");
const sshConnection = require("../sshConnection");

function onSshConnection (sio, name, password, fn) {
  ServerUtility.getHostInfo((err, hostList) => {
    let result=false;
    if (err) {
      logger.error(err);
    }else if (!hostList) {
      logger.error('host list does not exist');
    } else{
      const host = hostList.filter(host => host.name === name)[0];
      if (!host) {
        logger.error(`${name} is not found at host list conf`);
      }else if (ServerUtility.isLocalHost(host.host)) {
        logger.info('skip ssh connection test to localhost');
        result=true;
      }else{
        sshConnection.sshConnectTest(host, password, (err) => {
          if (err) {
            logger.error(err);
          } else {
            result=true
          }
        });
      }
    }
    fn(result);
  });
};
function sendFileList(sio, request){
  logger.debug(`current dir = ${request}`);
  var target = request ? path.normalize(request) : rootDir || os.homedir() || '/';
  fileBrowser(sio, 'fileList', target, {
    "request": request,
    "withParentDir" : true
  });
}



module.exports = function(io){
  var sio=io.of('/remotehost');
  let remoteHost= new jsonArrayManager(remotehostFilename, sio, 'hostList');
  let doAndEmit = function(func, msg){
    func(msg).then(()=>{
      sio.emit('hostList', remoteHost.getAll());
    });
  }

  sio.on('connect', (socket) => {
    socket.on('hostListRequest', ()=>{
      sio.emit('hostList', remoteHost.getAll());
    });
    socket.on('addHost', doAndEmit.bind(null, remoteHost.add.bind(remoteHost)));
    socket.on('removeHost', doAndEmit.bind(null, remoteHost.remove.bind(remoteHost)));
    socket.on('updateHost', doAndEmit.bind(null, remoteHost.update.bind(remoteHost)));
    socket.on('copyHost', doAndEmit.bind(null, remoteHost.copy.bind(remoteHost)));

    socket.on('fileListRequest', sendFileList.bind(null, sio));
    socket.on('testSshConnection', onSshConnection.bind(null, sio));
  });

  router.get('/', function (req, res, next) {
    res.sendFile(path.resolve('app/views/remoteHost.html'));
  });
  return router
}
