"use strict";
const { promisify } = require("util");
const memMeasurement = process.env.NODE_ENV === "development" && process.env.MEMORY_MONITOR;
const fs = require("fs-extra");
const path = require("path");
const klaw = require("klaw");
const ARsshClient = require("arssh2-client");
const glob = require("glob");
const Dispatcher = require("../core/dispatcher");
const { createSshConfig, emitLongArray } = require("./utility");
const { readJsonGreedy } = require("../core/fileUtils");
const { getDateString } = require("../lib/utility");
const { interval, remoteHost, jobScheduler, defaultCleanupRemoteRoot, projectJsonFilename, componentJsonFilename } = require("../db/db");
const { getChildren, isInitialNode } = require("./workflowUtil");
const { getNumberOfUpdatedTasks, emitEvent } = require("./projectResource");
const { updateAndSendProjectJson, sendWorkflow, getComponentDir, componentJsonReplacer, getComponent } = require("./workflowUtil");
const { hasChild } = require("../core/workflowComponent");
const { openProject, addSsh, removeSsh, getUpdatedTaskStateList, setRootDispatcher, getRootDispatcher, deleteRootDispatcher, cleanProject, once, getTasks, clearDispatchedTasks, removeListener, getLogger } = require("./projectResource");
const { gitAdd, gitCommit, gitResetHEAD } = require("../core/gitOperator");
const { cancel } = require("../core/executer");
const { killTask, taskStateFilter } = require("./taskUtil");
const { validateComponents } = require("../core/componentFilesOperator");
const blockSize = 100; //max number of elements which will be sent via taskStateList at one time

async function sendTaskStateList(emit, projectRootDir) {
  const p = [];
  klaw(projectRootDir)
    .on("data", (item)=>{
      if (!item.path.endsWith(componentJsonFilename)) {
        return;
      }
      p.push(readJsonGreedy(item.path));
    })
    .on("end", async()=>{
      const jsonFiles = await Promise.all(p);
      const data = jsonFiles
        .filter((e)=>{
          return e.type === "task" && e.hasOwnProperty("ancestorsName");
        })
        .map(taskStateFilter);
      await emitLongArray(emit, "taskStateList", data, blockSize);
    });
}

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
      killTask(projectRootDir, task);
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

/**
 * check if all scripts and remote host setting are available or not
 */
