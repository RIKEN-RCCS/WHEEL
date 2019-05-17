"use strict";
const fs = require("fs-extra");
const path = require("path");
const pathIsInside = require("path-is-inside");

const { componentFactory } = require("./workflowComponent");
const { defaultCleanupRemoteRoot, projectJsonFilename, componentJsonFilename } = require("../db/db");
const { getDateString } = require("../lib/utility");
const { replacePathsep, convertPathSep } = require("./pathUtils");
const { readJsonGreedy } = require("./fileUtils");
const { gitInit, gitAdd } = require("./gitOperator");

/**
 * read component JSON file and return children's ID
 * @param {string} projectRootDir - project projectRootDir's absolute path
 * @param {string} ID - ID string of search root component
 * @returns {string[]} - array of id string
 */
async function getDescendantsIDs(projectRootDir, ID) {
  const filename = path.resolve(projectRootDir, projectJsonFilename);
  const projectJson = await readJsonGreedy(filename);
  const poi = await getComponentDir(projectRootDir, ID, true);
  const rt = [];

  for (const [id, componentPath] of Object.entries(projectJson.componentPath)) {
    if (pathIsInside(path.resolve(projectRootDir, componentPath), poi)) {
      rt.push(id);
    }
  }
  return rt;
}

/**
 * create new project dir, initial files and new git repository
 * @param {string} projectRootDir - project projectRootDir's absolute path
 * @param {string} projectName - project name without suffix
 * @param {string} description - project description text
 * @param {string} user - username of project owner
 * @param {string} mail - mail address of project owner
 * @param {Object} logger - log4js instance
 */
async function createNewProject(projectRootDir, name, description, user, mail, logger) {
  description = description != null ? description : "This is new project.";
  await fs.ensureDir(projectRootDir);

  //write root workflow
  const rootWorkflowFileFullpath = path.join(projectRootDir, componentJsonFilename);
  const rootWorkflow = componentFactory("workflow");
  rootWorkflow.name = name;
  rootWorkflow.cleanupFlag = defaultCleanupRemoteRoot === 0 ? 0 : 1;

  if (logger) {
    logger.debug(rootWorkflow);
  }
  await fs.writeJson(rootWorkflowFileFullpath, rootWorkflow, { spaces: 4 });

  //write project JSON
  const timestamp = getDateString(true);
  const projectJson = {
    version: 2,
    name,
    description,
    state: "not-started",
    root: projectRootDir,
    ctime: timestamp,
    mtime: timestamp,
    componentPath: {}
  };
  projectJson.componentPath[rootWorkflow.ID] = "./";
  const projectJsonFileFullpath = path.resolve(projectRootDir, projectJsonFilename);
  if (logger) {
    logger.debug(projectJson);
  }
  await fs.writeJson(projectJsonFileFullpath, projectJson, { spaces: 4 });
  return gitInit(projectRootDir, user, mail);
}

async function removeComponentPath(projectRootDir, IDs, force = false) {
  const filename = path.resolve(projectRootDir, projectJsonFilename);
  const projectJson = await readJsonGreedy(filename);

  for (const [id, componentPath] of Object.entries(projectJson.componentPath)) {
    if (IDs.includes(id)) {
      if (force || !await fs.pathExists(path.join(projectRootDir, componentPath))) {
        delete projectJson.componentPath[id];
      }
    }
  }

  //write project Json file
  await fs.writeJson(filename, projectJson, { spaces: 4 });
  return gitAdd(projectRootDir, filename);
}

async function updateComponentPath(projectRootDir, ID, absPath) {
  const filename = path.resolve(projectRootDir, projectJsonFilename);
  const projectJson = await readJsonGreedy(filename);

  //normalize path
  let newRelativePath = replacePathsep(path.relative(projectRootDir, absPath));
  if (!newRelativePath.startsWith(".")) {
    newRelativePath = `./${newRelativePath}`;
  }

  //if ID is already in componentPath, rewrite all desecndants' path
  const oldRelativePath = projectJson.componentPath[ID];
  if (typeof oldRelativePath !== "undefined") {
    for (const [k, v] of Object.entries(projectJson.componentPath)) {
      if (pathIsInside(convertPathSep(v), convertPathSep(oldRelativePath))) {
        projectJson.componentPath[k] = v.replace(oldRelativePath, newRelativePath);
      }
    }
  }

  //update componentPath
  projectJson.componentPath[ID] = newRelativePath;

  //write project Json file
  await fs.writeJson(filename, projectJson, { spaces: 4 });
  return gitAdd(projectRootDir, filename);
}

async function setProjectState(projectRootDir, state) {
  const filename = path.resolve(projectRootDir, projectJsonFilename);
  const projectJson = await readJsonGreedy(filename);
  if (projectJson === state) {
    return Promise.resolve();
  }
  projectJson.state = state;
  const timestamp = getDateString(true);
  projectJson.ctime = timestamp;
  projectJson.mtime = timestamp;
  await fs.writeJson(filename, projectJson, { spaces: 4 });
  return gitAdd(projectRootDir, filename);
}

async function getComponentDir(projectRootDir, ID, isAbsolute) {
  const projectJson = await readJsonGreedy(path.resolve(projectRootDir, projectJsonFilename));
  const relativePath = projectJson.componentPath[ID];
  if (relativePath) {
    return isAbsolute ? path.resolve(projectRootDir, relativePath) : relativePath;
  }
  return null;
}

module.exports = {
  createNewProject,
  updateComponentPath,
  removeComponentPath,
  getComponentDir,
  getDescendantsIDs,
  setProjectState
};
