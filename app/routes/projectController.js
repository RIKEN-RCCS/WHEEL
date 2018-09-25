"use strict";
const { promisify } = require("util");
const memMeasurement = process.env.NODE_ENV === "development" && process.env.MEMORY_MONITOR;
const fs = require("fs-extra");
const path = require("path");
const ARsshClient = require("arssh2-client");
const glob = require("glob");
const { getLogger } = require("../logSettings");
const logger = getLogger("workflow");
const Dispatcher = require("./dispatcher");
const { getDateString, createSshConfig, readJsonGreedy } = require("./utility");
const { interval, remoteHost, jobScheduler, defaultCleanupRemoteRoot, projectJsonFilename, componentJsonFilename } = require("../db/db");
const { getChildren, updateAndSendProjectJson, sendWorkflow, getComponentDir, componentJsonReplacer, isInitialNode, hasChild, getComponent } = require("./workflowUtil");
const { openProject, addSsh, removeSsh, getTaskStateList, setRootDispatcher, getRootDispatcher, deleteRootDispatcher, cleanProject, once, getTasks, clearDispatchedTasks, removeListener } = require("./projectResource");
const { gitAdd, gitCommit, gitResetHEAD } = require("./gitOperator");
const { cancel } = require("./executer");
const { killTask } = require("./taskUtil");

async function getProjectState(projectRootDir) {
  const projectJson = await readJsonGreedy(path.resolve(projectRootDir, projectJsonFilename));
  return projectJson.state;
}
async function getState(projectRootDir) {
  const componentJsonFiles = await promisify(glob)(path.join("**", componentJsonFilename), { cwd: projectRootDir });
  const states = await Promise.all(componentJsonFiles.map(async(jsonFile)=>{
    const component = await readJsonGreedy(path.resolve(projectRootDir, jsonFile));
    return component.state;
  }));
  let projectState = "finished";
  for (const state of states) {
    if (state === "unknown") {
      return "unknown";
    }
    if (state === "failed") {
      projectState = "failed";
    }
  }
  return projectState;
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

async function validateTask(projectRootDir, component, hosts) {
  if (component.name === null) {
    return Promise.reject(new Error(`illegal path ${component.name}`));
  }

  if (component.host !== "localhost") {
    hosts.push(component.host);
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
  const componentDir = await getComponentDir(projectRootDir, component.ID);
  return fs.access(path.resolve(componentDir, component.script));
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
  const componentDir = await getComponentDir(projectRootDir, component.ID);
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

/**
 * validate all components in workflow and gather remote hosts which is used in tasks
 */
async function validateComponents(projectRootDir, parentID, hosts) {
  const promises = [];
  const children = await getChildren(projectRootDir, parentID);


  for (const component of children) {
    if (component.type === "task") {
      promises.push(validateTask(projectRootDir, component, hosts));
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
  hosts = Array.from(new Set(hosts)); //remove duplicate

  //ask password to user and make session to each remote hosts
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

    //remoteHostName is name property of remote host entry
    //hostInfo.host is hostname or IP address of remote host
    addSsh(projectRootDir, hostInfo.host, arssh);

    //TODO loopで書き直す
    try {
      //1st try
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
        //2nd try
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
          //3rd try
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

  let projectJson;
  try {
    projectJson = await readJsonGreedy(path.resolve(projectRootDir, projectJsonFilename));
  } catch (err) {
    logger.error("get project state failed:", err);
    cb(false);
    return;
  }

  let rootWF;
  try {
    rootWF = await getComponent(projectRootDir, path.join(projectRootDir, componentJsonFilename));
  } catch (err) {
    logger.error("read root workflow component failed:", err);
    cb(false);
    return;
  }

  const projectState = projectJson.state;
  if (projectState === "not-started") {
    try {
      await validationCheck(projectRootDir, rootWF.ID, sio);
      await gitCommit(projectRootDir, "wheel", "wheel@example.com"); //TODO replace name and mail
      clearDispatchedTasks(projectRootDir);
    } catch (err) {
      logger.error("invalid root workflow:", err);
      removeSsh(projectRootDir);
      cb(false);
      return;
    }
  }
  await updateAndSendProjectJson(emit, projectRootDir, "running");

  const rootDispatcher = new Dispatcher(projectRootDir, rootWF.ID, projectRootDir, getDateString(), logger, projectJson.componentPath);
  if (rootWF.cleanupFlag === "2") {
    rootDispatcher.doCleanup = defaultCleanupRemoteRoot;
  }
  setRootDispatcher(projectRootDir, rootDispatcher);

  //event listener for task state changed
  function onTaskStateChanged() {
    emit("taskStateList", getTaskStateList(projectRootDir, true));
    setTimeout(()=>{
      once(projectRootDir, "taskStateChanged", onTaskStateChanged);
    }, interval);
  }

  //event listener for component state changed
  function onComponentStateChanged() {
    sendWorkflow(emit, projectRootDir)
      .then(()=>{
        setTimeout(()=>{
          once(projectRootDir, "componentStateChanged", onComponentStateChanged);
        }, interval);
      });
  }

  once(projectRootDir, "taskStateChanged", onTaskStateChanged);
  once(projectRootDir, "componentStateChanged", onComponentStateChanged);

  //project start here
  try {
    let timeout;

    if (memMeasurement) {
      logger.debug("used heap size just before execution", process.memoryUsage().heapUsed / 1024 / 1024, "MB");
      timeout = setInterval(()=>{
        logger.debug("used heap size ", process.memoryUsage().heapUsed / 1024 / 1024, "MB");
      }, 30000);
    }

    rootWF.state = await rootDispatcher.start();
    const filename = path.resolve(projectRootDir, componentJsonFilename);
    await fs.writeJson(filename, rootWF, { spaces: 4, replacer: componentJsonReplacer });

    const projectLastState = await getState(projectRootDir);
    await updateAndSendProjectJson(emit, projectRootDir, projectLastState);

    if (memMeasurement) {
      logger.debug("used heap size immediately after execution=", process.memoryUsage().heapUsed / 1024 / 1024, "MB");
      clearInterval(timeout);
    }
  } catch (err) {
    logger.error("fatal error occurred while parsing workflow:", err);
    await updateAndSendProjectJson(emit, projectRootDir, "failed");
    cb(false);
    return;
  }

  removeListener(projectRootDir, "taskStateChanged", onTaskStateChanged);
  removeListener(projectRootDir, "componentStateChanged", onComponentStateChanged);

  try {
    //directly send last status just in case
    await updateAndSendProjectJson(emit, projectRootDir);
    emit("taskStateList", getTaskStateList(projectRootDir));
    await sendWorkflow(emit, projectRootDir);
    rootDispatcher.remove();
    deleteRootDispatcher(projectRootDir);
    removeSsh(projectRootDir);

    if (memMeasurement) {
      logger.debug("used heap size at the end", process.memoryUsage().heapUsed / 1024 / 1024, "MB");
    }
  } catch (e) {
    logger.warn("project execution is successfully finished but error occurred in cleanup process", e);
    cb(false);
    return;
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

  //TODO dispatcherから各ワークフローのstatusを取り出してファイルに書き込む必要あり
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
    await gitCommit(projectRootDir, "wheel", "wheel@example.com");//TODO replace name and mail
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
  await gitResetHEAD(projectRootDir);
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
    const projectJson = await readJsonGreedy(filename);
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
