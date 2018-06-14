"use strict";
const fs = require("fs-extra");
const os = require("os");
const path = require("path");

const express = require('express');
const nodegit = require("nodegit");

const {getLogger} = require('../logSettings');
const logger = getLogger('home');
const fileBrowser = require("./fileBrowser");
const {getDateString} = require('./utility');

const compo = require("./workflowComponent");
const {projectList, extWF, systemName, defaultCleanupRemoteRoot, defaultFilename, extProject, suffix, rootDir} = require('../db/db');

const {escapeRegExp, isValidName} = require('./utility');
//eslint-disable-next-line no-useless-escape
const noDotFiles = /^[^\.].*$/;
const ProjectJSON = new RegExp(`^.*${escapeRegExp(extProject)}$`);
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

/**
 * create new project dir, initial files and new git repository
 * @param {string} root - project root path
 * @param {string} projectName      - project name without suffix(.wheel by default)
 * @returns {strint} - project Json file's absolute path
 */
async function createNewProject(root, name) {
  await fs.mkdir(root)
  // write root workflow
  const rootWorkflowFilename = `${defaultFilename}${extWF}`;
  const rootWorkflowFileFullpath=path.join(root, rootWorkflowFilename);
  const rootWorkflow = new compo.factory('workflow');
  rootWorkflow.name=name;
  rootWorkflow.path='./';
  rootWorkflow.jsonFile='./'+rootWorkflowFilename;
  rootWorkflow.cleanupFlag = defaultCleanupRemoteRoot === 0 ? 0 : 1;
  logger.debug(rootWorkflow);
  await fs.writeJson(rootWorkflowFileFullpath, rootWorkflow, {spaces: 4});

  // write project JSON
  const projectJsonFilename = `${systemName}${extProject}`;
  const timestamp=getDateString(true);
  const projectJson= {
    "name": `${name}`,
    "description": "This is new Project.",
    "state": "not-started",
    "path": `./${projectJsonFilename}`,
    "path_workflow": `./${rootWorkflowFilename}`,
    "ctime": timestamp,
    "mtime": timestamp
  };
  const projectJsonFileFullpath=path.join(root, projectJsonFilename);
  logger.debug(projectJson);
  await fs.writeJson(projectJsonFileFullpath, projectJson, {spaces: 4});

  let repo = await nodegit.Repository.init(root, 0);
  const author = nodegit.Signature.now('wheel', "wheel@example.com"); //TODO replace user info
  const commiter= await author.dup();
  await repo.createCommitOnHead([projectJsonFilename, rootWorkflowFilename], author, commiter, "create new project");

  return projectJsonFileFullpath;
}

function getAllProject() {
  return Promise.all(projectList.getAll().map(async (v)=>{
    let rt;
    try{
      const projectJson = await fs.readJSON(v.path)
      rt = Object.assign(projectJson, v);
    }catch(err){
      logger.warn(v.path,"read failed but just ignore", err);
      rt=null;
    }
    return rt
  }));
}

function adaptorSendFiles (withFile, dirFilter, sio, msg) {
  const target = msg ? path.normalize(msg) : rootDir || os.homedir() || '/';
  const request = msg || target;
  fileBrowser(sio, 'fileList', target, {
    "request": request,
    "sendFilename"  : withFile,
    "filter"        : {
      "all": noDotFiles,
      "file": ProjectJSON,
      "dir": dirFilter
    },
    "withParentDir" : true
  });
}

function removeTrailingPathSep(filename){
  if(filename.endsWith(path.sep)){
    return removeTrailingPathSep(filename.slice(0,-1));
  }
  return filename;
}

async function onAdd (sio, projectDir) {
  logger.debug("onAdd", projectDir);
  let pathDirectory = removeTrailingPathSep(projectDir);
  if(!pathDirectory.endsWith(suffix)){
    pathDirectory += suffix;
  }
  const projectName = path.basename(pathDirectory.slice(0,- suffix.length));

  if(! await isValidProjectName(projectName)) return;

  try{
    //projectJsonFilename will be used out of this scope
    var projectJsonFilename = await createNewProject(pathDirectory, projectName);
  }catch(e){
    logger.error('create project failed.',e);
    return
  }
  projectList.unshift({path: projectJsonFilename});
  const newProjectList = await getAllProject();
  sio.emit('projectList', newProjectList);
}

