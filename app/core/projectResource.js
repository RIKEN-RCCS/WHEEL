"use strict";
const path = require("path");
const { promisify } = require("util");
const EventEmitter = require("events");
const fs = require("fs-extra");
const glob = require("glob");
const { gitResetHEAD } = require("./gitOperator");
const { taskStateFilter } = require("./taskUtil");
const Dispatcher = require("./dispatcher");
const orgGetLogger = require("../logSettings").getLogger;
const { defaultCleanupRemoteRoot, projectJsonFilename, componentJsonFilename } = require("../db/db");
const { readJsonGreedy } = require("./fileUtils");
const { getDateString } = require("../lib/utility");


async function rmfr(rootDir) {
  const srces = await promisify(glob)("*", { cwd: rootDir, ignore: "wheel.log" });

  //TODO should be optimized stride value(100);
  for (let i = 0; i < srces.length; i += 100) {
    const end = i + 100 < srces.length ? i + 100 : srces.length;
    const p = srces.slice(i, end).map((e)=>{
      return fs.remove(path.resolve(rootDir, e));
    });
    await Promise.all(p);
  }
}

class Project extends EventEmitter {
  constructor(projectRootDir) {
    super();
    this.projectRootDir = projectRootDir;
    this.cwd = null; //current working directory on client side!! TODO should be moved to cookie
    this.rootDispatcher = null; //dispatcher for root workflow
    this.ssh = new Map(); //ssh instances using in this project
    this.tasks = new Set(); //dispatched tasks
    this.updatedTasks = new Set(); //temporaly container which have only updated Tasks
    this.logger = orgGetLogger("workflow");
    this.logger.addContext("logFilename", path.join(projectRootDir, "wheel.log"));
    this.projectJsonFilename = path.resolve(this.projectRootDir, projectJsonFilename);
    this.rootWFFilename = path.resolve(this.projectRootDir, componentJsonFilename);
  }

  _removeSsh() {
    for (const ssh of this.ssh.values()) {
      ssh.disconnect();
    }
    this.ssh.clear();
  }

  async run() {
    if (this.rootDispatcher !== null) {
      //this project is already running
    }
    const projectJson = await readJsonGreedy(this.projectJsonFilename);
    const rootWF = await readJsonGreedy(this.rootWFFilename);

    this.rootDispatcher = new Dispatcher(this.projectRootDir,
      rootWF.ID,
      this.projectRootDir,
      getDateString(),
      getLogger(this.projectRootDir),
      projectJson.componentPath);

    if (rootWF.cleanupFlag === "2") {
      this.rootDispatcher.doCleanup = defaultCleanupRemoteRoot;
    }
    //TODO update projectJsonFile
    this.emit("projectStateChanged", "running");

    rootWF.state = await this.rootDispatcher.start();
    this.emit("projectStateChanged", rootWF.state);

    await fs.writeJson(this.rootWFFilename, rootWF, { spaces: 4, replacer: componentJsonReplacer });

    this.rootDispatcher = null;
    this._removeSsh();
  }

  async pause() {
  //TODO dispatcherから各ワークフローのstatusを取り出してファイルに書き込む必要あり
    this.rootDispatcher.pause();
    this._removeSsh();
    await cancelDispatchedTasks(this.projectRootDir);
    this.emit("projectStateChanged", "paused");
  }

  async clean() {
    this.rootDispatcher.remove();
    this._removeSsh();
    await cancelDispatchedTasks(this.projectRootDir);
    clearDispatchedTasks(projectRootDir);
    await rmfr(this.projectRootDir);
    await gitResetHEAD(this.projectRootDir);
    this.emit("projectStateChanged", "not-started");
  }
}

const projectDirs = new Map();

function getProject(projectRootDir) {
  if (!projectDirs.has(projectRootDir)) {
    projectDirs.set(projectRootDir, new Project(projectRootDir));
  }
  return projectDirs.get(projectRootDir);
}

function runProject(projectRootDir) {
  return getProject(projectRootDir).run();
}
function pauseProject(projectRootDir) {
  return getProject(projectRootDir).pause();
}
function claenProject(projectRootDir) {
  return getProject(projectRootDir).claen();
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

function off(projectRootDir, eventName, fn) {
  getProject(projectRootDir).removeListener(eventName, fn);
}

function getTasks(projectRootDir) {
  return getProject(projectRootDir).tasks;
}

function getNumberOfUpdatedTasks(projectRootDir) {
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
  off,
  getLogger,
  setSio
};
