"use strict";
const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const {promisify} = require("util");

const express = require('express');
const nodegit = require("nodegit");
const glob = require("glob");

const {getLogger} = require('../logSettings');
const logger = getLogger('home');
const fileBrowser = require("./fileBrowser");
const {getDateString} = require('./utility');

const compo = require("./workflowComponent");
const {projectList, defaultCleanupRemoteRoot, projectJsonFilename, componentJsonFilename, suffix, rootDir} = require('../db/db');

const {escapeRegExp, isValidName} = require('./utility');
//eslint-disable-next-line no-useless-escape
const noDotFiles = /^[^\.].*$/;
const noWheelDir = new RegExp(`^(?!^.*${escapeRegExp(suffix)}$).*$`);

async function isDuplicateProjectName(newName){
  const currentProjectList = await getAllProject();
  return currentProjectList.some((e)=>{
    return e.name === newName;
  });
}

async function isValidProjectName(name){
  //check if project name contains allowed characters only
  if(! isValidName(name)){
    logger.error(name, 'is not allowed for project name');
    return false;
  }
  //check if project name is already used
  if(await isDuplicateProjectName(name)){
    logger.error(name,'is already used');
    return false
  }
  return true
}

async function initGitRepo(root, user, email){
  const repo = await nodegit.Repository.init(root, 0);
  const author = nodegit.Signature.now(user, email);
  const commiter= await author.dup();
  const files = await promisify(glob)("**", {cwd: root});

  return repo.createCommitOnHead(files, author, commiter, "create new project");
}

/**
 * create new project dir, initial files and new git repository
 * @param {string} root - project root's absolute path
 * @param {string} projectName - project name without suffix
 * @param {string} description - project description text
 */
async function createNewProject(root, name, description) {
  description = description !== null? description : "This is new project.";
  await fs.ensureDir(root)
  // write root workflow
  const rootWorkflowFileFullpath=path.join(root,componentJsonFilename);
  const rootWorkflow = new compo.factory('workflow');
  rootWorkflow.name=name;
  rootWorkflow.cleanupFlag = defaultCleanupRemoteRoot === 0 ? 0 : 1;
  logger.debug(rootWorkflow);
  await fs.writeJson(rootWorkflowFileFullpath, rootWorkflow, {spaces: 4});

  // write project JSON
  const timestamp=getDateString(true);
  const projectJson= {
    "name": name,
    "description": description,
    "state": "not-started",
    "root" : root,
    "ctime": timestamp,
    "mtime": timestamp
  };
  const projectJsonFileFullpath=path.resolve(root, projectJsonFilename);
  logger.debug(projectJson);
  await fs.writeJson(projectJsonFileFullpath, projectJson, {spaces: 4});
  return initGitRepo(root,  'wheel', "wheel@example.com"); //TODO replace by user info
}

async function getAllProject() {
  const pj = await Promise.all(projectList.getAll().map(async (v)=>{
      let rt;
      try{
        const projectJson = await fs.readJson(path.join(v.path, projectJsonFilename))
        rt = Object.assign(projectJson, v);
      }catch(err){
        logger.warn(v,"read failed but just ignore", err);
        rt=false;
      }
      return rt
    }));
  return pj.filter((e)=>{return e});
}

async function adaptorSendFiles (withFile, sio, msg, cb) {
  const target = msg ? path.normalize(msg) : rootDir || os.homedir() || '/';
  const request = msg || target;
  try{
    await fileBrowser(sio, 'fileList', target, {
      "request": request,
      "sendFilename"  : withFile,
      "filter"        : {
        "all": noDotFiles,
        "file": new RegExp(`^.*${escapeRegExp(projectJsonFilename)}$`),
        "dir": null
      },
      "withParentDir" : true
    });
  }catch(e){
    logger.error("error occurred during reading directory",e);
    cb(false);
    return;
  }
  cb(true);
}

function removeTrailingPathSep(filename){
  if(filename.endsWith(path.sep)){
    return removeTrailingPathSep(filename.slice(0,-1));
  }
  return filename;
}

// socket.IO event handlers
async function onAddProject (emit, projectDir, description, cb) {
  logger.debug("onAdd", projectDir, description);
  let projectRootDir = removeTrailingPathSep(projectDir);
  if(!projectRootDir.endsWith(suffix)){
    projectRootDir += suffix;
  }
  projectRootDir = path.resolve(projectRootDir);

  const projectName = path.basename(projectRootDir.slice(0,- suffix.length));

  if(! await isValidProjectName(projectName)){
    logger.error('invalid project name');
    cb(false);
    return;
  }

  try{
    await createNewProject(projectRootDir, projectName, description);
  }catch(e){
    logger.error('create project failed.',e);
    cb(false);
    return
  }
  projectList.unshift({path: projectRootDir});
  const newProjectList = await getAllProject();
  emit('projectList', newProjectList);
  cb(true);
}

