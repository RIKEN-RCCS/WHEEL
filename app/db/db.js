"use strict";
const path = require("path");
const JsonArrayManager = require("./jsonArrayManager");

const config = require("./server.json");
const jobScheduler = require("./jobScheduler.json");

const userAccountFilename = path.resolve(__dirname, config.useraccountJsonFile);
const remotehostFilename = path.resolve(__dirname, config.remotehostJsonFile);
const projectListFilename = path.resolve(__dirname, config.projectListJsonFile);

// export constants
module.exports.suffix = ".wheel";
module.exports.projectJsonFilename = "prj.wheel.json";
module.exports.componentJsonFilename = "cmp.wheel.json";

// re-export server settings
module.exports.interval = config.interval;
module.exports.admin = config.admin;
module.exports.port = config.port;
module.exports.rootDir = config.rootDir;
module.exports.defaultCleanupRemoteRoot = config.defaultCleanupRemoteRoot;
module.exports.saltRound = config.saltRound;

module.exports.jobScheduler = jobScheduler;
module.exports.userAccount = new JsonArrayManager(userAccountFilename);
module.exports.remoteHost = new JsonArrayManager(remotehostFilename);
module.exports.projectList = new JsonArrayManager(projectListFilename);
