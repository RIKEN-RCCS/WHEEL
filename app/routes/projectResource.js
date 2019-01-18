"use strict";
const path = require("path");
const { promisify } = require("util");
const EventEmitter = require("events");
const fs = require("fs-extra");
const glob = require("glob");
const { gitResetHEAD } = require("../core/gitOperator");
const { taskStateFilter } = require("./taskUtil");
const orgGetLogger = require("../logSettings").getLogger;


class Project extends EventEmitter {
  constructor(projectRootDir) {
    super();
    this.cwd = null; //current working directory
    this.rootDispatcher = null; //dispatcher for root workflow
    this.ssh = new Map(); //ssh instances using in this project
    this.tasks = new Set(); //dispatched tasks
    this.updatedTasks = new Set(); //temporaly container which have only updated Tasks
    this.logger = orgGetLogger("workflow");
    this.logger.addContext("logFilename", path.join(projectRootDir, "wheel.log"));
  }
}

const projectDirs = new Map();

function getProject(projectRootDir) {
  if (!projectDirs.has(projectRootDir)) {
    projectDirs.set(projectRootDir, new Project(projectRootDir));
  }
  return projectDirs.get(projectRootDir);
}

function openProject(projectRootDir) {
  setCwd(projectRootDir, projectRootDir);
}

function setCwd(projectRootDir, currentDir) {
  const pj = getProject(projectRootDir);
  pj.cwd = currentDir;
}

function getCwd(projectRootDir) {
  return getProject(projectRootDir).cwd;
}

async function cleanProject(projectRootDir) {
  const rootDir = projectRootDir;
  const srces = await promisify(glob)("*", { cwd: rootDir, ignore: "wheel.log" });

  //TODO should be optimized stride value(100);
  for (let i = 0; i < srces.length; i += 100) {
    const end = i + 100 < srces.length ? i + 100 : srces.length;
    const p = srces.slice(i, end).map((e)=>{
      return fs.remove(path.resolve(rootDir, e));
    });
    await Promise.all(p);
  }
  return gitResetHEAD(projectRootDir);
}

/**
 * disconnect and remove all ssh instance
 */
function removeSsh(projectRootDir) {
  const pj = getProject(projectRootDir);

  for (const ssh of pj.ssh.values()) {
    ssh.disconnect();
  }
  pj.ssh.clear();
}

function setRootDispatcher(projectRootDir, dispatcher) {
  getProject(projectRootDir).rootDispatcher = dispatcher;
}

function deleteRootDispatcher(projectRootDir) {
  delete getProject(projectRootDir).rootDispatcher;
}

function getRootDispatcher(projectRootDir) {
  return getProject(projectRootDir).rootDispatcher;
}

function getSsh(projectRootDir, hostname) {
  return getProject(projectRootDir).ssh.get(hostname);
}

function addSsh(projectRootDir, hostname, ssh) {
  getProject(projectRootDir).ssh.set(hostname, ssh);
}

function once(projectRootDir, eventName, cb) {
  const pj = getProject(projectRootDir);
  if (pj.listenerCount(eventName) === 0) {
    pj.once(eventName, cb);
  }
}

function emitEvent(projectRootDir, eventName) {
  getProject(projectRootDir).emit(eventName);
}

function removeListener(projectRootDir, eventName, fn) {
  getProject(projectRootDir).removeListener(eventName, fn);
}

function getTasks(projectRootDir) {
  return getProject(projectRootDir).tasks;
}

function getNumberOfUpdatedTasks(projectRootDir){
  return getProject(projectRootDir).updatedTasks.size;
}
function getUpdatedTaskStateList(projectRootDir) {
  const updatedTaskStateList = [...getProject(projectRootDir).updatedTasks].map(taskStateFilter);
  getProject(projectRootDir).updatedTasks.clear();
  return updatedTaskStateList;
}

function clearDispatchedTasks(projectRootDir) {
  getProject(projectRootDir).tasks.clear();
}

function addDispatchedTask(projectRootDir, task) {
  getProject(projectRootDir).tasks.add(task);
}

function addUpdatedTask(projectRootDir, task) {
  getProject(projectRootDir).updatedTasks.add(task);
}

function getLogger(projectRootDir) {
  return getProject(projectRootDir).logger;
}

function setSio(projectRootDir, sio) {
  getProject(projectRootDir).logger.addContext("sio", sio);
}

module.exports = {
  openProject,
  setCwd,
  getCwd,
  setRootDispatcher,
  getRootDispatcher,
  deleteRootDispatcher,
  addDispatchedTask,
  addUpdatedTask,
  clearDispatchedTasks,
  getTasks,
  getNumberOfUpdatedTasks,
  getUpdatedTaskStateList,
  addSsh,
  getSsh,
  removeSsh,
  cleanProject,
  emitEvent,
  once,
  removeListener,
  getLogger,
  setSio
};
