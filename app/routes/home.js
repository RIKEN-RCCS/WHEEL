"use strict";
const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const { promisify } = require("util");
const express = require("express");
const uuidv1 = require("uuid/v1");
const glob = require("glob");
const { getLogger } = require("../logSettings");
const logger = getLogger("home");
const fileBrowser = require("./fileBrowser");
const { gitAdd, gitRm, gitCommit, gitInit, gitResetHEAD } = require("./gitOperator");
const { hasChild } = require("./workflowUtil");
const ComponentFactory = require("./workflowComponent");
const { projectList, defaultCleanupRemoteRoot, projectJsonFilename, componentJsonFilename, suffix, rootDir } = require("../db/db");
const { getDateString, escapeRegExp, isValidName, readJsonGreedy, convertPathSep } = require("./utility");
//eslint-disable-next-line no-useless-escape
const noDotFiles = /^[^\.].*$/;

const oldProjectJsonFilename = "swf.prj.json";

//const noWheelDir = new RegExp(`^(?!^.*${escapeRegExp(suffix)}$).*$`);

function isDuplicateProjectName(newName) {
  const currentProjectList = projectList.getAll();
  if (currentProjectList.length === 0) {
    return false;
  }
  const rt = currentProjectList.some((e)=>{
    const projectName = path.basename(e.path.slice(0, -suffix.length));
    return projectName === newName;
  });
  return rt;
}

function avoidDuplicatedProjectName(basename, argSuffix) {
  let suffixNumber = argSuffix;
  while (isDuplicateProjectName(basename + suffixNumber)) {
    ++suffixNumber;
  }
  return basename + suffixNumber;
}

/**
 * create new project dir, initial files and new git repository
 * @param {string} root - project root's absolute path
 * @param {string} projectName - project name without suffix
 * @param {string} description - project description text
 */
async function createNewProject(root, name, description) {
  description = description != null ? description : "This is new project.";
  await fs.ensureDir(root);

  //write root workflow
  const rootWorkflowFileFullpath = path.join(root, componentJsonFilename);
  const rootWorkflow = new ComponentFactory("workflow");
  rootWorkflow.name = name;
  rootWorkflow.cleanupFlag = defaultCleanupRemoteRoot === 0 ? 0 : 1;
  logger.debug(rootWorkflow);
  await fs.writeJson(rootWorkflowFileFullpath, rootWorkflow, { spaces: 4 });

  //write project JSON
  const timestamp = getDateString(true);
  const projectJson = {
    version: 2,
    name,
    description,
    state: "not-started",
    root,
    ctime: timestamp,
    mtime: timestamp,
    componentPath: {}
  };
  projectJson.componentPath[rootWorkflow.ID] = "./";
  const projectJsonFileFullpath = path.resolve(root, projectJsonFilename);
  logger.debug(projectJson);
  await fs.writeJson(projectJsonFileFullpath, projectJson, { spaces: 4 });
  return gitInit(root, "wheel", "wheel@example.com"); //TODO replace by user info
}

async function getAllProject() {
  const pj = await Promise.all(projectList.getAll().map(async(v)=>{
    let rt;

    try {
      const projectJson = await readJsonGreedy(path.join(v.path, projectJsonFilename));
      rt = Object.assign(projectJson, v);
    } catch (err) {
      logger.warn(v, "read failed remove from the list");
      projectList.remove(v.id);
      rt = null;
    }
    return rt;
  }));

  return pj.filter((e)=>{
    return e !== null;
  });
}

async function adaptorSendFiles(withFile, emit, msg, cb) {
  const target = msg ? path.normalize(convertPathSep(msg)) : rootDir || os.homedir() || "/";
  const request = msg || target;

  try {
    const result = await fileBrowser(target, {
      request,
      sendFilename: withFile,
      filter: {
        all: noDotFiles,
        file: new RegExp(`^.*(?:${escapeRegExp(projectJsonFilename)}|${escapeRegExp(oldProjectJsonFilename)})$`),
        dir: null
      },
      withParentDir: true
    });
    emit("fileList", result);
  } catch (e) {
    logger.error("error occurred during reading directory", e);
    cb(false);
    return;
  }
  cb(true);
}

function removeTrailingPathSep(filename) {
  if (filename.endsWith(path.sep)) {
    return removeTrailingPathSep(filename.slice(0, -1));
  }
  return filename;
}

