const path = require("path");
const fs = require("fs");
const {promisify} = require("util");

const del = require("del");
const nodegit = require("nodegit");
const {getLogger} = require('../logSettings');
const logger = getLogger('workflow');

const {getDateString, replacePathsep} = require('./utility');

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

async function writeProjectJson(label, projectJson){
  let filename = _getProject(label).projectJsonFilename;
  if(! projectJson){
    projectJson = await readProjectJson(label);
  }
  projectJson.mtime=getDateString();
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
  return updateProjectJson(label, {"state": state});
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
  const filename=_getProject(label).rwfFilename;
  const data = await promisify(fs.readFile)(filename)
    .catch((err)=>{
      err.wf=filename;
      logger.error('read root workflow failure:\n',err);
    });
  return JSON.parse(data)
}

async function _getRepo(label){
  const rootDir = getRootDir(label)
  return nodegit.Repository.open(path.resolve(rootDir, '.git'));
}

async function gitAdd(label, absFilename, remove=false){
  const repo = await _getRepo(label);
  const index = await repo.refreshIndex();
  const rootDir = getRootDir(label)
  const filename = replacePathsep(path.relative(rootDir, absFilename));
  try{
    if(remove){
      await index.removeByPath(filename);
    }else{
      await index.addByPath(filename);
    }
  }catch(e){
    logger.error('git add failed:', e);
  }
  return index.write()
}

async function commitProject(label){
  const repo = await _getRepo(label);
  const author = nodegit.Signature.now('wheel', "wheel@example.com"); //TODO replace user info
  const commiter= await author.dup();
  const index = await repo.refreshIndex();
  const oid = await index.writeTree();
  const headCommit = await repo.getHeadCommit();
  return repo.createCommit("HEAD", author, commiter, "save project", oid, [headCommit]);
}

async function revertProject(label){
  const repo = await _getRepo(label);
  const headCommit = await repo.getHeadCommit();
  return nodegit.Reset.reset(repo, headCommit, nodegit.Reset.TYPE.HARD, null, "master");
}

async function cleanProject(label){
  const rootDir = getRootDir(label);
  await del([rootDir+path.sep+"*"], {force: true});
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
  return _getProject(label).cwf.nodes[index]
}
// function removeNode(label, index){
//   _getProject(label).cwf.nodes[index]=null
// }

module.exports.getCwf            = getCwf;
module.exports.setCwf            = setCwf;
module.exports.getNode           = getNode;
// module.exports.removeNode        = removeNode;
module.exports.pushNode          = pushNode;
module.exports.getCurrentDir     = getCurrentDir;
module.exports.readRwf           = readRwf;
module.exports.getRootDir        = getRootDir;
module.exports.getCwfFilename    = getCwfFilename;
module.exports.write             = write;
module.exports.setRootDispatcher = setRootDispatcher;
module.exports.getRootDispatcher = getRootDispatcher;
module.exports.openProject       = openProject;
module.exports.readProjectJson   = readProjectJson;
module.exports.updateProjectJson = updateProjectJson;
module.exports.setProjectState   = setProjectState;
module.exports.getProjectState   = getProjectState;
module.exports.gitAdd            = gitAdd;
module.exports.commitProject     = commitProject;
module.exports.revertProject     = revertProject;
module.exports.cleanProject      = cleanProject;
