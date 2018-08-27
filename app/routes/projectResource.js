const path = require("path");
const {promisify} = require("util");
const EventEmitter = require("events");

const fs = require("fs-extra");
const glob = require('glob');

const {getGitOperator}= require("./gitOperator");


class Project extends EventEmitter{
  constructor(){
    super();
    this.cwd=null; // current working directory
    this.rootDispatcher=null // dispatcher for root workflow
    this.ssh=new Map(); // ssh instances using in this project
    this.tasks=new Set(); // tasks which is updated and not send to client
  }
}

const projectDirs=new Map();

function _getProject(projectRootDir){
  if(! projectDirs.has(projectRootDir)){
    projectDirs.set(projectRootDir, new Project());
  }
  return projectDirs.get(projectRootDir);
}

async function openProject (projectRootDir){
  const pj=_getProject(projectRootDir);
  pj.git = await getGitOperator(projectRootDir);
  setCwd(projectRootDir, projectRootDir);
}

function setCwd (projectRootDir, currentDir){
  const pj=_getProject(projectRootDir);
  pj.cwd = currentDir;
}

function getCwd (projectRootDir) {
  return _getProject(projectRootDir).cwd;
}

async function gitAdd(projectRootDir, absFilename, remove=false){
  const git = _getProject(projectRootDir).git;
  return remove ? git.rm(absFilename) : git.add(absFilename);
}

async function commitProject(projectRootDir){
  const git = _getProject(projectRootDir).git;
  const name = 'wheel'; //TODO replace user info
  const email = `${name}@example.com`;
  return git.commit(name, email);
}

async function revertProject(projectRootDir){
  const git = _getProject(projectRootDir).git;
  return git.resetHEAD();
}

async function cleanProject(projectRootDir){
  const rootDir = projectRootDir;
  const srces = await promisify(glob)("*", {cwd: rootDir});
  //TODO should be optimized stride value(100);
  for(let i =0; i<srces.length; i+=100){
    const end = i+100 < srces.length? i+100:srces.length;
    const p = srces.slice(i, end).map((e)=>{
      return fs.remove(path.resolve(rootDir,e));
    });
    await Promise.all(p);
  }
  return revertProject(projectRootDir);
}

/**
 * disconnect and remove all ssh instance
 */
function removeSsh(projectRootDir){
  const pj=_getProject(projectRootDir);
  for (const ssh of pj.ssh.values()){
    ssh.disconnect();
  }
  pj.ssh.clear();
}

function setRootDispatcher (projectRootDir, dispatcher){
  _getProject(projectRootDir).rootDispatcher=dispatcher;
}
function deleteRootDispatcher (projectRootDir){
  delete _getProject(projectRootDir).rootDispatcher;
}
function getRootDispatcher (projectRootDir){
  return _getProject(projectRootDir).rootDispatcher;
}

function getSsh (projectRootDir, hostname){
  return _getProject(projectRootDir).ssh.get(hostname);
}
function addSsh (projectRootDir, hostname, ssh){
  _getProject(projectRootDir).ssh.set(hostname, ssh);
}

function once(projectRootDir, eventName, cb){
  _getProject(projectRootDir).once(eventName, cb);
}
function emit(projectRootDir, eventName){
  _getProject(projectRootDir).emit(eventName);
}

function getTasks(projectRootDir){
  return _getProject(projectRootDir).tasks;
}
function getTaskStateList(projectRootDir){
  return [..._getProject(projectRootDir).tasks].map((task)=>{
    return {
      name: task.name,
      description: task.description ? task.description : '',
      state: task.state,
      parent: task.parent,
      startTime: task.startTime,
      endTime: task.endTime
    }
  });
}
function clearDispatchedTasks(projectRootDir){
  _getProject(projectRootDir).tasks.clear();
}
function addDispatchedTask(projectRootDir, task){
  _getProject(projectRootDir).tasks.add(task);
}

module.exports = {
  openProject          : openProject,
  setCwd               : setCwd,
  getCwd               : getCwd,
  setRootDispatcher    : setRootDispatcher,
  getRootDispatcher    : getRootDispatcher,
  deleteRootDispatcher : deleteRootDispatcher,
  addDispatchedTask    : addDispatchedTask,
  clearDispatchedTasks : clearDispatchedTasks,
  getTasks             : getTasks,
  getTaskStateList     : getTaskStateList,
  addSsh               : addSsh,
  getSsh               : getSsh,
  removeSsh            : removeSsh,
  cleanProject         : cleanProject,
  revertProject        : revertProject,
  commitProject        : commitProject,
  gitAdd               : gitAdd,
  emit                 : emit,
  once                 : once,
}



