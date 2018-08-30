"use strict";
const memMeasurement = process.env.NODE_ENV === "development" && process.env.MEMORY_MONITOR;
const fs = require("fs-extra");
const path = require("path");

const ARsshClient = require("arssh2-client");
const { getLogger } = require("../logSettings");
const logger = getLogger("workflow");
const Dispatcher = require("./dispatcher");

const { getDateString, createSshConfig } = require("./utility");
const { interval, remoteHost, defaultCleanupRemoteRoot, projectJsonFilename, componentJsonFilename } = require("../db/db");
const { getChildren, updateAndSendProjectJson, sendWorkflow, getComponentDir } = require("./workflowUtil");
const { openProject, addSsh, removeSsh, getTaskStateList, setRootDispatcher, getRootDispatcher, deleteRootDispatcher, commitProject, revertProject, cleanProject, once, getTasks, clearDispatchedTasks, gitAdd } = require("./projectResource");
const { cancel } = require("./executer");
const { isInitialNode, hasChild, getComponent } = require("./workflowUtil");
const { killTask } = require("./taskUtil");

async function getProjectState(projectRootDir) {
  const projectJson = await fs.readJson(path.resolve(projectRootDir, projectJsonFilename));

  return projectJson.state;
}

function cancelDispatchedTasks(projectRootDir) {
  for (const task of getTasks(projectRootDir)) {
    if (task.state === "finished" || task.state === "failed") {
      continue;
    }
    const canceled = cancel(task);

    if (!canceled) {
      killTask(task);
    }
    task.state = "not-started";
  }
}

function askPassword(sio, hostname) {
  return new Promise((resolve)=>{
    sio.on("password", (data)=>{
      resolve(data);
    });
    sio.emit("askPassword", hostname);
  });
}

async function validateTask(projectRootDir, component, parentID, hosts) {
  if (component.name === null) {
    return Promise.reject(new Error(`illegal path ${component.name}`));
  }
  if (component.host !== "localhost") {
    hosts.push(component.host);
  }
  if (component.script === null) {
    return Promise.reject(new Error(`script is not specified ${component.name}`));
  }
  const parentDir = await getComponentDir(projectRootDir, parentID);

  return fs.pathExists(path.resolve(parentDir, component.name, component.script));
}
async function validateConditionalCheck(component) {
  if (component.hasOwnProperty("condition")) {
    return Promise.reject(new Error(`condition is not specified ${component.name}`));
  }
  return Promise.resolve();
}

async function validateForLoop(component) {
  if (component.hasOwnProperty("start")) {
    return Promise.reject(new Error(`start is not specified ${component.name}`));
  }
  if (component.hasOwnProperty("step")) {
    return Promise.reject(new Error(`step is not specified ${component.name}`));
  }
  if (component.hasOwnProperty("end")) {
    return Promise.reject(new Error(`end is not specified ${component.name}`));
  }
  if (component.step === 0 || (component.end - component.start) * component.step < 0) {
    return Promise.reject(new Error(`inifinite loop ${component.name}`));
  }
  return Promise.resolve();
}

