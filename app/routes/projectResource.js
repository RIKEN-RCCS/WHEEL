"use strict";
const path = require("path");
const { promisify } = require("util");
const EventEmitter = require("events");
const fs = require("fs-extra");
const glob = require("glob");
const { gitResetHEAD } = require("./gitOperator");


class Project extends EventEmitter {
  constructor() {
    super();
    this.cwd = null; //current working directory
    this.rootDispatcher = null; //dispatcher for root workflow
    this.ssh = new Map(); //ssh instances using in this project
    this.tasks = new Set(); //dispatched tasks
  }
}

const projectDirs = new Map();

function getProject(projectRootDir) {
  if (!projectDirs.has(projectRootDir)) {
    projectDirs.set(projectRootDir, new Project());
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
  const srces = await promisify(glob)("*", { cwd: rootDir });

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
  getProject(projectRootDir).once(eventName, cb);
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

//TODO remove from this module
function getTaskStateList(projectRootDir) {
  return [...getProject(projectRootDir).tasks].map((task)=>{
    return {
      name: task.name,
      ID: task.ID,
      subID: task.subID,
      description: task.description ? task.description : "",
      state: task.state,
      parent: task.parent,
      parentType: task.parentType,
      startTime: task.startTime,
      endTime: task.endTime
    };
  });
}

function clearDispatchedTasks(projectRootDir) {
  getProject(projectRootDir).tasks.clear();
}

function addDispatchedTask(projectRootDir, task) {
  getProject(projectRootDir).tasks.add(task);
}

module.exports = {
  openProject,
  setCwd,
  getCwd,
  setRootDispatcher,
  getRootDispatcher,
  deleteRootDispatcher,
  addDispatchedTask,
  clearDispatchedTasks,
  getTasks,
  getTaskStateList,
  addSsh,
  getSsh,
  removeSsh,
  cleanProject,
  emitEvent,
  once,
  removeListener
};
