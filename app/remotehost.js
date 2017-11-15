'use strict';
const fs = require("fs");
const path = require("path");
const os = require("os");
const util = require("util");

const logger = require("./logger");
const fileBrowser = require("./fileBrowser");

const config = require('./config/server.json')
const rootDir = config.rootDir;

const remotehostFilename = path.resolve('./app', config.remotehost);
const { writeAndEmit } = require("./utility");

const jsonArrayManager = require("./jsonArrayManager");

const ServerUtility = require("./serverUtility");
const sshConnection = require("./sshConnection");

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

/**
 * add new remote host info
 * @param {Object} hostinfo         - remote host information object
 * @param {string} hostinfo.name    - label of host info
 * @param {string} hostinfo.id      - unique id string
 * @param {string} hostinfo.host    - hostname of IP address
 * @param {string} hostinfo.path    - work directory path on remote host
 * @param {string} hostinfo.usename - username on remote host
 * @param {string} hostinfo.keyFile - secret key file (to use password login, set null to this property)
 */

function setup(sio2){
  var sio=sio2.of('/remotehost');
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
}

module.exports = setup;
