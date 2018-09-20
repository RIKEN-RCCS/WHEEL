"use strict";
const path = require("path");
const JsonArrayManager = require("./jsonArrayManager");
const config = require("./server.json");
const jobScheduler = require("./jobScheduler.json");
const userAccountFilename = path.resolve(__dirname, config.useraccountJsonFile);
const remotehostFilename = path.resolve(__dirname, config.remotehostJsonFile);
const projectListFilename = path.resolve(__dirname, config.projectListJsonFile);

let jupyterToken;
let jupyterURL;
function setJupyterToken(token) {
  jupyterToken = token;
}
function getJupyterToken() {
  return jupyterToken;
}
function setJupyterURL(url) {
  jupyterURL = url;
}
function getJupyterURL() {
  return jupyterURL;
}
//export constants
module.exports.suffix = ".wheel";
module.exports.projectJsonFilename = "prj.wheel.json";
module.exports.componentJsonFilename = "cmp.wheel.json";

//export accessor to jupyter parameter
module.exports.setJupyterToken = setJupyterToken;
module.exports.getJupyterToken = getJupyterToken;
module.exports.setJupyterURL = setJupyterURL;
module.exports.getJupyterURL = getJupyterURL;

//re-export server settings
module.exports.interval = config.interval;
module.exports.admin = config.admin;
module.exports.port = config.port;
module.exports.rootDir = config.rootDir;
module.exports.defaultCleanupRemoteRoot = config.defaultCleanupRemoteRoot;
module.exports.saltRound = config.saltRound;
module.exports.jupyter = config.jupyter;
module.exports.jupyterPort = config.jupyterPort;

module.exports.jobScheduler = jobScheduler;
module.exports.userAccount = new JsonArrayManager(userAccountFilename);
module.exports.remoteHost = new JsonArrayManager(remotehostFilename);
module.exports.projectList = new JsonArrayManager(projectListFilename);
