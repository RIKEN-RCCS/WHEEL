const fs = require("fs");
const path = require("path");
const os = require("os");
const util = require("util");

const logger = require("./logger");
const fileBrowser = require("./fileBrowser");
const rootDir = require('./config/server.json').rootDir;
const configRemotehostFilename = require('./config/server.json').remotehost;
const remotehost = path.resolve('./app', configRemotehostFilename);
const { writeAndEmit } = require("./utility");


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

async function readRemoteHost(){
  let remoteHostList = await util.promisify(fs.readFile)(remotehost)
    .catch((err)=>{
      logger.error('remotehost list flie read error', err);
    });
  return JSON.parse(remoteHostList.toString());
}

/**
 * add new remote host info
 * @param {string} hostinfo.name - unique id string
 * @param {string} hostinfo.host - hostname of IP address
 * @param {string} hostinfo.path - work directory path on remote host
 * @param {string} hostinfo.usename - username on remote host
 * @param {string} [hostinfo.keyFile] - secret key file (to use password login instead, set null to this property)
 */
async function addHost (sio, hostinfo) {
  let remoteHostList = await readRemoteHost();
  if(hostinfo.name in remoteHostList ){
    logger.error(hostinfo.name, ' is already exists');
  }
  remoteHostList.push(hostinfo);
  writeAndEmit(remoteHostList, remotehost, sio, 'hostList');
}

/**
 * remove entry from remote host list
 * @param {string} name - id of target entry
 */
async function removeHost(sio, name){
  let remoteHostList = await readRemoteHost();
  remoteHostList=remoteHostList.filter((e)=>{
    return e.name !== name;
  });
  writeAndEmit(remoteHostList, remotehost, sio, 'hostList')
}

/**
 * update entry in remote host list
 * @param {string} hostinfo.name - unique id string
 * @param {string} [hostinfo.host] - hostname of IP address
 * @param {string} [hostinfo.path] - work directory path on remote host
 * @param {string} [hostinfo.usename] - username on remote host
 * @param {string} [hostinfo.keyFile] - secret key file (to use password login instead, set null to this property)
 */
async function updateHost(sio, hostinfo){
  if (! name in hostinfo){
    logger.error('illegal hostinfo parameter ', hostinfo);
  }
  let remoteHostList = await readRemoteHost();
  let targetIndex=remoteHostList.indexOf((e)=>{
    return e.name === hostinfo.name;
  });
  Object.assign(remoteHostList[targetIndex], hostinfo);
  writeAndEmit(remoteHostList, remotehost, sio, 'hostList');
}

/**
 * read and send remote host list
 * @param {Object} sio - socekt.io instance
 */
async function sendHostList(sio){
  logger.debug('recieve hostList Request');
  let remoteHostList = await readRemoteHost();
  console.log(remoteHostList);
  sio.emit('hostList', remoteHostList);
}

function setup(sio){
  var sioRemoteHost=sio.of('/remotehost');
  sioRemoteHost.on('connect', (socket) => {
    socket.on('addHost',    addHost.bind(null, sioRemoteHost));
    socket.on('removeHost', removeHost.bind(null, sioRemoteHost));
    socket.on('updateHost', updateHost.bind(null, sioRemoteHost));
    socket.on('fileListRequest', sendFileList.bind(null, sioRemoteHost));
    socket.on('hostListRequest', sendHostList.bind(null, sioRemoteHost));
    socket.on('testSshConnection', onSshConnection.bind(null, sioRemoteHost));
  });
}

module.exports = setup;
