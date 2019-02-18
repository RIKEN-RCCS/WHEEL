"use strict";
const path = require("path");
const fs = require("fs-extra");
const { promisify } = require("util");
const glob = require("glob");
const pathIsInside = require("path-is-inside");
const { componentFactory } = require("./workflowComponent");
const { updateComponentPath, getComponentDir } = require("./projectFilesOperator");
const { componentJsonFilename, remoteHost, jobScheduler } = require("../db/db");
const { readJsonGreedy } = require("./fileUtils");
const { gitAdd, gitRm } = require("./gitOperator");
const { isValidName } = require("../lib/utility");
const { hasChild, isInitialComponent } = require("./workflowComponent");

async function getChildren(projectRootDir, parentID) {
  const dir = await getComponentDir(projectRootDir, parentID, true);
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

async function validateTask(projectRootDir, component) {
  if (component.name === null) {
    return Promise.reject(new Error(`illegal path ${component.name}`));
  }

  if (component.useJobScheduler) {
    const hostinfo = remoteHost.query("name", component.host);
    if (!Object.keys(jobScheduler).includes(hostinfo.jobScheduler)) {
      return Promise.reject(new Error(`job scheduler for ${hostinfo.name} (${hostinfo.jobScheduler}) is not supported`));
    }
  }

  if (!(component.hasOwnProperty("script") && typeof component.script === "string")) {
    return Promise.reject(new Error(`script is not specified ${component.name}`));
  }
  const componentDir = await getComponentDir(projectRootDir, component.ID, true);
  const filename = path.resolve(componentDir, component.script);
  if (!(await fs.stat(filename)).isFile()) {
    return Promise.reject(new Error(`script is not existing file ${filename}`));
  }
}

async function validateConditionalCheck(component) {
  if (!(component.hasOwnProperty("condition") && typeof component.condition === "string")) {
    return Promise.reject(new Error(`condition is not specified ${component.name}`));
  }
  return Promise.resolve();
}

async function validateForLoop(component) {
  if (!(component.hasOwnProperty("start") && typeof component.start === "number")) {
    return Promise.reject(new Error(`start is not specified ${component.name}`));
  }

  if (!(component.hasOwnProperty("step") && typeof component.step === "number")) {
    return Promise.reject(new Error(`step is not specified ${component.name}`));
  }

  if (!(component.hasOwnProperty("end") && typeof component.end === "number")) {
    return Promise.reject(new Error(`end is not specified ${component.name}`));
  }

  if (component.step === 0 || (component.end - component.start) * component.step < 0) {
    return Promise.reject(new Error(`inifinite loop ${component.name}`));
  }
  return Promise.resolve();
}

async function validateParameterStudy(projectRootDir, component) {
  if (!(component.hasOwnProperty("parameterFile") && typeof component.parameterFile === "string")) {
    return Promise.reject(new Error(`parameter setting file is not specified ${component.name}`));
  }
  const componentDir = await getComponentDir(projectRootDir, component.ID, true);
  return fs.access(path.resolve(componentDir, component.parameterFile));
}

async function validateForeach(component) {
  if (!Array.isArray(component.indexList)) {
    return Promise.reject(new Error(`index list is broken ${component.name}`));
  }

  if (component.indexList.length <= 0) {
    return Promise.reject(new Error(`index list is empty ${component.name}`));
  }
  return Promise.resolve();
}

async function recursiveGetHosts(projectRootDir, parentID, hosts) {
  const promises = [];
  const children = await getChildren(projectRootDir, parentID);
  for (const component of children) {
    if (component.type === "task" && component.host !== "localhost") {
      hosts.push(component.host);
    }
    if (hasChild(component)) {
      promises.push(recursiveGetHosts(projectRootDir, component.ID, hosts));
    }
  }
  return Promise.all(promises);
}

async function getHosts(projectRootDir, rootID) {
  const hosts = [];
  await recursiveGetHosts(projectRootDir, rootID, hosts);
  return Array.from(new Set(hosts)); //remove duplicate
}

/**
 * validate all components in workflow
 */
async function validateComponents(projectRootDir, parentID) {
  const promises = [];
  const children = await getChildren(projectRootDir, parentID);

  for (const component of children) {
    if (component.type === "task") {
      promises.push(validateTask(projectRootDir, component));
    } else if (component.type === "if" || component.type === "while") {
      promises.push(validateConditionalCheck(component));
    } else if (component.type === "for") {
      promises.push(validateForLoop(component));
    } else if (component.type === "parameterStudy") {
      promises.push(validateParameterStudy(projectRootDir, component));
    } else if (component.type === "foreach") {
      promises.push(validateForeach(component));
    }

    if (hasChild(component)) {
      promises.push(validateComponents(projectRootDir, component.ID));
    }
  }

  const hasInitialNode = children.some((component)=>{
    return isInitialComponent(component);
  });

  if (!hasInitialNode) {
    promises.push(Promise.reject(new Error("no component can be run")));
  }

  return Promise.all(promises);
}


/**
 * add suffix to dirname and make directory
 * @param basename dirname
 * @param suffix   number
 * @returns actual directory name
 *
 * makeDir create "basenme+suffix" direcotry. suffix is increased until the dirname is no longer duplicated.
 */
async function makeDir(basename, argSuffix) {
  let suffix = argSuffix;

  while (await fs.pathExists(basename + suffix)) {
    ++suffix;
  }

  const dirname = basename + suffix;
  await fs.mkdir(dirname);
  return dirname;
}

function componentJsonReplacer(key, value) {
  if (["handler", "doCleanup", "sbsID"].includes(key)) {
    //eslint-disable-next-line no-undefined
    return undefined;
  }
  return value;
}

async function renameComponentDir(projectRootDir, ID, newName) {
  if (!isValidName(newName)) {
    return new Error(`${value} is not valid component name`);
  }
  const oldDir = await getComponentDir(projectRootDir, ID, true);
  if (oldDir === projectRootDir) {
    return new Error("updateNode can not rename root workflow");
  }
  const newDir = path.resolve(path.dirname(oldDir), newName);
  await gitRm(projectRootDir, oldDir);
  await fs.move(oldDir, newDir);
  return updateComponentPath(projectRootDir, ID, newDir);
}

async function updateComponent(projectRootDir, ID, prop, value) {
  if (prop === "path") {
    return new Error("path property is deprecated. please use 'name' instead.");
  }
  if (prop === "inputFiles" || prop === "outputFiles") {
    return new Error(`updateNode does not support ${prop}. please use renameInputFile or renameOutputFile`);
  }
  if (prop === "name") {
    await renameComponentDir(projectRootDir, ID, value);
  }
  const componentDir = await getComponentDir(projectRootDir, ID, true);
  const filename = path.join(componentDir, componentJsonFilename);
  const componentJson = await readJsonGreedy(filename);

  componentJson[prop] = value;
  await fs.writeJson(filename, componentJson, { spaces: 4, replacer: componentJsonReplacer });
  return gitAdd(projectRootDir, filename);
}


async function createNewComponent(projectRootDir, parentDir, type, pos) {
  const parentJson = await readJsonGreedy(path.resolve(parentDir, componentJsonFilename));
  const parentID = parentJson.ID;

  //create component directory and Json file
  const absDirName = await makeDir(path.resolve(parentDir, type), 0);
  const newComponent = componentFactory(type, pos, parentID);
  newComponent.name = path.basename(absDirName);

  const filename = path.join(absDirName, componentJsonFilename);
  await fs.writeJson(filename, newComponent, { spaces: 4, replacer: componentJsonReplacer });
  await gitAdd(projectRootDir, filename);


  //update path map
  await updateComponentPath(projectRootDir, newComponent.ID, absDirName);

  return newComponent;
}
async function addInputFile() {
}
async function addOutputFile() {
}
async function addLink() {
}
async function addFileLink() {
}


module.exports = {
  componentJsonReplacer,
  updateComponent,
  createNewComponent,
  validateComponents,
  getHosts,
  addInputFile,
  addOutputFile,
  addLink,
  addFileLink
};