async function validationCheck(projectRootDir, rootWfID, sio) {
  let hosts = [];
  //TODO return hosts
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
  getLogger(projectRootDir).debug("run event recieved");
  const emit = sio.emit.bind(sio);

  if (memMeasurement) {
    getLogger(projectRootDir).debug("used heap size at start point =", process.memoryUsage().heapUsed / 1024 / 1024, "MB");
  }

  await runProject(projectRootDir);



  const projectState = projectJson.state;
  if (projectState === "not-started") {
    clearDispatchedTasks(projectRootDir);
  }
  try {
    await validationCheck(projectRootDir, rootWF.ID, sio);
    await gitCommit(projectRootDir, "wheel", "wheel@example.com"); //TODO replace name and mail
  } catch (err) {
    getLogger(projectRootDir).error("invalid root workflow:", err);
    removeSsh(projectRootDir);
    cb(false);
    return;
  }
  await updateAndSendProjectJson(emit, projectRootDir, "running");

  const rootDispatcher = new Dispatcher(projectRootDir, rootWF.ID, projectRootDir, getDateString(), getLogger(projectRootDir), projectJson.componentPath);
  if (rootWF.cleanupFlag === "2") {
    rootDispatcher.doCleanup = defaultCleanupRemoteRoot;
  }
  setRootDispatcher(projectRootDir, rootDispatcher);

  //event listener for task state changed
  async function onTaskStateChanged() {
    const numTasksToBeSent = getNumberOfUpdatedTasks(projectRootDir);
    getLogger(projectRootDir).trace("TaskStateList: taskStateChanged event fired", numTasksToBeSent);
    await emitLongArray(emit, "taskStateList", getUpdatedTaskStateList(projectRootDir), blockSize);
    getLogger(projectRootDir).trace("TaskStateList: emit taskStateList done");
    setTimeout(()=>{
      getLogger(projectRootDir).trace("TaskStateList: event lister registerd");
      const remaining = getNumberOfUpdatedTasks(projectRootDir);
      once(projectRootDir, "taskStateChanged", onTaskStateChanged);

      if (remaining.length > 0) {
        setImmediate(()=>{
          emitEvent(projectRootDir, "taskStateChanged");
        });
      }
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
      getLogger(projectRootDir).debug("used heap size just before execution", process.memoryUsage().heapUsed / 1024 / 1024, "MB");
      timeout = setInterval(()=>{
        getLogger(projectRootDir).debug("used heap size ", process.memoryUsage().heapUsed / 1024 / 1024, "MB");
      }, 30000);
    }

    rootWF.state = await rootDispatcher.start();
    const filename = path.resolve(projectRootDir, componentJsonFilename);
    await fs.writeJson(filename, rootWF, { spaces: 4, replacer: componentJsonReplacer });

    const projectLastState = await getState(projectRootDir);
    await updateAndSendProjectJson(emit, projectRootDir, projectLastState);

    if (memMeasurement) {
      getLogger(projectRootDir).debug("used heap size immediately after execution=", process.memoryUsage().heapUsed / 1024 / 1024, "MB");
      clearInterval(timeout);
    }
  } catch (err) {
    getLogger(projectRootDir).error("fatal error occurred while parsing workflow:", err);
    await updateAndSendProjectJson(emit, projectRootDir, "failed");
    cb(false);
    return;
  }

  removeListener(projectRootDir, "taskStateChanged", onTaskStateChanged);
  removeListener(projectRootDir, "componentStateChanged", onComponentStateChanged);

  try {
    //directly send last status just in case
    await updateAndSendProjectJson(emit, projectRootDir);
    await emitLongArray(emit, "taskStateList", getUpdatedTaskStateList(projectRootDir), blockSize);
    await sendWorkflow(emit, projectRootDir);
    rootDispatcher.remove();
    deleteRootDispatcher(projectRootDir);
    removeSsh(projectRootDir);

    if (memMeasurement) {
      getLogger(projectRootDir).debug("used heap size at the end", process.memoryUsage().heapUsed / 1024 / 1024, "MB");
    }
  } catch (e) {
    getLogger(projectRootDir).warn("project execution is successfully finished but error occurred in cleanup process", e);
    cb(false);
    return;
  }

  cb(true);
}

async function onPauseProject(emit, projectRootDir, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("pause event recieved");
  const rootDispatcher = getRootDispatcher(projectRootDir);

  if (rootDispatcher) {
    rootDispatcher.pause();
  }

  //TODO dispatcherから各ワークフローのstatusを取り出してファイルに書き込む必要あり
  await cancelDispatchedTasks(projectRootDir);
  removeSsh(projectRootDir);
  await updateAndSendProjectJson(emit, projectRootDir, "paused");
  getLogger(projectRootDir).debug("pause project done");
  cb();
}

async function onCleanProject(emit, projectRootDir, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("clean event recieved");
  const rootDispatcher = getRootDispatcher(projectRootDir);

  if (rootDispatcher) {
    rootDispatcher.remove();
    deleteRootDispatcher(projectRootDir);
  }
  await cancelDispatchedTasks(projectRootDir);
  clearDispatchedTasks(projectRootDir);
  await emitLongArray(emit, "taskStateList", [], blockSize);
  await cleanProject(projectRootDir);
  await openProject(projectRootDir);
  await sendWorkflow(emit, projectRootDir);
  await updateAndSendProjectJson(emit, projectRootDir, "not-started");
  getLogger(projectRootDir).debug("clean project done");
  cb();
}

async function onSaveProject(emit, projectRootDir, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("saveProject event recieved");

  const projectState = await getProjectState(projectRootDir);
  if (projectState === "not-started") {
    await gitCommit(projectRootDir, "wheel", "wheel@example.com");//TODO replace name and mail
    await updateAndSendProjectJson(emit, projectRootDir);
  } else {
    getLogger(projectRootDir).error(projectState, "project can not be saved");
  }
  getLogger(projectRootDir).debug("save project done");
  cb();
}

async function onRevertProject(emit, projectRootDir, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("revertProject event recieved");
  await gitResetHEAD(projectRootDir);
  await updateAndSendProjectJson(emit, projectRootDir, "not-started");
  await sendWorkflow(emit, projectRootDir);
  getLogger(projectRootDir).debug("revert project done");
  cb();
}

async function onUpdateProjectJson(emit, projectRootDir, prop, value, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("updateProjectJson event recieved:", prop, value);
  const filename = path.resolve(projectRootDir, projectJsonFilename);

  try {
    const projectJson = await readJsonGreedy(filename);
    projectJson[prop] = value;
    projectJson.mtime = getDateString(true);
    await fs.writeJson(filename, projectJson, { spaces: 4 });
    await gitAdd(projectRootDir, filename);
  } catch (e) {
    getLogger(projectRootDir).error("update project Json failed", e);
    cb(false);
    return;
  }
  getLogger(projectRootDir).debug("updateProjectJson done");
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
    getLogger(projectRootDir).error("send project state failed", e);
    cb(false);
    return;
  }
  getLogger(projectRootDir).debug("send project state done");
  cb(true);
}

async function onGetProjectJson(emit, projectRootDir, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }

  try {
    await updateAndSendProjectJson(emit, projectRootDir);
  } catch (e) {
    getLogger(projectRootDir).error("send project state failed", e);
    cb(false);
    return;
  }
  getLogger(projectRootDir).debug("send task state list done");
  cb(true);
}

async function onTaskStateListRequest(emit, projectRootDir, msg, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("getTaskStateList event recieved:", msg);

  try {
    await sendTaskStateList(emit, projectRootDir);
  } catch (e) {
    getLogger(projectRootDir).error("send task state list failed", e);
    cb(false);
    return;
  }
  getLogger(projectRootDir).debug("send task state list done");
  cb(true);
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
