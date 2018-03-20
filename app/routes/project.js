const path = require("path");
const {promisify} = require("util");

const fs = require("fs-extra");
const glob = require('glob');

const {add, getGitOperator}= require("./gitOperator");
const {getDateString, replacePathsep} = require('./utility');
const {getLogger} = require('../logSettings');

const logger = getLogger('workflow');

class Project {
  constructor(){
    // current workflow object which is editting
    this.cwf=null;

    // current workflow filename
    this.cwfFilename=null;

    // project root workflow file
    this.rwfFilename=null;

    // dispatcher for root workflow
    this.rootDispatcher=null

    this.projectState='not-started';
    this.projectJsonFilename=null;
  }

  // return absolute path of current workflow dir
  get cwfDir(){
    return path.dirname(this.cwfFilename);
  }

  // return absolute path of project root dir
  get rootDir(){
    return path.dirname(this.projectJsonFilename);
  }

}

projectDirs={};
_getProject = (label)=>{
  if(! projectDirs.hasOwnProperty(label)){
    projectDirs[label] = new Project;
  }
  return projectDirs[label];
}


async function openProject (label, filename){
  const pj=_getProject(label);
  pj.projectJsonFilename=filename;
  const projectJson = JSON.parse(await promisify(fs.readFile)(filename));
  const rootDir = getRootDir(label);
  pj.rwfFilename = path.resolve(rootDir, projectJson.path_workflow);
  pj.git = await getGitOperator(rootDir);
  return setCwf(label, pj.rwfFilename);
}
async function resetProject(label){
  return openProject(label, _getProject(label).projectJsonFilename);
}

async function readProjectJson (label){
  let filename = _getProject(label).projectJsonFilename;
  return JSON.parse(await promisify(fs.readFile)(filename));
}

async function writeProjectJson(label, projectJson){
  let filename = _getProject(label).projectJsonFilename;
  if(! projectJson){
    projectJson = await readProjectJson(label);
  }
  projectJson.mtime=getDateString(true);
  await promisify(fs.writeFile)(filename, JSON.stringify(projectJson, null, 4));
  return gitAdd(label, filename);
}

async function updateProjectJson (label, data){
  const projectJson = await readProjectJson(label);
  for(const key in projectJson){
    if(data.hasOwnProperty(key)){
      projectJson[key] = data[key];
    }
  }
  return writeProjectJson(label, projectJson);
}

function setProjectState(label, state){
  _getProject(label).projectState=state;
  logger.info('project state changed', state);
  return updateProjectJson(label, {"state": state});
}

async function setCwf (label, filename){
  let pj=_getProject(label);
  pj.cwfFilename=filename;
  try{
    pj.cwf=JSON.parse(await promisify(fs.readFile)(filename));
  } catch(err){
    logger.error('workflow file read error', err);
  }
}

async function readRwf (label){
  const filename=_getProject(label).rwfFilename;
  setCwf(label, filename);
  const data = await promisify(fs.readFile)(filename)
    .catch((err)=>{
      err.wf=filename;
      logger.error('read root workflow failure',err);
      return;
    });
  return JSON.parse(data)
}

async function gitAdd(label, absFilename, remove=false){
  const git = _getProject(label).git;
  return remove ? git.rm(absFilename) : git.add(absFilename);
}

async function commitProject(label){
  const git = _getProject(label).git;
  const name = 'wheel'; //TODO replace user info
  const email = `${name}@example.com`;
  return git.commit(name, email);
}

async function revertProject(label){
  const git = _getProject(label).git;
  return git.resetHEAD();
}

async function cleanProject(label){
  const rootDir = getRootDir(label);
  const srces = await promisify(glob)("*", {cwd: rootDir});
  const p = srces.map((e)=>{
    return fs.remove(e);
  });
  return revertProject(label);
}

/**
 * write current workflow and ProjectJson to file
 */
async function write (label){
  await writeProjectJson(label);
  let cwf =getCwf(label);
  let filename = getCwfFilename(label);
  await promisify(fs.writeFile)(filename, JSON.stringify(cwf, null, 4));
  return gitAdd(label, filename);
}


// simple accessor
function getProjectState(label){
  return _getProject(label).projectState;
}
function getCwf (label) {
  return _getProject(label).cwf;
}
function getCurrentDir (label){
  return _getProject(label).cwfDir;
}
function getRootDir (label){
  return _getProject(label).rootDir;
}
function getCwfFilename (label){
  return _getProject(label).cwfFilename;
}
function setRootDispatcher (label, dispatcher){
  _getProject(label).rootDispatcher=dispatcher;
}
function getRootDispatcher (label){
  return _getProject(label).rootDispatcher;
}
function pushNode (label, node){
  return _getProject(label).cwf.nodes.push(node)-1;
}
function getNode (label, index){
  return _getProject(label).cwf.nodes[index];
}
function overwriteCwf(label, cwf){
  _getProject(label).cwf=cwf;
}

module.exports.openProject       = openProject;
module.exports.resetProject      = resetProject;
module.exports.getCwf            = getCwf;
module.exports.setCwf            = setCwf;
module.exports.overwriteCwf      = overwriteCwf;
module.exports.getNode           = getNode;
module.exports.pushNode          = pushNode;
module.exports.getCurrentDir     = getCurrentDir;
module.exports.readRwf           = readRwf;
module.exports.getRootDir        = getRootDir;
module.exports.getCwfFilename    = getCwfFilename;
module.exports.write             = write;

module.exports.setRootDispatcher = setRootDispatcher;
module.exports.getRootDispatcher = getRootDispatcher;

//operators for ProjectJson
module.exports.readProjectJson   = readProjectJson;
module.exports.updateProjectJson = updateProjectJson;
module.exports.setProjectState   = setProjectState;
module.exports.getProjectState   = getProjectState;

//operators for git repository
module.exports.gitAdd            = gitAdd;
module.exports.commitProject     = commitProject;
module.exports.revertProject     = revertProject;
module.exports.cleanProject      = cleanProject;
