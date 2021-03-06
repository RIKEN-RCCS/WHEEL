/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
"use strict";
const path = require("path");
const fs = require("fs-extra");
const { promisify } = require("util");
const glob = require("glob");
const { readJsonGreedy } = require("./fileUtils");
const { projectJsonFilename, componentJsonFilename } = require("../db/db");
const { gitAdd } = require("./gitOperator2");
const { componentJsonReplacer } = require("./componentFilesOperator");

async function getComponentDir(projectRootDir, targetID) {
  const projectJson = await readJsonGreedy(path.resolve(projectRootDir, projectJsonFilename));
  const componentPath = projectJson.componentPath[targetID];
  return componentPath ? path.resolve(projectRootDir, componentPath) : componentPath;
}

async function getComponentRelativePath(projectRootDir, targetID, srcID) {
  const projectJson = await readJsonGreedy(path.resolve(projectRootDir, projectJsonFilename));
  const srcPath = srcID ? projectJson.componentPath[srcID] : projectRootDir;
  const targetPath = projectJson.componentPath[targetID];

  if (typeof targetPath === "undefined") {
    return targetPath;
  }
  return path.relative(srcPath, targetPath);
}

async function getComponent(projectRootDir, component) {
  let componentJson = component; //component is treated as component Json object by default
  if (typeof component === "string") {
    const isFilePath = await fs.pathExists(component);

    if (isFilePath) {
      //component is path of component Json file
      componentJson = await readJsonGreedy(component);
    } else {
      //component should be ID string
      const componentDir = await getComponentDir(projectRootDir, component);

      if (await fs.pathExists(componentDir)) {
        componentJson = await readJsonGreedy(path.resolve(componentDir, componentJsonFilename));
      } else {
        componentJson = null;
      }
    }
  }

  return componentJson;
}

async function getChildren(projectRootDir, parentID) {
  const dir = await getComponentDir(projectRootDir, parentID);
  if (!dir) {
    return [];
  }

  const children = await promisify(glob)(path.join(dir, "*", componentJsonFilename));
  if (children.length === 0) {
    return [];
  }

  const rt = await Promise.all(children.map((e)=>{
    return readJsonGreedy(e);
  }));

  return rt.filter((e)=>{
    return !e.subComponent;
  });
}

//component can be one of "path of component Json file", "component json object", or "component's ID"
async function updateComponentJson(projectRootDir, component, modifier) {
  const componentJson = await getComponent(projectRootDir, component);

  if (typeof modifier === "function") {
    await modifier(componentJson);
  }

  //resolve component json filename from parenet dirname, component.name, and componentJsonFilename constant
  //to avoid using old path in componentPath when component's name is changed
  const parentDir = componentJson.parent ? await getComponentDir(projectRootDir, componentJson.parent) : projectRootDir;
  const filename = path.resolve(parentDir, componentJson.name, componentJsonFilename);
  await fs.writeJson(filename, componentJson, { spaces: 4, replacer: componentJsonReplacer });
  return gitAdd(projectRootDir, filename);
}

module.exports = {
  getComponentDir,
  getComponent,
  getChildren,
  updateComponentJson,
  getComponentRelativePath
};