async function validateParameterStudy(component) {
  if (component.hasOwnProperty("parameterFile")) {
    return Promise.reject(new Error(`parameter setting file is not specified ${component.name}`));
  }
  return Promise.resolve();
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

/**
 * validate all components in workflow and gather remote hosts which is used in tasks
 */
async function validateComponents(projectRootDir, parentID, hosts) {
  const promises = [];
  const children = await getChildren(projectRootDir, parentID);


  for (const component of children) {
    if (component.type === "task") {
      promises.push(validateTask(projectRootDir, component, parentID, hosts));
    } else if (component.type === "if" || component.type === "while") {
      promises.push(validateConditionalCheck(component));
    } else if (component.type === "for") {
      promises.push(validateForLoop(component));
    } else if (component.type === "parameterStudy") {
      promises.push(validateParameterStudy(component));
    } else if (component.type === "foreach") {
      promises.push(validateForeach(component));
    }
    if (hasChild(component)) {
      promises.push(validateComponents(projectRootDir, component.ID, hosts));
    }
  }

  const hasInitialNode = children.some((component)=>{
    return isInitialNode(component);
  });

  if (!hasInitialNode) {
    promises.push(Promise.reject(new Error("no component can be run")));
  }

  return Promise.all(promises);
}

/**
 * check if all scripts and remote host setting are available or not
 */
async function validationCheck(projectRootDir, rootWfID, sio) {
  let hosts = [];

  await validateComponents(projectRootDir, rootWfID, hosts);
  hosts = Array.from(new Set(hosts)); // remove duplicate

  // ask password to user and make session to each remote hosts
  for (const remoteHostName of hosts) {
    const id = remoteHost.getID("name", remoteHostName);
    const hostInfo = remoteHost.get(id);

    if (!hostInfo) {
      return Promise.reject(new Error(`illegal remote host specified ${remoteHostName}`));
    }
    const password = await askPassword(sio, remoteHostName);
    const config = await createSshConfig(hostInfo, password);
    const arssh = new ARsshClient(config, { connectionRetryDelay: 1000, verbose: true });

    if (hostInfo.renewInterval) {
      arssh.renewInterval = hostInfo.renewInterval * 60 * 1000;
    }
    if (hostInfo.renewDelay) {
      arssh.renewDelay = hostInfo.renewDelay * 1000;
    }

    // remoteHostName is name property of remote host entry
    // hostInfo.host is hostname or IP address of remote host
    addSsh(projectRootDir, hostInfo.host, arssh);

    // TODO loopで書き直す
    try {

      // 1st try
      await arssh.canConnect();
    } catch (e) {
      if (e.reason !== "invalid passphrase" && e.reason !== "authentication failure") {
        return Promise.reject(e);
      }
      let newPassword = await askPassword(sio, remoteHostName);

      if (config.passphrase) {
        config.passphrase = newPassword;
      }
      if (config.password) {
        config.password = newPassword;
      }
      arssh.overwriteConfig(config);
      try {

        // 2nd try
        await arssh.canConnect();
      } catch (e2) {
        if (e2.reason !== "invalid passphrase" && e2.reason !== "authentication failure") {
          return Promise.reject(e2);
        }
        newPassword = await askPassword(sio, remoteHostName);

        if (config.passphrase) {
          config.passphrase = newPassword;
        }
        if (config.password) {
          config.password = newPassword;
        }
        arssh.overwriteConfig(config);
        try {

          // 3rd try
          await arssh.canConnect();
        } catch (e3) {
          if (e3.reason !== "invalid passphrase" && e3.reason !== "authentication failure") {
            return Promise.reject(e3);
          }
          return Promise.reject(new Error("wrong password for 3 times"));
        }
      }
    }
  }
  return Promise.resolve();
}


async function onRunProject(sio, projectRootDir, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("run event recieved");
  const emit = sio.emit.bind(sio);

  if (memMeasurement) {
    logger.debug("used heap size at start point =", process.memoryUsage().heapUsed / 1024 / 1024, "MB");
  }
  const projectState = await getProjectState(projectRootDir);
  const rootWF = await getComponent(projectRootDir, path.join(projectRootDir, componentJsonFilename));

  if (projectState === "not-started") {
    try {
      await validationCheck(projectRootDir, rootWF.ID, sio);
    } catch (err) {
      logger.error("invalid root workflow:", err);
      removeSsh(projectRootDir);
      cb(false);
      return;
    }
    await commitProject(projectRootDir);
    clearDispatchedTasks(projectRootDir);
  }
  await updateAndSendProjectJson(emit, projectRootDir, "running");

  const rootDispatcher = new Dispatcher(projectRootDir, rootWF.ID, projectRootDir, getDateString(), logger);

  if (rootWF.cleanupFlag === "2") {
    rootDispatcher.doCleanup = defaultCleanupRemoteRoot;
  }
  setRootDispatcher(projectRootDir, rootDispatcher);

  // event listener for task state changed
  function onTaskStateChanged() {
    emit("taskStateList", getTaskStateList(projectRootDir));
    sendWorkflow(emit, projectRootDir);
    setTimeout(()=>{
      once(projectRootDir, "taskStateChanged", onTaskStateChanged);
    }, interval);
  }

  // event listener for component state changed
  function onComponentStateChanged() {
    sendWorkflow(emit, projectRootDir);
    setTimeout(()=>{
      once(projectRootDir, "componentStateChanged", onComponentStateChanged);
    }, interval);
  }

  once(projectRootDir, "taskStateChanged", onTaskStateChanged);
  once(projectRootDir, "componentStateChanged", onComponentStateChanged);

  // project start here
  try {
    let timeout;

    if (memMeasurement) {
      logger.debug("used heap size just before execution", process.memoryUsage().heapUsed / 1024 / 1024, "MB");
      timeout = setInterval(()=>{
        logger.debug("used heap size ", process.memoryUsage().heapUsed / 1024 / 1024, "MB");
      }, 30000);
    }

    const projectLastState = await rootDispatcher.start();

    if (memMeasurement) {
      logger.debug("used heap size immediately after execution=", process.memoryUsage().heapUsed / 1024 / 1024, "MB");
      clearInterval(timeout);
    }
    await updateAndSendProjectJson(emit, projectRootDir, projectLastState);
  } catch (err) {
    logger.error("fatal error occurred while parsing workflow:", err);
    await updateAndSendProjectJson(emit, projectRootDir, "failed");
    cb(false);
    return;
  }

  updateAndSendProjectJson(emit, projectRootDir);
  emit("taskStateList", getTaskStateList(projectRootDir));
  sendWorkflow(emit, projectRootDir);


  // TODO taskStateChanged とcomponentStateChangedのremoveListener
  rootDispatcher.remove();
  deleteRootDispatcher(projectRootDir);
  removeSsh(projectRootDir);

  // TODO dispatcherから各ワークフローのstatusを取り出してファイルに書き込む必要あり

  if (memMeasurement) {
    logger.debug("used heap size at the end", process.memoryUsage().heapUsed / 1024 / 1024, "MB");
  }
  cb(true);
}

async function onPauseProject(emit, projectRootDir, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("pause event recieved");
  const rootDispatcher = getRootDispatcher(projectRootDir);

  if (rootDispatcher) {
    rootDispatcher.pause();
  }

  // TODO dispatcherから各ワークフローのstatusを取り出してファイルに書き込む必要あり
  await cancelDispatchedTasks(projectRootDir);
  removeSsh(projectRootDir);
  await updateAndSendProjectJson(emit, projectRootDir, "paused");
}
async function onCleanProject(emit, projectRootDir, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("clean event recieved");
  const rootDispatcher = getRootDispatcher(projectRootDir);

  if (rootDispatcher) {
    rootDispatcher.remove();
    deleteRootDispatcher(projectRootDir);
  }
  await cancelDispatchedTasks(projectRootDir);
  clearDispatchedTasks(projectRootDir);
  emit("taskStateList", []);
  await cleanProject(projectRootDir);
  await openProject(projectRootDir);
  await sendWorkflow(emit, projectRootDir);
  await updateAndSendProjectJson(emit, projectRootDir, "not-started");
}

async function onSaveProject(emit, projectRootDir, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("saveProject event recieved");
  const projectState = await getProjectState(projectRootDir);

  if (projectState === "not-started") {
    await commitProject(projectRootDir);
    await updateAndSendProjectJson(emit, projectRootDir);
  } else {
    logger.error(projectState, "project can not be saved");
  }
}
async function onRevertProject(emit, projectRootDir, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("revertProject event recieved");
  await revertProject(projectRootDir);
  await updateAndSendProjectJson(emit, projectRootDir, "not-started");
  await sendWorkflow(emit, projectRootDir);
}

async function onUpdateProjectJson(emit, projectRootDir, prop, value, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("updateProjectJson event recieved:", prop, value);
  const filename = path.resolve(projectRootDir, projectJsonFilename);

  try {
    const projectJson = await fs.readJson(filename);

    projectJson[prop] = value;
    await fs.writeJson(filename, projectJson, { spaces: 4 });
    await gitAdd(projectRootDir, filename);
  } catch (e) {
    logger.error("update project Json failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onGetProjectState(emit, projectRootDir, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  try {
    const state = await getProjectState(projectRootDir);

    emit("projectState", state);
  } catch (e) {
    logger.error("send project state failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onGetProjectJson(emit, projectRootDir, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  try {
    await updateAndSendProjectJson(emit, projectRootDir);
  } catch (e) {
    logger.error("send project state failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onTaskStateListRequest(emit, projectRootDir, msg, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("getTaskStateList event recieved:", msg);
  emit("taskStateList", getTaskStateList(projectRootDir));
}

function registerListeners(socket, projectRootDir) {
  const emit = socket.emit.bind(socket);

  socket.on("runProject", onRunProject.bind(null, socket, projectRootDir));
  socket.on("pauseProject", onPauseProject.bind(null, emit, projectRootDir));
  socket.on("cleanProject", onCleanProject.bind(null, emit, projectRootDir));
  socket.on("saveProject", onSaveProject.bind(null, emit, projectRootDir));
  socket.on("revertProject", onRevertProject.bind(null, emit, projectRootDir));
  socket.on("stopProject", async()=>{
    await onPauseProject(emit, projectRootDir);
    await onCleanProject(emit, projectRootDir);
  });
  socket.on("updateProjectJson", onUpdateProjectJson.bind(null, emit, projectRootDir));
  socket.on("getProjectState", onGetProjectState.bind(null, emit, projectRootDir));
  socket.on("getProjectJson", onGetProjectJson.bind(null, emit, projectRootDir));
  socket.on("getTaskStateList", onTaskStateListRequest.bind(null, emit, projectRootDir));
}

module.exports = registerListeners;
