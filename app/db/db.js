const path = require('path');
const jsonArrayManager = require("./jsonArrayManager");

const config= require('./server.json');
const jobScheduler = require('./jobScheduler.json');

const userAccountFilename= path.resolve(__dirname, config.useraccount);
const remotehostFilename = path.resolve(__dirname, config.remotehost);
const projectListFilename = path.resolve(__dirname, config.projectList);

module.exports.interval = config.interval;
module.exports.admin = config.admin;
module.exports.port = config.port;
module.exports.extProject = config.extension.project;
module.exports.extWF= config.extension.workflow;
module.exports.extPS= config.extension.pstudy;
module.exports.extFor= config.extension.for;
module.exports.extWhile= config.extension.while;
module.exports.extForeach= config.extension.foreach;
module.exports.suffix= config.suffix;
module.exports.rootDir= config.rootDir;
module.exports.systemName= config.system_name;
module.exports.defaultFilename= config.default_filename;
module.exports.defaultCleanupRemoteRoot = config.defaultCleanupRemoteRoot;

module.exports.jobScheduler = jobScheduler;
module.exports.userAccount = new jsonArrayManager(userAccountFilename);
module.exports.remoteHost  = new jsonArrayManager(remotehostFilename);
module.exports.projectList = new jsonArrayManager(projectListFilename);