async function sendProjectListIfExists(emit, cb) {
  try {
    const pjList = await getAllProject();

    if (pjList) {
      emit("projectList", pjList);
    }
  } catch (e) {
    cb(false);
    return;
  }
  cb(true);
}

//socket.IO event handlers
async function onAddProject(emit, projectDir, description, cb) {
  logger.debug("add project event recieved:", projectDir, description);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  let projectRootDir = path.normalize(removeTrailingPathSep(convertPathSep(projectDir)));

  if (!projectRootDir.endsWith(suffix)) {
    projectRootDir += suffix;
  }
  projectRootDir = path.resolve(projectRootDir);

  const projectName = path.basename(projectRootDir.slice(0, -suffix.length));

  if (!isValidName(projectName)) {
    logger.error(projectName, "is not allowed for project name");
    cb(false);
    return;
  }
  if (isDuplicateProjectName(projectName)) {
    logger.error(projectName, "is already used");
    cb(false);
    return;
  }

  try {
    await createNewProject(projectRootDir, projectName, description);
  } catch (e) {
    logger.error("create project failed.", e);
    cb(false);
    return;
  }
  projectList.unshift({ path: projectRootDir });
  await sendProjectListIfExists(emit, cb);
}

function getComponentJsonFilename(type) {
  let filename = null;
  if (type === "workflow") {
    filename = "define.wf.json";
  } else if (type === "parameterStudy") {
    filename = "define.ps.json";
  } else if (type === "for") {
    filename = "define.fr.json";
  } else if (type === "while") {
    filename = "define.wl.json";
  } else if (type === "foreach") {
    filename = "define.fe.json";
  }
  return filename;
}

async function convertComponentJson(projectRootDir, componentPath, parentComponentJson, parentID) {
  logger.debug(`converting: ${parentComponentJson}`);
  const componentJson = await fs.readJson(parentComponentJson);
  delete componentJson.jsonFile;
  delete componentJson.path;
  delete componentJson.index;

  componentJson.ID = parentID || uuidv1();

  //remove depricated props, add ID to child components and register to componentPath
  for (const node of componentJson.nodes) {
    if (node === null) {
      continue;
    }
    delete node.jsonFile;
    delete node.path;
    delete node.index;
    node.parent = componentJson.ID;
    node.ID = uuidv1();
    componentPath[node.ID] = path.relative(projectRootDir, path.join(path.dirname(parentComponentJson), node.name));
  }
  //fix next, else, previous, inputFiles, outputFiles then write json file and recursive call if component has child
  for (const node of componentJson.nodes) {
    if (node === null) {
      continue;
    }
    if (hasChild(node)) {
      const oldComponentJsonFilename = getComponentJsonFilename(node.type);
      await convertComponentJson(projectRootDir, componentPath, path.resolve(path.dirname(parentComponentJson), node.name, oldComponentJsonFilename), node.ID);
    }

    node.next = node.next.map((index)=>{
      return componentJson.nodes[index].ID;
    });

    node.previous = node.previous.map((index)=>{
      return componentJson.nodes[index].ID;
    });

    if (node.type === "if") {
      node.else = node.else.map((index)=>{
        return componentJson.nodes[index].ID;
      });
    }

    node.inputFiles = node.inputFiles.map((inputFile)=>{
      const srcID = inputFile.srcNode === "parent" ? componentJson.ID : componentJson.nodes[inputFile.srcNode].ID;
      return { name: inputFile.name, src: [{ srcNode: srcID, srcName: inputFile.srcName }] };
    });

    node.outputFiles = node.outputFiles.map((outputFile)=>{
      const dst = outputFile.dst.map((e)=>{
        const dstID = e.dstNode === "parent" ? componentJson.ID : componentJson.nodes[e.dstNode].ID;
        return { dstNode: dstID, dstName: e.dstName };
      });
      return { name: outputFile.name, dst };
    });

    const filename = path.resolve(path.dirname(parentComponentJson), node.name, componentJsonFilename);
    delete node.nodes;
    await fs.writeJson(filename, node, { spaces: 4 });
    await gitAdd(projectRootDir, filename);
    logger.debug(`write converted componentJson file to ${filename}`);
    logger.debug(node);
  }

  delete componentJson.nodes;
  await gitRm(projectRootDir, parentComponentJson);
  await fs.remove(parentComponentJson);
  return componentJson;
}

