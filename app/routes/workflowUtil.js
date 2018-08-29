"use strict";
const path = require("path");
const fs = require("fs-extra");
const { promisify } = require("util");

const glob = require("glob");

const { getLogger } = require("../logSettings");
const logger = getLogger("workflow");
const { projectJsonFilename, componentJsonFilename } = require("../db/db");
const { getCwd } = require("./projectResource");

function hasChild(node) {
  return node.type === "workflow" || node.type === "parameterStudy" || node.type === "for" || node.type === "while" || node.type === "foreach";
}

function isInitialNode(node) {
  if (node === null) {
    return false;
  }
  if (node.previous.length > 0) {
    return false;
  }
  if (node.inputFiles.length > 0) {
    const hasConnectedInputFile = node.inputFiles.some((e)=>{
      return e.srcNode !== null;
    });

    return !hasConnectedInputFile;
  }
  return true;
}

async function getComponentDir(projectRootDir, targetID) {
  const projectJson = await fs.readJson(path.resolve(projectRootDir, projectJsonFilename));
  const componentPath = projectJson.componentPath[targetID];

  return componentPath ? path.resolve(projectRootDir, componentPath) : componentPath;
}

async function getComponent(projectRootDir, component) {
  let componentJson = component; // component is treated as component Json object by default

  if (await fs.pathExists(component)) {

    // component is path of component Json file
    componentJson = await fs.readJson(component);
  } else {
    const componentDir = await getComponentDir(projectRootDir, component);

    if (componentDir) {

      // component is ID string of component
      componentJson = await fs.readJson(path.resolve(componentDir, componentJsonFilename));
    }
  }
  return componentJson;
}

async function getChildren(projectRootDir, parentID) {
  const dir = await getComponentDir(projectRootDir, parentID);

  if (!dir) {
    logger.error("illegal ID", parentID);
    return [];
  }
  const children = await promisify(glob)(path.join(dir, "*", componentJsonFilename));

  return Promise.all(children.map((e)=>{
    return fs.readJson(e);
  }));
}

async function sendWorkflow(emit, projectRootDir) {
  const wf = await getComponent(projectRootDir, path.resolve(getCwd(projectRootDir), componentJsonFilename));
  const rt = Object.assign({}, wf);

  rt.descendants = await getChildren(projectRootDir, wf.ID);
  for (const child of rt.descendants) {
    if (child.handler) {
      delete child.handler;
    }
    if (hasChild(child)) {
      const grandson = await getChildren(projectRootDir, child.ID);

      child.descendants = grandson.map((e)=>{
        return { type: e.type, pos: e.pos };
      });
    }
  }
  emit("workflow", rt);
}

// read and send projectJson
async function sendProjectJson(emit, projectRootDir, state) {
  const projectJson = await fs.readJson(path.resolve(projectRootDir, projectJsonFilename));

  if (state) {
    projectJson.state = state;
  }
  emit("projectJson", projectJson);
}

module.exports = {
  hasChild,
  isInitialNode,
  getComponentDir,
  getComponent,
  sendWorkflow,
  getChildren,
  sendProjectJson
};