async function onImportProject(emit, projectJsonFilepath, cb) {
  logger.debug('import: ',projectJsonFilepath);
  const projectJson = await fs.readJson(projectJsonFilepath);

  //TODO read root workflow and validate
  const projectRootDir=path.dirname(projectJsonFilepath);
  try{
    await fs.access(path.resolve(projectRootDir, componentJsonFilename));
  }catch(e){
    logger.error('root workflow JSON file not found\n', e);
    cb(false)
    return
  }

  try{
    await fs.access(path.resolve(projectRootDir, ".git"));
  }catch(e){
    if(e.code === "ENOENT"){
      await initGitRepo(projectRootDir,  'wheel', "wheel@example.com"); //TODO replace by user info
    }else{
      logger.error("can not access to git repository", e);
      cb(false)
      return
    }
  }

  const projectName = projectJson.name;
  if(! await isValidProjectName(projectName)){
    logger.error(projectName, "is not valid project name");
    cb(false);
    return;
  }
  const newProjectRootDir = path.resolve(path.dirname(projectRootDir), projectName+suffix);
  if(projectRootDir !== newProjectRootDir){
    try{
      await fs.move(projectRootDir, newProjectRootDir);
    }catch(e){
      logger.error('directory creation failed', e);
      cb(false);
      return
    }
    try{
      projectJson.root= newProjectRootDir;
      await fs.writeJson(path.resolve(newProjectRootDir, projectJsonFilename), projectJson);
    }catch(e){
      logger.error('rewrite project JSON failed', e);
      cb(false);
      return
    }
  }

  projectList.unshift({path: newProjectRootDir});
  const newProjectList = await getAllProject();
  emit('projectList', newProjectList);
  cb(true);
}

async function onRemoveProject (emit, id, cb) {
  logger.debug('remove: ', id);
  const target = projectList.get(id);
  try{
    await fs.remove(target.path);
  }catch(e){
    logger.error('project directory remove failed: ', target.path);
    cb(false);
    return
  }
  await projectList.remove(id);
  const newProjectList = await getAllProject();
  emit('projectList', newProjectList);
  cb(true);
}

async function onRenameProject (emit, msg, cb) {
  logger.debug('rename:', msg);
  if (!(msg.hasOwnProperty('id') && msg.hasOwnProperty('newName')&& msg.hasOwnProperty('path'))) {
    logger.warn('illegal request ',msg);
    cb(false);
    return;
  }
  const projectJsonFilepath=path.resolve(msg.path, projectJsonFilename);
  const newName = msg.newName;

  if(! await isValidProjectName(newName)){
    logger.error('invalid project name', newName);
    cb(false);
    return;
  }

  const oldDir = msg.path;
  const newDir = path.resolve(path.dirname(oldDir), newName+suffix);
  try{
    await fs.move(oldDir, newDir);
    const  projectJson = await fs.readJson(path.resolve(newDir, projectJsonFilename));
    projectJson.name = newName;
    projectJson.root = newDir;
    await fs.writeJson(path.resolve(newDir, projectJsonFilename), projectJson);
    const rootWorkflow = await fs.readJson(path.resolve(newDir, componentJsonFilename));
    rootWorkflow.name = newName;
    await fs.writeJson(path.resolve(newDir, componentJsonFilename), rootWorkflow);
  //TODO git add and commit
  }catch(err){
    logger.error('rename project failed', err);
    cb(false);
    return
  }

  //rewrite path in project List entry
  const target = projectList.get(msg.id);
  target.path = newDir
  await projectList.update(target);

  const newProjectList = await getAllProject();
  emit('projectList', newProjectList);
  cb(true);
}

async function onReorderProject(emit, orderList, cb) {
  logger.debug('reorder: ',orderList);
  await projectList.reorder(orderList);
  const pj = await getAllProject();
  emit('projectList', pj);
  cb(true)
}

async function onGetProjectList (emit, cb){
  logger.debug('getProjectList');
  const pj = await getAllProject();
  emit('projectList', pj);
  cb(true);
}

function onGetDirList(emit, msg, cb){
  logger.debug('getDirList:', msg);
 return adaptorSendFiles(false, emit, msg, cb);
}
function onGetDirListAndProjectJson(emit, msg, cb){
  logger.debug('getDirListAndProjectJson:', msg);
 return adaptorSendFiles(true, emit, msg, cb);
}

module.exports = function(io){
  let sio=io.of('/home');
  sio.on('connect', (socket) => {
    socket.on('getProjectList', onGetProjectList.bind(null, socket.emit));
    socket.on('getDirList',     onGetDirList.bind(null, socket.emit));
    socket.on('getDirListAndProjectJson', onGetDirListAndProjectJson.bind(null, socket.emit));
    socket.on('addProject',     onAddProject.bind(null, socket.emit));
    socket.on('importProject',  onImportProject.bind(null, socket.emit));
    socket.on('removeProject',  onRemoveProject.bind(null, socket.emit));
    socket.on('renameProject',  onRenameProject.bind(null, socket.emit));
    socket.on('reorderProject', onReorderProject.bind(null, socket.emit));
  });
  const router = express.Router();
  router.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '../views/home.html'));
  });
  return router;
}
