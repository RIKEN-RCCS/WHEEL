"use strict";
const path = require("path");
const { promisify } = require("util");
const EventEmitter = require("events");
const fs = require("fs-extra");
const glob = require("glob");
const { destroy } = require("abc4");
const { gitCommit, gitResetHEAD } = require("./gitOperator");
const { taskStateFilter, cancelDispatchedTasks } = require("./taskUtil");
const orgGetLogger = require("../logSettings").getLogger;
const { defaultCleanupRemoteRoot, projectJsonFilename, componentJsonFilename } = require("../db/db");
const { readJsonGreedy } = require("./fileUtils");
const { getDateString } = require("../lib/utility");
const { validateComponents, componentJsonReplacer } = require("./componentFilesOperator");
const Dispatcher = require("./dispatcher");
const { removeSsh } = require("./sshManager");


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
    this.clusters = new Set(); //clusters using in this project
    this.tasks = new Set(); //dispatched tasks
    this.updatedTasks = new Set(); //temporaly container which have only updated Tasks
    this.logger = orgGetLogger("workflow");
    this.logger.addContext("logFilename", path.join(projectRootDir, "wheel.log"));
    this.projectJsonFilename = path.resolve(this.projectRootDir, projectJsonFilename);
    this.rootWFFilename = path.resolve(this.projectRootDir, componentJsonFilename);

    this.on("taskDispatched", (task)=>{
      this.tasks.add(task);
    });
    this.on("taskUpdated", (task)=>{
      this.updatedTasks.add(task);
    });
  }

  async updateProjectState(state, projectJson) {
    if (!projectJson) {
      projectJson = await readJsonGreedy(this.projectJsonFilename);
    }
    projectJson.state = state;
    projectJson.mtime = getDateString(true);
    this.emit("projectStateChanged", projectJson);
    return fs.writeJson(this.projectJsonFilename, projectJson, { spaces: 4 });
  }

  async run() {
    if (this.rootDispatcher !== null) {
      return new Error("this project is already running");
    }
    const projectJson = await readJsonGreedy(this.projectJsonFilename);
    const rootWF = await readJsonGreedy(this.rootWFFilename);

    this.rootDispatcher = new Dispatcher(this.projectRootDir,
      rootWF.ID,
      this.projectRootDir,
      getDateString(),
      this.logger,
      projectJson.componentPath,
      this.emit.bind(this));

    if (rootWF.cleanupFlag === "2") {
      this.rootDispatcher.doCleanup = defaultCleanupRemoteRoot;
    }

    await this.updateProjectState("running", projectJson);
    rootWF.state = await this.rootDispatcher.start();
    await this.updateProjectState(rootWF.state, projectJson);

    await fs.writeJson(this.rootWFFilename, rootWF, { spaces: 4, replacer: componentJsonReplacer });

    this.rootDispatcher = null;
    removeSsh(this.projectRootDir);
    return rootWF.state;
  }

  async pause() {
    if (this.rootDispatcher !== null) {
      this.rootDispatcher.pause();
    }
    removeSsh(this.projectRootDir);
    await cancelDispatchedTasks(this.tasks, this.logger);
    const projectJson = await readJsonGreedy(this.projectJsonFilename);
    await this.updateProjectState("paused", projectJson);
    this.rootDispatcher = null;
  }

  async clean() {
    if (this.rootDispatcher !== null) {
      this.rootDispatcher.remove();
    }
    removeSsh(this.projectRootDir);
    await cancelDispatchedTasks(this.tasks, this.logger);
    this.tasks.clear();
    await rmfr(this.projectRootDir);
    await gitResetHEAD(this.projectRootDir);
    const projectJson = await readJsonGreedy(this.projectJsonFilename);
    this.emit("projectStateChanged", projectJson);
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
function cleanProject(projectRootDir) {
  return getProject(projectRootDir).clean();
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

function removeCluster(projectRootDir) {
  const pj = getProject(projectRootDir);
  for (const cluster of pj.clusters) {
    destroy(cluster);
  }
  pj.clusters.clear();
}

function addCluster(projectRootDir, cluster) {
  getProject(projectRootDir).clusters.add(cluster);
}

function once(projectRootDir, eventName, cb) {
  return getProject(projectRootDir).once(eventName, cb);
}
function on(projectRootDir, eventName, cb) {
  return getProject(projectRootDir).on(eventName, cb);
}

function emitEvent(projectRootDir, eventName, ...args) {
  return getProject(projectRootDir).emit(eventName, ...args);
}

function off(projectRootDir, eventName, fn) {
  return getProject(projectRootDir).removeListener(eventName, fn);
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
function setLogger(projectRootDir, logger) {
  getProject(projectRootDir).logger = logger;
}

function setSio(projectRootDir, sio) {
  getProject(projectRootDir).logger.addContext("sio", sio);
}

async function updateProjectState(projectRootDir, state) {
  return getProject(projectRootDir).updateProjectState(state);
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
  addCluster,
  removeCluster,
  emitEvent,
  once,
  on,
  off,
  getLogger,
  setLogger,
  setSio,
  runProject,
  cleanProject,
  pauseProject,
  updateProjectState
};
