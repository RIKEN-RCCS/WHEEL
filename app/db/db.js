const path = require("path");
const jsonArrayManager = require("./jsonArrayManager");

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
module.exports.userAccount = new jsonArrayManager(userAccountFilename);
module.exports.remoteHost = new jsonArrayManager(remotehostFilename);
module.exports.projectList = new jsonArrayManager(projectListFilename);
