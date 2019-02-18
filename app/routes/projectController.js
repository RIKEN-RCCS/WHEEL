"use strict";
const { promisify } = require("util");
const fs = require("fs-extra");
const path = require("path");
const pathIsInside = require("path-is-inside");
const klaw = require("klaw");
const ARsshClient = require("arssh2-client");
const glob = require("glob");
const Dispatcher = require("../core/dispatcher");
const { replacePathsep, convertPathSep } = require("../core/pathUtils");
const { createNewComponent, updateComponent } = require("../core/componentFilesOperator");
const { createSshConfig, emitLongArray } = require("./utility");
const { readJsonGreedy } = require("../core/fileUtils");
const { getDateString } = require("../lib/utility");
const { interval, remoteHost, jobScheduler, defaultCleanupRemoteRoot, projectJsonFilename, componentJsonFilename } = require("../db/db");
const { updateComponentJson, getChildren, isInitialNode, getComponentDir, componentJsonReplacer, getComponent } = require("../core/workflowUtil");
const { hasChild } = require("../core/workflowComponent");
const { setCwd, getCwd, getNumberOfUpdatedTasks, emitEvent, on, openProject, addSsh, removeSsh, runProject, pauseProject, clearProject, getUpdatedTaskStateList, getRootDispatcher, deleteRootDispatcher, cleanProject, once, getTasks, clearDispatchedTasks, off, getLogger } = require("../core/projectResource");
const { gitRm, gitAdd, gitCommit, gitResetHEAD } = require("../core/gitOperator");
const { cancel } = require("../core/executer");
const { killTask, taskStateFilter } = require("../core/taskUtil");
const { getHosts } = require("../core/componentFilesOperator");
const blockSize = 100; //max number of elements which will be sent via taskStateList at one time

//read and send current workflow and its child and grandson
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
        if (e.type === "task") {
          return { type: e.type, pos: e.pos, host: e.host, useJobScheduler: e.useJobScheduler };
        }
        return { type: e.type, pos: e.pos };
      });
    }
  }
  emit("workflow", rt);
}

//read and send projectJson
async function sendProjectJson(emit, projectRootDir) {
  const filename = path.resolve(projectRootDir, projectJsonFilename);
  const projectJson = await readJsonGreedy(filename);
  emit("projectJson", projectJson);
}

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

function askPassword(sio, hostname) {
  return new Promise((resolve)=>{
    sio.on("password", (data)=>{
      resolve(data);
    });
    sio.emit("askPassword", hostname);
  });
}

/**
 * create necessary ssh instance
 */
