const path = require("path");
const fs = require("fs");
const {promisify} = require("util");

const {getDateString} = require('./utility');

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

data={};
_getProject = (label)=>{
  if(! data.hasOwnProperty(label)){
    data[label] = new Project;
  }
  return data[label];
}


async function openProject (label, filename){
  let pj=_getProject(label);
  pj.projectJsonFilename=filename;
  let projectJson = JSON.parse(await promisify(fs.readFile)(filename));
  pj.rwfDir = path.dirname(filename);
  pj.rwfFilename = path.resolve(pj.rwfDir, projectJson.path_workflow);
  return setCwf(label, pj.rwfFilename);
}

async function readProjectJson (label){
  let filename = _getProject(label).projectJsonFilename;
  return JSON.parse(await promisify(fs.readFile)(filename));
}

async function writeProjectJson(label){
  let filename = _getProject(label).projectJsonFilename;
  let projectJson = await readProjectJson(label);
  projectJson.mtime=getDateString();
  return promisify(fs.writeFile)(filename, JSON.stringify(projectJson, null, 4));
}

async function updateProjectJson (label, data){
  let projectJson = await readProjectJson(label);
  for(let key in projectJson){
    if(data.hasOwnProperty(key)){
      projectJson[key] = data[key];
    }
  }
  return writeProjectJson(label);
}

function setProjectState(label, state){
  _getProject(label).projectState=state;
}

function getProjectState(label){
  return _getProject(label).projectState;
}

async function setCwf (label, filename){
  let pj=_getProject(label);
  pj.cwfFilename=filename;
  try{
    pj.cwf=JSON.parse(await promisify(fs.readFile)(filename));
  } catch(err){
    logger.error('workflow file read error\n', err);
  }
}

async function readRwf (label){
  let filename=_getProject(label).rwfFilename;
  return JSON.parse(await promisify(fs.readFile)(filename))
    .catch((err)=>{
      err.wf=filename;
      logger.error('read root workflow failure:\n',err);
    });
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
  return _getProject(label).cwf.nodes[index]
}

function removeNode(label, index){
  _getProject(label).cwf.nodes[index]=null
}


/**
 * write current workflow and ProjectJson to file
 */
async function write (label){
  let cwf =getCwf(label);
  let filename = getCwfFilename(label);
  writeProjectJson(label);
  return promisify(fs.writeFile)(filename, JSON.stringify(cwf, null, 4));
}

module.exports.getCwf            = getCwf;
module.exports.setCwf            = setCwf;
module.exports.getNode           = getNode;
module.exports.removeNode           = removeNode;
module.exports.pushNode          = pushNode;
module.exports.getCurrentDir     = getCurrentDir;
module.exports.readRwf           = readRwf;
module.exports.getRootDir        = getRootDir;
module.exports.getCwfFilename    = getCwfFilename;
module.exports.write             = write;
module.exports.setRootDispatcher = setRootDispatcher;
module.exports.getRootDispatcher = getRootDispatcher;
module.exports.openProject       = openProject;
module.exports.updateProjectJson = updateProjectJson;
module.exports.setProjectState   = setProjectState;
module.exports.getProjectState   = getProjectState;
