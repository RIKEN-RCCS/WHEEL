const path = require("path");
const fs = require("fs-extra");
const {promisify} = require("util");

const glob = require("glob");

const {getLogger} = require('../logSettings');
const logger = getLogger('workflow');
const {projectJsonFilename, componentJsonFilename} = require('../db/db');
const {getCwf} = require("./project");

function hasChild(node){
  return node.type === 'workflow' || node.type === 'parameterStudy' || node.type === 'for' || node.type === 'while' || node.type === 'foreach';
}

function isInitialNode(node){
  if(node === null) return false;
  if(node.previous.length > 0) return false;
  if(node.inputFiles.length >0 ){
    const hasConnectedInputFile =  node.inputFiles.some((e)=>{
      return e.srcNode !== null;
    });
    return !hasConnectedInputFile
  }
  return true;
}

async function readProjectJson(projectRootDir){
  return fs.readJson(path.resolve(projectRootDir, projectJsonFilename));
}

function isRunning(projectState){
  return projectState === 'running' || projectState === 'paused';
}

async function getComponentDir(projectRootDir, targetID){
  const projectJson = await fs.readJson(path.resolve(projectRootDir, projectJsonFilename));
  const componentPath = projectJson.componentPath[targetID];
  return componentPath ? path.resolve(projectRootDir, componentPath): componentPath;
}

async function getComponent(projectRootDir, component){
  let componentJson=component;
  if(await fs.pathExists(component)){
    // component is path of componentJsonFile
    componentJson = await fs.readJson(component)
  }else{
    const componentDir = await getComponentDir(projectRootDir, component);
    if(componentDir !== undefined){
      // component is ID of component
      componentJson = await fs.readJson(path.resolve(componentDir, componentJsonFilename));
    }
  }
  return componentJson;
}

async function getChildren(projectRootDir, parentID){
  const dir = await getComponentDir(projectRootDir, parentID);
  if(dir === undefined){
    logger.error("illegal ID", parentID);
    return []
  }
  const children = await promisify(glob)(path.join(dir, '*', componentJsonFilename));
  return Promise.all(children.map((e)=>{
    return fs.readJson(e);
  }));
}

async function sendWorkflow(emit, projectRootDir){
  const { state } = await readProjectJson(projectRootDir);
  const fromDispatcher = isRunning(state)
  const wf=getCwf(projectRootDir, fromDispatcher);
  const rt = Object.assign({}, wf);
  rt.descendants = await getChildren(projectRootDir, wf.ID);
  for(const child of rt.descendants){
    if(child.handler) delete child.handler;
    if(hasChild(child)){
      const grandson = await getChildren(projectRootDir, child.ID);
      child.descendants = grandson.map((e)=>{
        return {type: e.type, pos: e.pos}
      });
    }
  }
  emit('workflow', rt);
}

module.exports ={
  hasChild: hasChild,
  isInitialNode: isInitialNode,
  getComponentDir: getComponentDir,
  getComponent: getComponent,
  sendWorkflow: sendWorkflow
}