async function convertProjectFormat(projectJsonFilepath) {
  const projectRootDir = path.dirname(projectJsonFilepath);
  const projectJson = await fs.readJson(projectJsonFilepath);
  const rootWorkflow = path.resolve(projectRootDir, projectJson.path_workflow);
  projectJson.version = 2;
  delete projectJson.path;
  delete projectJson.path_workflow;
  projectJson.root = projectRootDir;
  projectJson.mtime = getDateString(true);
  projectJson.componentPath = {};

  try {
    const rootWF = await convertComponentJson(projectRootDir, projectJson.componentPath, path.resolve(projectRootDir, rootWorkflow));
    rootWF.paret = "this is root";
    projectJson.componentPath[rootWF.ID] = "./";
    await fs.writeJson(path.resolve(projectRootDir, componentJsonFilename), rootWF, { spaces: 4 });
  } catch (e) {
    //revert by clean project
    const files = await promisify(glob)(`./**/${componentJsonFilename}`, { cwd: projectRootDir });
    await Promise.all(files.map((file)=>{
      return fs.remove(path.resolve(projectRootDir, file));
    }));
    await gitResetHEAD(projectRootDir);
    throw (e);
  }

  await fs.writeJson(path.resolve(projectRootDir, projectJsonFilename), projectJson, { spaces: 4 });
  logger.debug(`write converted projectJson file to ${path.resolve(projectRootDir, projectJsonFilename)}`);
  logger.debug(projectJson);

  //remove old project Json file
  await gitRm(projectRootDir, projectJsonFilepath);
  await fs.remove(projectJsonFilepath);
  await gitAdd(projectRootDir, path.resolve(projectRootDir, projectJsonFilename));
  const name = "wheel";
  const mail = "wheel.example.com";
  await gitCommit(projectRootDir, name, mail, "convert old format project");
}

async function onImportProject(emit, projectJsonFilepath, cb) {
  logger.debug("import: ", projectJsonFilepath);
  projectJsonFilepath = convertPathSep(projectJsonFilepath);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }

  const reOldProjectJsonFilename = new RegExp(escapeRegExp(oldProjectJsonFilename));
  if (reOldProjectJsonFilename.test(projectJsonFilepath) && !await fs.pathExists(path.resolve(path.dirname(projectJsonFilepath), projectJsonFilename))) {
    logger.debug("converting old format project");

    try {
      await convertProjectFormat(projectJsonFilepath);
      projectJsonFilepath = path.resolve(path.dirname(projectJsonFilepath), projectJsonFilename);
    } catch (e) {
      logger.error("fatal error occurred while converting old format project", e);
      cb(false);
      return;
    }
  }


  let projectJson;
  try {
    projectJson = await readJsonGreedy(projectJsonFilepath);
  } catch (e) {
    logger.error("root workflow JSON file read error\n", e);
    cb(false);
    return;
  }
  const projectRootDir = path.dirname(projectJsonFilepath);

  let rootWF;
  try {
    rootWF = await readJsonGreedy(path.join(projectRootDir, componentJsonFilename));
  } catch (e) {
    logger.error("root workflow JSON file read error\n", e);
    cb(false);
    return;
  }

  let projectName = projectJson.name;
  if (!isValidName(projectName)) {
    logger.error(projectName, "is not allowed for project name");
    cb(false);
    return;
  }
  if (isDuplicateProjectName(projectName)) {
    const reResult = /.*(\d+)$/.exec(projectName);
    projectName = reResult === null ? projectName : projectName.slice(0, reResult.index);
    const suffixNumber = reResult === null ? 0 : reResult[1];
    const newName = avoidDuplicatedProjectName(projectName, suffixNumber);
    logger.warn(projectName, "is already used. so this project is renamed to", newName);
    projectName = newName;
  }
  const newProjectRootDir = path.resolve(path.dirname(projectRootDir), projectName + suffix);

  if (projectRootDir !== newProjectRootDir) {
    try {
      await fs.move(projectRootDir, newProjectRootDir);
    } catch (e) {
      logger.error("directory move failed", e);
      cb(false);
      return;
    }

    try {
      projectJson.root = newProjectRootDir;
      projectJson.name = projectName;
      await fs.writeJson(path.resolve(newProjectRootDir, projectJsonFilename), projectJson);
    } catch (e) {
      logger.error("rewrite project JSON failed", e);
      cb(false);
      return;
    }

    try {
      rootWF.name = projectName;
      await fs.writeJson(path.resolve(newProjectRootDir, componentJsonFilename), rootWF);
    } catch (e) {
      logger.error("rewrite root WF JSON failed", e);
      cb(false);
      return;
    }
  }

  if (!await fs.pathExists(path.resolve(newProjectRootDir, ".git"))) {
    try {
      await gitInit(newProjectRootDir, "wheel", "wheel@example.com"); //TODO replace by user info
    } catch (e) {
      logger.error("can not access to git repository", e);
      cb(false);
      return;
    }
  } else {
    //gitAdd
  }
  projectList.unshift({ path: newProjectRootDir });
  await sendProjectListIfExists(emit, cb);
}