async function createSsh(projectRootDir, hosts, sio) {
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
  getLogger(projectRootDir).debug("run event recieved");

  if (typeof cb !== "function") {
    cb = ()=>{};
  }

  const emit = sio.emit.bind(sio);
  const rootWF = await getComponent(projectRootDir, path.join(projectRootDir, componentJsonFilename));
  const hosts = await getHosts(projectRootDir, rootWF.ID);

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

  //event listner for project state changed
  function onProjectStateChanged(projectJson) {
    emit("projectJson", projectJson);
  }

  once(projectRootDir, "taskStateChanged", onTaskStateChanged);
  once(projectRootDir, "componentStateChanged", onComponentStateChanged);


  //actual project start here
  try {
    await createSsh(projectRootDir, hosts, sio);
    await runProject(projectRootDir);
  } catch (err) {
    getLogger(projectRootDir).error("fatal error occurred while parsing workflow:", err);
    await sendProjectJson(emit, projectRootDir, "failed");
    removeSsh(projectRootDir);
    cb(false);
    return;
  }
  off(projectRootDir, "taskStateChanged", onTaskStateChanged);
  off(projectRootDir, "componentStateChanged", onComponentStateChanged);

  try {
    //directly send last status just in case
    await sendProjectJson(emit, projectRootDir);
    await sendWorkflow(emit, projectRootDir);
    await emitLongArray(emit, "taskStateList", getUpdatedTaskStateList(projectRootDir), blockSize);
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

  try {
    await pauseProject(projectRootDir);
  } catch (e) {
    cb(false);
    return;
  }
  getLogger(projectRootDir).debug("pause project done");
  cb(true);
}

async function onCleanProject(emit, projectRootDir, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("clean event recieved");

  try {
    await cleanProject(projectRootDir);
  } catch (e) {
    cb(false);
    return;
  }
  await emitLongArray(emit, "taskStateList", [], blockSize);
  await sendProjectJson(emit, projectRootDir);
  await sendWorkflow(emit, projectRootDir);
  getLogger(projectRootDir).debug("clean project done");
  cb(true);
}

async function onSaveProject(emit, projectRootDir, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("saveProject event recieved");

  const projectState = await getProjectState(projectRootDir);
  if (projectState === "not-started") {
    await gitCommit(projectRootDir, "wheel", "wheel@example.com");//TODO replace name and mail
    await sendProjectJson(emit, projectRootDir);
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
  await sendProjectJson(emit, projectRootDir, "not-started");
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
    await sendProjectJson(emit, projectRootDir);
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

//this function is used as modifier of updateComponentPath
function changeComponentPath(ID, newPath, projectRootDir, componentPath) {
  const oldRelativePath = componentPath[ID];
  let newRelativePath = path.relative(projectRootDir, newPath);
  if (!newRelativePath.startsWith(".")) {
    newRelativePath = `./${newRelativePath}`;
  }
  if (typeof oldRelativePath !== "undefined") {
    for (const [k, v] of Object.entries(componentPath)) {
      if (pathIsInside(convertPathSep(v), convertPathSep(oldRelativePath))) {
        componentPath[k] = v.replace(oldRelativePath, newRelativePath);
      }
    }
  }
  componentPath[ID] = replacePathsep(newRelativePath);
}

async function updateComponentPath(projectRootDir, modifier) {
  const filename = path.resolve(projectRootDir, projectJsonFilename);
  const projectJson = await readJsonGreedy(filename);

  if (typeof modifier === "function") {
    await modifier(projectRootDir, projectJson.componentPath);
    projectJson.mtime = getDateString(true);
  }

  await fs.writeJson(filename, projectJson, { spaces: 4 });
  await gitAdd(projectRootDir, filename);
}

//return value include search-root itself
async function getDescendantsID(projectRootDir, ID) {
  const filename = path.resolve(projectRootDir, projectJsonFilename);
  const projectJson = await readJsonGreedy(filename);
  const poi = await getComponentDir(projectRootDir, ID);
  const rt = [];

  for (const [id, componentPath] of Object.entries(projectJson.componentPath)) {
    if (pathIsInside(path.resolve(projectRootDir, componentPath), poi)) {
      rt.push(id);
    }
  }
  return rt;
}

async function onWorkflowRequest(emit, projectRootDir, ID, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("Workflow Request event recieved:", projectRootDir, ID);
  const componentDir = await getComponentDir(projectRootDir, ID);
  getLogger(projectRootDir).info("open workflow:", componentDir);

  try {
    await setCwd(projectRootDir, componentDir);
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    getLogger(projectRootDir).error("read workflow failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onCreateNode(emit, projectRootDir, request, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("createNode event recieved:", request);
  let rt = null;

  try {
    const parentDir = getCwd(projectRootDir);
    rt = await createNewComponent(projectRootDir, parentDir, request.type, request.pos);
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    e.projectRootDir = projectRootDir;
    e.request = request;
    getLogger(projectRootDir).error("create node failed", e);
    cb(false);
    return false;
  }
  cb(true);
  return rt;
}

async function onUpdateNode(emit, projectRootDir, ID, prop, value, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("updateNode event recieved:", projectRootDir, ID, prop, value);

  try {
    await updateComponent(projectRootDir, ID, prop, value);
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    e.projectRootDir = projectRootDir;
    e.ID = ID;
    e.prop = prop;
    e.value = value;
    getLogger(projectRootDir).error("update node failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function removeAllLink(projectRootDir, targetID) {
  const counterparts = new Map();
  const component = await getComponent(projectRootDir, targetID);

  for (const previousComponent of component.previous) {
    const counterpart = counterparts.get(previousComponent) || await getComponent(projectRootDir, previousComponent);
    counterpart.next = counterpart.next.filter((e)=>{
      return e !== component.ID;
    });

    if (counterpart.else) {
      counterpart.else = counterpart.else.filter((e)=>{
        return e !== component.ID;
      });
    }
    counterparts.set(counterpart.ID, counterpart);
  }

  for (const nextComponent of component.next) {
    const counterpart = counterparts.get(nextComponent) || await getComponent(projectRootDir, nextComponent);
    counterpart.previous = counterpart.previous.filter((e)=>{
      return e !== component.ID;
    });
    counterparts.set(counterpart.ID, counterpart);
  }

  if (component.else) {
    for (const elseComponent of component.else) {
      const counterpart = counterparts.get(elseComponent) || await getComponent(projectRootDir, elseComponent);
      counterpart.previous = counterpart.previous.filter((e)=>{
        return e !== component.ID;
      });
      counterparts.set(counterpart.ID, counterpart);
    }
  }

  for (const inputFile of component.inputFiles) {
    for (const src of inputFile.src) {
      const srcComponent = src.srcNode;
      const counterpart = counterparts.get(srcComponent) || await getComponent(projectRootDir, srcComponent);

      for (const outputFile of counterpart.outputFiles) {
        outputFile.dst = outputFile.dst.filter((e)=>{
          return e.dstNode !== component.ID;
        });
      }
      counterparts.set(counterpart.ID, counterpart);
    }
  }

  for (const outputFile of component.outputFiles) {
    for (const dst of outputFile.dst) {
      const dstComponent = dst.dstNode;
      const counterpart = counterparts.get(dstComponent) || await getComponent(projectRootDir, dstComponent);

      for (const inputFile of counterpart.inputFiles) {
        inputFile.src = inputFile.src.filter((e)=>{
          return e.srcNode !== component.ID;
        });
      }
      counterparts.set(counterpart.ID, counterpart);
    }
  }

  return Promise.all(Array.from(counterparts, ([, counterpart])=>{
    return updateComponentJson(projectRootDir, counterpart);
  }));
}

async function onRemoveNode(emit, projectRootDir, targetID, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("removeNode event recieved:", projectRootDir, targetID);

  try {
    const nodeDir = await getComponentDir(projectRootDir, targetID);
    const descendantsID = await getDescendantsID(projectRootDir, targetID);

    //remove all link/filelink to or from components to be removed
    for (const descendantID of descendantsID) {
      await removeAllLink(projectRootDir, descendantID);
    }

    //remove all descendants and target component itself from componentPath
    await updateComponentPath(projectRootDir, (root, componentPath)=>{
      for (const descendantID of descendantsID) {
        delete componentPath[descendantID];
      }
    });

    //gitOperator.rm() only remove existing files from git repo if directory is passed
    //so, gitRm and fs.remove must be called in this order
    await gitRm(projectRootDir, nodeDir);
    await fs.remove(nodeDir);

    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    getLogger(projectRootDir).error("remove node failed:", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onAddInputFile(emit, projectRootDir, ID, name, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("addInputFile event recieved:", projectRootDir, ID, name);

  try {
    await updateComponentJson(projectRootDir, ID, (componentJson)=>{
      componentJson.inputFiles.push({ name, src: [] });
    });
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    getLogger(projectRootDir).error("addInputFile failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onAddOutputFile(emit, projectRootDir, ID, name, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("addOutputFile event recieved:", projectRootDir, ID, name);

  try {
    await updateComponentJson(projectRootDir, ID, (componentJson)=>{
      componentJson.outputFiles.push({ name, dst: [] });
    });
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    getLogger(projectRootDir).error("addOutputFile failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onRemoveInputFile(emit, projectRootDir, ID, name, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("removeInputFile event recieved:", projectRootDir, ID, name);
  const counterparts = new Set();

  try {
    await updateComponentJson(projectRootDir, ID, (componentJson)=>{
      componentJson.inputFiles = componentJson.inputFiles.filter((inputFile)=>{
        if (name === inputFile.name) {
          for (const src of inputFile.src) {
            //TODO 親子間のファイルLinkの仕様が固まったら、そっちも削除
            counterparts.add(src.srcNode);
          }
          return false;
        }
        return true;
      });
    });
    await Promise.all(Array.from(counterparts, (counterpartID)=>{
      return updateComponentJson(projectRootDir, counterpartID, (componentJson)=>{
        for (const outputFile of componentJson.outputFiles) {
          outputFile.dst = outputFile.dst.filter((dst)=>{
            return dst.dstNode !== ID;
          });
        }
      });
    }));
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    getLogger(projectRootDir).error("removeInputFile failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onRemoveOutputFile(emit, projectRootDir, ID, name, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("removeOutputFile event recieved:", projectRootDir, ID, name);
  const counterparts = new Set();

  try {
    await updateComponentJson(projectRootDir, ID, (componentJson)=>{
      componentJson.outputFiles = componentJson.outputFiles.filter((outputFile)=>{
        if (name === outputFile.name) {
          for (const dst of outputFile.dst) {
            //TODO 親子間のファイルLinkの仕様が固まったら、そっちも削除
            counterparts.add(dst.dstNode);
          }
          return false;
        }
        return true;
      });
    });
    await Promise.all(Array.from(counterparts, (counterpartID)=>{
      return updateComponentJson(projectRootDir, counterpartID, (componentJson)=>{
        for (const inputFile of componentJson.inputFiles) {
          inputFile.src = inputFile.src.filter((src)=>{
            return src.srcNode !== ID;
          });
        }
      });
    }));
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    getLogger(projectRootDir).error("removeOutputFile failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onRenameInputFile(emit, projectRootDir, ID, index, newName, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("renameIntputFile event recieved:", projectRootDir, ID, index, newName);

  if (index < 0) {
    getLogger(projectRootDir).warn("negative index");
    cb(false);
    return;
  }
  const targetComponent = await getComponent(projectRootDir, ID);
  if (targetComponent.inputFiles.length - 1 < index) {
    getLogger(projectRootDir).warn("index is too large");
    cb(false);
    return;
  }

  const counterparts = new Set();
  const oldName = targetComponent.inputFiles[index].name;

  try {
    await updateComponentJson(projectRootDir, targetComponent, (componentJson)=>{
      componentJson.inputFiles[index].name = newName;
      componentJson.inputFiles[index].src.forEach((e)=>{
        counterparts.add(e.srcNode);
      });
    });
    await Promise.all(Array.from(counterparts, (counterpartID)=>{
      return updateComponentJson(projectRootDir, counterpartID, (componentJson)=>{
        for (const outputFile of componentJson.outputFiles) {
          for (const dst of outputFile.dst) {
            if (dst.dstNode === ID && dst.dstName === oldName) {
              dst.dstName = newName;
            }
          }
        }
      });
    }));
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    getLogger(projectRootDir).error("renameInputFile failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onRenameOutputFile(emit, projectRootDir, ID, index, newName, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("renameOuttputFile event recieved:", projectRootDir, ID, index, newName);

  if (index < 0) {
    getLogger(projectRootDir).warn("negative index");
    cb(false);
    return;
  }
  const targetComponent = await getComponent(projectRootDir, ID);
  if (targetComponent.outputFiles.length - 1 < index) {
    getLogger(projectRootDir).warn("index is too large");
    cb(false);
    return;
  }

  const counterparts = new Set();
  const oldName = targetComponent.outputFiles[index].name;

  try {
    await updateComponentJson(projectRootDir, targetComponent, (componentJson)=>{
      componentJson.outputFiles[index].name = newName;
      componentJson.outputFiles[index].dst.forEach((e)=>{
        counterparts.add(e.dstNode);
      });
    });
    await Promise.all(Array.from(counterparts, (counterpartID)=>{
      return updateComponentJson(projectRootDir, counterpartID, (componentJson)=>{
        for (const inputFile of componentJson.inputFiles) {
          for (const src of inputFile.src) {
            if (src.srcNode === ID && src.srcName === oldName) {
              src.srcName = newName;
            }
          }
        }
      });
    }));
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    getLogger(projectRootDir).error("renameOutputFile failed", e);
    cb(false);
    return;
  }
  cb(true);
}

/**
 * @param {Object}  msg
 * @param {string}  msg.src - リンク元ID
 * @param {string}  msg.dst - リンク先ID
 * @param {boolean} msg.isElse - elseからのリンクかどうかのフラグ
 */
async function onAddLink(emit, projectRootDir, msg, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("addLink event recieved:", msg.src, msg.dst, msg.isElse);

  if (msg.src === msg.dst) {
    getLogger(projectRootDir).error("cyclic link is not allowed");
    cb(false);
    return;
  }

  try {
    await Promise.all([
      updateComponentJson(projectRootDir, msg.src, (componentJson)=>{
        if (msg.isElse && !componentJson.else.includes(msg.dst)) {
          componentJson.else.push(msg.dst);
        } else if (!componentJson.next.includes(msg.dst)) {
          componentJson.next.push(msg.dst);
        }
      }),
      updateComponentJson(projectRootDir, msg.dst, (componentJson)=>{
        if (!componentJson.previous.includes(msg.src)) {
          componentJson.previous.push(msg.src);
        }
      })
    ]);
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    getLogger(projectRootDir).error("addLink failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onRemoveLink(emit, projectRootDir, msg, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("removeLink event recieved:", msg.src, msg.dst);

  try {
    await Promise.all([
      updateComponentJson(projectRootDir, msg.src, (componentJson)=>{
        if (msg.isElse) {
          componentJson.else = componentJson.else.filter((e)=>{
            return e !== msg.dst;
          });
        } else {
          componentJson.next = componentJson.next.filter((e)=>{
            return e !== msg.dst;
          });
        }
      }),
      updateComponentJson(projectRootDir, msg.dst, (componentJson)=>{
        componentJson.previous = componentJson.previous.filter((e)=>{
          return e !== msg.src;
        });
      })
    ]);
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    getLogger(projectRootDir).error("removeLink failed", e);
    cb(false);
    return;
  }
  cb(true);
}


async function isParent(projectRootDir, parentID, childID) {
  const childJson = await getComponent(projectRootDir, childID);
  if (childJson === null || typeof childID !== "string") {
    return false;
  }
  return childJson.parent === parentID;
}

async function onAddFileLink(emit, projectRootDir, srcNode, srcName, dstNode, dstName, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("addFileLink event recieved:", srcNode, srcName, dstNode, dstName);

  if (srcNode === dstNode) {
    getLogger(projectRootDir).error("cyclic link is not allowed");
    cb(false);
    return;
  }

  try {
    if (dstNode === "parent" || await isParent(projectRootDir, dstNode, srcNode)) {
      //link to parent
      const parentDir = getCwd(projectRootDir);
      const parentJson = await getComponent(projectRootDir, path.join(parentDir, componentJsonFilename));
      const parentID = parentJson.ID;
      await Promise.all([
        updateComponentJson(projectRootDir, srcNode, (componentJson)=>{
          const outputFile = componentJson.outputFiles.find((e)=>{
            return e.name === srcName;
          });
          if (!outputFile.dst.includes({ dstNode: parentID, dstName })) {
            outputFile.dst.push({ dstNode: parentID, dstName });
          }
        }),
        updateComponentJson(projectRootDir, parentJson, (componentJson)=>{
          const outputFile = componentJson.outputFiles.find((e)=>{
            return e.name === dstName;
          });
          if (!outputFile.hasOwnProperty("origin")) {
            outputFile.origin = [];
          }
          if (!outputFile.origin.includes({ srcNode, srcName })) {
            outputFile.origin.push({ srcNode, srcName });
          }
        })
      ]);
    } else if (srcNode === "parent" || await isParent(projectRootDir, srcNode, dstNode)) {
      //link to child
      const parentDir = getCwd(projectRootDir);
      const parentJson = await getComponent(projectRootDir, path.join(parentDir, componentJsonFilename));
      const parentID = parentJson.ID;
      await Promise.all([
        updateComponentJson(projectRootDir, parentJson, (componentJson)=>{
          const inputFile = componentJson.inputFiles.find((e)=>{
            return e.name === srcName;
          });
          if (!inputFile.hasOwnProperty("forwardTo")) {
            inputFile.forwardTo = [];
          }
          if (!inputFile.forwardTo.includes({ dstNode, dstName })) {
            inputFile.forwardTo.push({ dstNode, dstName });
          }
        }),
        updateComponentJson(projectRootDir, dstNode, (componentJson)=>{
          const inputFile = componentJson.inputFiles.find((e)=>{
            return e.name === dstName;
          });
          if (!inputFile.src.includes({ srcNode: parentID, srcName })) {
            inputFile.src.push({ srcNode: parentID, srcName });
          }
        })
      ]);
    } else {
      //normal case
      await Promise.all([
        updateComponentJson(projectRootDir, srcNode, (componentJson)=>{
          const outputFile = componentJson.outputFiles.find((e)=>{
            return e.name === srcName;
          });
          if (!outputFile.dst.includes({ dstNode, dstName })) {
            outputFile.dst.push({ dstNode, dstName });
          }
        }),
        updateComponentJson(projectRootDir, dstNode, (componentJson)=>{
          const inputFile = componentJson.inputFiles.find((e)=>{
            return e.name === dstName;
          });
          if (!inputFile.src.includes({ srcNode, srcName })) {
            inputFile.src.push({ srcNode, srcName });
          }
        })
      ]);
    }
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    getLogger(projectRootDir).error("add file link failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onRemoveFileLink(emit, projectRootDir, srcNode, srcName, dstNode, dstName, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("removeFileLink event recieved:", srcNode, srcName, dstNode, dstName);

  try {
    if (dstNode === "parent" || await isParent(projectRootDir, dstNode, srcNode)) {
      //link to parent
      const parentDir = getCwd(projectRootDir);
      const parentJson = await getComponent(projectRootDir, path.join(parentDir, componentJsonFilename));
      const parentID = parentJson.ID;
      await Promise.all([
        updateComponentJson(projectRootDir, srcNode, (componentJson)=>{
          const outputFile = componentJson.outputFiles.find((e)=>{
            return e.name === srcName;
          });
          outputFile.dst = outputFile.dst.filter((e)=>{
            return e.dstNode !== parentID || e.dstName !== dstName;
          });
        }),
        updateComponentJson(projectRootDir, parentJson, (componentJson)=>{
          const outputFile = componentJson.outputFiles.find((e)=>{
            return e.name === dstName;
          });
          if (outputFile.hasOwnProperty("origin")) {
            outputFile.origin = outputFile.origin.filter((e)=>{
              return e.srcNode !== srcNode || e.srcName !== srcName;
            });
          }
        })
      ]);
    } else if (srcNode === "parent" || await isParent(projectRootDir, srcNode, dstNode)) {
      //link to child
      const parentDir = getCwd(projectRootDir);
      const parentJson = await getComponent(projectRootDir, path.join(parentDir, componentJsonFilename));
      const parentID = parentJson.ID;
      await Promise.all([
        updateComponentJson(projectRootDir, parentJson, (componentJson)=>{
          const inputFile = componentJson.inputFiles.find((e)=>{
            return e.name === srcName;
          });
          if (inputFile.hasOwnProperty("forwardTo")) {
            inputFile.forwardTo = inputFile.forwardTo.filter((e)=>{
              return e.dstNode !== dstNode || e.dstName !== dstName;
            });
          }
        }),
        updateComponentJson(projectRootDir, dstNode, (componentJson)=>{
          const inputFile = componentJson.inputFiles.find((e)=>{
            return e.name === dstName;
          });
          inputFile.src = inputFile.src.filter((e)=>{
            return e.srcNode !== parentID || e.srcName !== srcName;
          });
        })
      ]);
    } else {
      //normal case
      await Promise.all([
        updateComponentJson(projectRootDir, srcNode, (componentJson)=>{
          const outputFile = componentJson.outputFiles.find((e)=>{
            return e.name === srcName;
          });
          outputFile.dst = outputFile.dst.filter((e)=>{
            return !(e.dstNode === dstNode && e.dstName === dstName);
          });
        }),
        updateComponentJson(projectRootDir, dstNode, (componentJson)=>{
          const inputFile = componentJson.inputFiles.find((e)=>{
            return e.name === dstName;
          });
          inputFile.src = inputFile.src.filter((e)=>{
            return !(e.srcNode === srcNode && e.srcName === srcName);
          });
        })
      ]);
    }
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    getLogger(projectRootDir).error("remove file link failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onCleanComponent(emit, projectRootDir, targetID, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  getLogger(projectRootDir).debug("cleanComponent event recieved:", targetID);

  try {
    const targetDir = await getComponentDir(projectRootDir, targetID);
    const descendantsID = await getDescendantsID(projectRootDir, targetID);

    await fs.remove(targetDir);
    const pathSpec = `${replacePathsep(path.relative(projectRootDir, targetDir))}/*`;
    await gitResetHEAD(projectRootDir, pathSpec);

    //remove all non-existing components from component Path
    await updateComponentPath(projectRootDir, (root, componentPath)=>{
      for (const descendantID of descendantsID) {
        getComponentDir(projectRootDir, descendantID)
          .then((descendantDir)=>{
            return fs.pathExists(descendantDir);
          })
          .then((isExists)=>{
            if (!isExists) {
              delete componentPath[descendantID];
            }
          });
      }
    });
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    console.log(e);
    getLogger(projectRootDir).error("reset component failed:", e);
    cb(false);
    return;
  }
  cb(true);
}


function registerListeners(socket, projectRootDir) {
  const emit = socket.emit.bind(socket);
  on(projectRootDir, "projectStateChanged", (projectJson)=>{
    emit("projectJson", projectJson);
  });
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
  socket.on("getWorkflow", onWorkflowRequest.bind(null, emit, projectRootDir));
  socket.on("createNode", onCreateNode.bind(null, emit, projectRootDir));
  socket.on("updateNode", onUpdateNode.bind(null, emit, projectRootDir));
  socket.on("removeNode", onRemoveNode.bind(null, emit, projectRootDir));
  socket.on("addInputFile", onAddInputFile.bind(null, emit, projectRootDir));
  socket.on("addOutputFile", onAddOutputFile.bind(null, emit, projectRootDir));
  socket.on("removeInputFile", onRemoveInputFile.bind(null, emit, projectRootDir));
  socket.on("removeOutputFile", onRemoveOutputFile.bind(null, emit, projectRootDir));
  socket.on("renameInputFile", onRenameInputFile.bind(null, emit, projectRootDir));
  socket.on("renameOutputFile", onRenameOutputFile.bind(null, emit, projectRootDir));
  socket.on("addLink", onAddLink.bind(null, emit, projectRootDir));
  socket.on("removeLink", onRemoveLink.bind(null, emit, projectRootDir));
  socket.on("addFileLink", onAddFileLink.bind(null, emit, projectRootDir));
  socket.on("removeFileLink", onRemoveFileLink.bind(null, emit, projectRootDir));
  socket.on("cleanComponent", onCleanComponent.bind(null, emit, projectRootDir));
}

module.exports = registerListeners;