async function onImport(sio, projectJsonFilepath) {
  logger.debug('import: ',projectJsonFilepath);

  const projectJson = await fs.readJson(projectJsonFilepath);
  const projectName = projectJson.name;

  if(! await isValidProjectName(projectName)) return;

  const projectRootDir=path.dirname(projectJsonFilepath);
  const newProjectRootDir = path.resolve(path.dirname(projectRootDir), projectName+suffix);

  if(projectRootDir !== newProjectRootDir){
    try{
      await fs.move(projectRootDir, newProjectRootDir);
    }catch(e){
      logger.error('directory creation failed', e);
      return
    }
  }

  const filename=path.basename(projectJsonFilepath);
  const projectJsonFilename = path.resolve(newProjectRootDir, filename);
  projectList.unshift({path: projectJsonFilename});
  const newProjectList = await getAllProject();
  sio.emit('projectList', newProjectList);
}

async function onRemove (sio, id) {
  logger.debug('remove: ', id);
  const target = projectList.get(id);
  const targetDir = path.dirname(target.path);
  try{
    await fs.remove(targetDir);
  }catch(e){
    logger.error('project directory remove failed: ', targetDir);
    return
  }
  await projectList.remove(id);
  const newProjectList = await getAllProject();
  sio.emit('projectList', newProjectList);
}

async function onRename (sio, msg) {
  logger.debug('rename:', msg);
  if (!(msg.hasOwnProperty('id') && msg.hasOwnProperty('newName')&& msg.hasOwnProperty('path'))) {
    logger.warn('illegal request ',msg);
    return;
  }
  const projectJsonFilepath=msg.path;
  const newName = msg.newName;

  if(! await isValidProjectName(newName)) return;

  const oldDir = path.dirname(projectJsonFilepath);
  const parent = path.dirname(oldDir);
  const newDir = path.resolve(parent, newName+suffix);
  try{
    await fs.move(oldDir, newDir);
  }catch(err){
    logger.error('rename project failed', err);
    return
  }

  //rewrite path in project List entry
  const target = projectList.get(msg.id);
  const filename=path.basename(projectJsonFilepath);
  target.path = path.resolve(newDir, filename);
  await projectList.update(target);

  //rewrite name in projectJson file
  const projectJson = await fs.readJSON(target.path)
  projectJson.name = newName;
  await fs.writeJson(target.path, projectJson,{spaces: 4});
  //TODO git add and commit

  const newProjectList = await getAllProject();
  sio.emit('projectList', newProjectList);
}

async function onReorder(sio, orderList) {
  logger.debug('reorder: ',orderList);
  await projectList.reorder(orderList);
  const pj = await getAllProject();
  sio.emit('projectList', pj);
}

async function onGetProjectList (sio){
  const pj = await getAllProject();
  sio.emit('projectList', pj.filter((e)=>{return e}));
}

module.exports = function(io){
  let sio=io.of('/home');
  sio.on('connect', (socket) => {
    socket.on('getProjectList', onGetProjectList.bind(null, socket));
    socket.on('getDirList',     adaptorSendFiles.bind(null, false, null, socket));
    socket.on('getDirListAndProjectJson', adaptorSendFiles.bind(null, true,  null, socket));
    socket.on('addProject',     onAdd.bind(null, socket));
    socket.on('importProject',  onImport.bind(null, socket));
    socket.on('removeProject',  onRemove.bind(null, socket));
    socket.on('renameProject',  onRename.bind(null, socket));
    socket.on('reorderProject', onReorder.bind(null, socket));
  });
  const router = express.Router();
  router.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '../views/home.html'));
  });
  return router;
}