async function onRemoveProject(emit, id, cb) {
  logger.debug("remove: ", id);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  const target = projectList.get(id);

  try {
    await fs.remove(target.path);
  } catch (e) {
    logger.error("project directory remove failed: ", target.path);
    cb(false);
    return;
  }
  await projectList.remove(id);
  await sendProjectListIfExists(emit, cb);
}

async function onRenameProject(emit, msg, cb) {
  logger.debug("rename:", msg);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }

  if (!(msg.hasOwnProperty("id") && msg.hasOwnProperty("newName") && msg.hasOwnProperty("path"))) {
    logger.warn("illegal request ", msg);
    cb(false);
    return;
  }

  const newName = msg.newName;

  if (!isValidName(newName)) {
    logger.error(newName, "is not allowed for project name");
    cb(false);
    return;
  }
  if (isDuplicateProjectName(newName)) {
    logger.error(newName, "is already exists");
    cb(false);
    return;
  }

  const oldDir = msg.path;
  const newDir = path.resolve(path.dirname(oldDir), newName + suffix);

  try {
    await fs.move(oldDir, newDir);
    const projectJson = await readJsonGreedy(path.resolve(newDir, projectJsonFilename));
    projectJson.name = newName;
    projectJson.root = newDir;
    await fs.writeJson(path.resolve(newDir, projectJsonFilename), projectJson);
    const rootWorkflow = await readJsonGreedy(path.resolve(newDir, componentJsonFilename));
    rootWorkflow.name = newName;
    await fs.writeJson(path.resolve(newDir, componentJsonFilename), rootWorkflow);
    await gitAdd(newDir, projectJsonFilename);
    await gitAdd(newDir, componentJsonFilename);

    //TODO get from user db
    const name = "wheel";
    const mail = "wheel.example.com";
    await gitCommit(newDir, name, mail);
  } catch (err) {
    logger.error("rename project failed", err);
    cb(false);
    return;
  }

  //rewrite path in project List entry
  const target = projectList.get(msg.id);
  target.path = newDir;
  await projectList.update(target);
  await sendProjectListIfExists(emit, cb);
}

async function onReorderProject(emit, orderList, cb) {
  logger.debug("reorder: ", orderList);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  await projectList.reorder(orderList);
  await sendProjectListIfExists(emit, cb);
}

async function onGetProjectList(emit, cb) {
  logger.debug("getProjectList");

  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  await sendProjectListIfExists(emit, cb);
}

function onGetDirList(emit, msg, cb) {
  logger.debug("getDirList:", msg);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  return adaptorSendFiles(false, emit, msg, cb);
}

function onGetDirListAndProjectJson(emit, msg, cb) {
  logger.debug("getDirListAndProjectJson:", msg);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  return adaptorSendFiles(true, emit, msg, cb);
}

module.exports = function(io) {
  const sio = io.of("/home");
  sio.on("connect", (socket)=>{
    logger.addContext("sio", socket)
    socket.on("getProjectList", onGetProjectList.bind(null, socket.emit.bind(socket)));
    socket.on("getDirList", onGetDirList.bind(null, socket.emit.bind(socket)));
    socket.on("getDirListAndProjectJson", onGetDirListAndProjectJson.bind(null, socket.emit.bind(socket)));
    socket.on("addProject", onAddProject.bind(null, socket.emit.bind(socket)));
    socket.on("importProject", onImportProject.bind(null, socket.emit.bind(socket)));
    socket.on("removeProject", onRemoveProject.bind(null, socket.emit.bind(socket)));
    socket.on("renameProject", onRenameProject.bind(null, socket.emit.bind(socket)));
    socket.on("reorderProject", onReorderProject.bind(null, socket.emit.bind(socket)));
  });
  //eslint-disable-next-line new-cap
  const router = express.Router();
  router.get("/", (req, res)=>{
    res.sendFile(path.join(__dirname, "../views/home.html"));
  });
  return router;
};
