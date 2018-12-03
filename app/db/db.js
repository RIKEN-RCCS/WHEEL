"use strict";
const path = require("path");
const JsonArrayManager = require("./jsonArrayManager");
const config = require("./server.json");
const jobScheduler = require("./jobScheduler.json");
const userAccountFilename = path.resolve(__dirname, config.useraccountJsonFile);
const remotehostFilename = path.resolve(__dirname, config.remotehostJsonFile);
const projectListFilename = path.resolve(__dirname, config.projectListJsonFile);

let jupyterToken;
let actualJupyterPortNumber;
function setJupyterToken(token) {
  jupyterToken = token;
}
function getJupyterToken() {
  return jupyterToken;
}
function setJupyterPort(port) {
  actualJupyterPortNumber = port;
}
function getJupyterPort() {
  return actualJupyterPortNumber;
}
//export constants
module.exports.suffix = ".wheel";
module.exports.projectJsonFilename = "prj.wheel.json";
module.exports.componentJsonFilename = "cmp.wheel.json";

//export accessor to jupyter parameter
module.exports.setJupyterToken = setJupyterToken;
module.exports.getJupyterToken = getJupyterToken;
module.exports.setJupyterPort = setJupyterPort;
module.exports.getJupyterPort = getJupyterPort;

//re-export server settings
module.exports.interval = config.interval;
module.exports.admin = config.admin;
module.exports.port = config.port;
module.exports.rootDir = config.rootDir;
module.exports.defaultCleanupRemoteRoot = config.defaultCleanupRemoteRoot;
module.exports.saltRound = config.saltRound;
module.exports.jupyter = config.jupyter;
module.exports.jupyterPort = config.jupyterPort;
module.exports.logFilename     =config.logFilename
module.exports.numLogFiles     =config.numLogFiles
module.exports.maxLogSize      =config.maxLogSize
module.exports.compressLogFile =config.compressLogFile



module.exports.jobScheduler = jobScheduler;
module.exports.userAccount = new JsonArrayManager(userAccountFilename);
module.exports.remoteHost = new JsonArrayManager(remotehostFilename);
module.exports.projectList = new JsonArrayManager(projectListFilename);
