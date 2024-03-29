/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
"use strict";
const fs = require("fs-extra");
const path = require("path");
const { promisify } = require("util");
const { EventEmitter } = require("events");
const glob = require("glob");
const FileType = require("file-type");
const nunjucks = require("nunjucks");
nunjucks.configure({ autoescape: true });
const { interval, componentJsonFilename } = require("../db/db");
const { exec } = require("./executer");
const { getDateString } = require("../lib/utility");
const { sanitizePath, convertPathSep, replacePathsep } = require("./pathUtils");
const { readJsonGreedy, deliverFile } = require("./fileUtils");
const { paramVecGenerator, getParamSize, getFilenames, getParamSpacev2, removeInvalidv1 } = require("./parameterParser");
const { componentJsonReplacer, getComponent } = require("./componentFilesOperator");
const { isInitialComponent } = require("./workflowComponent");
const { evalCondition } = require("./dispatchUtils");


const viewerSupportedTypes = ["png", "jpg", "gif", "bmp"];

async function getFiletype(filename) {
  let rt;
  try {
    rt = await FileType.fromFile(filename);
  } catch (e) {
    //eslint-disable-next-line valid-typeof
    if (typeof (e) === "EndOfStreamError") {
      return rt;
    }
  }
  if (rt) {
    rt.name = filename;
  }
  return rt;
}

const silentLogger = {
  error: ()=>{},
  warn: ()=>{},
  info: ()=>{},
  debug: ()=>{},
  trace: ()=>{},
  stdout: ()=>{},
  stderr: ()=>{},
  sshout: ()=>{},
  ssherr: ()=>{}
};

/**
 * check state is finished or not
 * @param {string} state - state string
 * @returns {boolean} is finished or not?
 */
function isFinishedState(state) {
  return state === "finished" || state === "failed" || state === "unknown";
}

/**
 * set component and its descendant's state
 */
async function setStateR(dir, state) {
  const filenames = await promisify(glob)(path.join(dir, "**", componentJsonFilename));
  filenames.push(path.join(dir, componentJsonFilename));
  const p = filenames.map((filename)=>{
    return readJsonGreedy(filename)
      .then((component)=>{
        component.state = state;
        return fs.writeJson(filename, component, { spaces: 4, replacer: componentJsonReplacer });
      });
  });
  return Promise.all(p);
}

//private functions
async function getScatterFilesV2(templateRoot, paramSettings) {
  if (!(Object.prototype.hasOwnProperty.call(paramSettings, "scatter") && Array.isArray(paramSettings.scatter))) {
    return [];
  }
  const srcNames = await Promise.all(
    paramSettings.scatter
      .map((e)=>{
        return promisify(glob)(e.srcName, { cwd: templateRoot });
      })
  );
  return Array.prototype.concat.apply([], srcNames);
}

async function replaceByNunjucks(templateRoot, instanceRoot, targetFiles, params) {
  return Promise.all(
    targetFiles.map(async(targetFile)=>{
      const template = (await fs.readFile(path.resolve(templateRoot, targetFile))).toString();
      const result = nunjucks.renderString(template, params);
      return fs.outputFile(path.resolve(instanceRoot, targetFile), result);
    })
  );
}

async function replaceByNunjucksForBulkjob(templateRoot, targetFiles, params, bulkNumber) {
  return Promise.all(
    targetFiles.map(async(targetFile)=>{
      const template = (await fs.readFile(path.resolve(templateRoot, targetFile))).toString();
      const temp = replacePathsep(targetFile);
      const arrTargetPath = temp.split(path.posix.sep);
      const targetFileNewname = `${bulkNumber}.${arrTargetPath[arrTargetPath.length - 1]}`;
      arrTargetPath.splice(-1, 1, targetFileNewname);
      const targetFilePath = arrTargetPath.join(path.posix.sep);
      const result = nunjucks.renderString(template, params);
      return fs.outputFile(path.resolve(templateRoot, targetFilePath), result);
    })
  );
}

async function writeParameterSetFile(templateRoot, targetFiles, params, bulkNumber) {
  const paramsKeys = Object.keys(params);
  let targetNum = 0;
  return Promise.all(
    targetFiles.map(async(targetFile, index)=>{
      const label = `BULKNUM_${bulkNumber}`;
      const target = replacePathsep(targetFile);
      const targetKey = paramsKeys[index];
      const targetVal = params[targetKey];
      const data = `${label}_TARGETNUM_${targetNum}_FILE="./${target}"\n${label}_TARGETNUM_${targetNum}_KEY="${targetKey}"\n${label}_TARGETNUM_${targetNum}_VALUE="${targetVal}"\n`;
      targetNum++;
      return fs.appendFile(path.resolve(templateRoot, "parameterSet.wheel.txt"), data);
    })
  );
}

async function scatterFilesV2(templateRoot, instanceRoot, scatterRecipe, params) {
  const p = [];
  for (const recipe of scatterRecipe) {
    const srcName = nunjucks.renderString(recipe.srcName, params);
    const srces = await promisify(glob)(srcName, { cwd: templateRoot });
    const dstDir = Object.prototype.hasOwnProperty.call(recipe, "dstNode") ? path.join(instanceRoot, recipe.dstNode) : instanceRoot;
    const dstName = nunjucks.renderString(recipe.dstName, params);
    for (const src of srces) {
      const dst = recipe.dstName.endsWith("/") || recipe.dstName.endsWith("\\") ? path.join(dstDir, dstName.slice(0, -1), src) : path.join(dstDir, dstName);
      p.push(
        fs.remove(dst)
          .catch((err)=>{
            if (err.code !== "ENOEXISTS") {
              return Promise.reject(err);
            }
            return true;
          })
          .then(()=>{
            return fs.copy(path.join(templateRoot, src), dst);
          })
      );
    }
  }
  return Promise.all(p).catch((e)=>{
    if (e.code !== "ENOENT") {
      return Promise.reject(e);
    }
    return true;
  });
}

async function gatherFilesV2(templateRoot, instanceRoot, gatherRecipe, params) {
  const p = [];
  for (const recipe of gatherRecipe) {
    const srcDir = Object.prototype.hasOwnProperty.call(recipe, "srcNode") ? path.join(instanceRoot, recipe.srcNode) : instanceRoot;
    const srcName = nunjucks.renderString(recipe.srcName, params);
    const srces = await promisify(glob)(srcName, { cwd: srcDir });
    const dstName = nunjucks.renderString(recipe.dstName, params);
    for (const src of srces) {
      const dst = recipe.dstName.endsWith("/") || recipe.dstName.endsWith("\\") ? path.join(templateRoot, dstName.slice(0, -1), src) : path.join(templateRoot, dstName);
      p.push(
        fs.remove(dst)
          .catch((err)=>{
            if (err.code !== "ENOEXISTS") {
              return Promise.reject(err);
            }
            return true;
          })
          .then(()=>{
            return fs.copy(path.join(srcDir, src), dst);
          })
      );
    }
  }
  return Promise.all(p).catch((e)=>{
    if (e.code !== "ENOENT") {
      return Promise.reject(e);
    }
    return true;
  });
}

async function doNothing() {
}

function makeCmd(paramSettings) {
  const params = Object.prototype.hasOwnProperty.call(paramSettings, "params") ? paramSettings.params : paramSettings.target_param;
  if (paramSettings.version === 2) {
    return [getParamSpacev2.bind(null, params), getScatterFilesV2, scatterFilesV2, gatherFilesV2, replaceByNunjucks];
  }
  //version 1 (=unversioned)
  return [removeInvalidv1.bind(null, params), ()=>{
    return [];
  }, doNothing, doNothing, replaceTargetFile];
}

function forGetNextIndex(component) {
  ++component.numFinished;
  return component.currentIndex !== null ? component.currentIndex + component.step : component.start;
}

function forIsFinished(component) {
  return (component.currentIndex > component.end && component.step > 0) || (component.currentIndex < component.end && component.step < 0);
}

function forTripCount(component) {
  return Math.ceil((component.end - component.start) / component.step) + 1;
}

function forKeepLoopInstance(component, cwfDir) {
  if (Number.isInteger(component.keep) && component.keep >= 0) {
    const deleteComponentInstance = component.keep === 0 ? component.currentIndex - component.step : component.currentIndex - (component.keep * component.step);
    if (deleteComponentInstance >= 0) {
      fs.remove(path.resolve(cwfDir, `${component.originalName}_${sanitizePath(deleteComponentInstance)}`));
    }
  }
}

function whileKeepLoopInstance(component, cwfDir) {
  if (Number.isInteger(component.keep) && component.keep >= 0) {
    const deleteComponentInstance = component.keep === 0 ? component.currentIndex - 1 : component.currentIndex - component.keep;
    if (deleteComponentInstance >= 0) {
      fs.remove(path.resolve(cwfDir, `${component.originalName}_${sanitizePath(deleteComponentInstance)}`));
    }
  }
}

function foreachKeepLoopInstance(component, cwfDir) {
  if (Number.isInteger(component.keep) && component.keep >= 0) {
    const currentIndexNumber = component.currentIndex !== null ? component.indexList.indexOf(component.currentIndex) : component.indexList.length;
    const deleteComponentNumber = component.keep === 0 ? currentIndexNumber - 1 : currentIndexNumber - component.keep;
    const deleteComponentName = deleteComponentNumber >= 0 ? `${component.originalName}_${sanitizePath(component.indexList[deleteComponentNumber])}` : "";
    if (deleteComponentName) {
      fs.remove(path.resolve(cwfDir, deleteComponentName));
    }
  }
}

function whileGetNextIndex(component) {
  ++component.numFinished;
  return component.currentIndex !== null ? ++(component.currentIndex) : 0;
}

async function whileIsFinished(cwfDir, logger, component) {
  const cwd = path.resolve(cwfDir, component.name);
  const condition = await evalCondition(component.condition, cwd, component.currentIndex, logger);
  return !condition;
}

function foreachGetNextIndex(component) {
  ++component.numFinished;

  if (component.currentIndex !== null) {
    const i = component.indexList.findIndex((e)=>{
      return e === component.currentIndex;
    });

    if (i === -1 || i === component.indexList.length - 1) {
      return null;
    }
    return component.indexList[i + 1];
  }
  return component.indexList[0];
}

function foreachIsFinished(component) {
  return component.currentIndex === null;
}
function foreachTripCount(component) {
  return component.indexList.length;
}

function loopInitialize(component, getTripCount) {
  component.initialized = true;
  component.originalName = component.name;
  component.numFinished = -1; //numFinishd is incremented at the begining of loop
  component.currentIndex = null;

  if (typeof getTripCount === "function") {
    component.numTotal = getTripCount(component);
  }
}

async function replaceTargetFile(srcDir, dstDir, targetFiles, params) {
  const promises = [];
  for (const targetFile of targetFiles) {
    const tmp = await fs.readFile(path.resolve(srcDir, targetFile));
    let data = tmp.toString();
    for (const key in params) {
      if (typeof key === "string") {
        data = data.replace(new RegExp(`%%${key}%%`, "g"), params[key].toString());
      }
    }
    //fs.writeFile will overwrites existing file.
    //so, targetFile is always overwrited!!
    promises.push(fs.writeFile(path.resolve(dstDir, targetFile), data));
  }
  return Promise.all(promises);
}

/**
 * parse workflow graph and dispatch ready tasks to executer
 * @param {string} projectRootDir - root directory path of project
 * @param {string} cwfID -          current dispatching workflow ID
 * @param {string} cwfDir -         current dispatching workflow directory (absolute path);
 * @param {string} startTime -      project start time
 * @param {Object} logger -         logger instance from log4js
 * @param {Object} componentPath -  componentPath in project Json
 */
class Dispatcher extends EventEmitter {
  constructor(projectRootDir, cwfID, cwfDir, startTime, logger, componentPath, emit, ancestorsType) {
    super();
    this.projectRootDir = projectRootDir;
    this.cwfID = cwfID;
    this.cwfDir = cwfDir;
    this.projectStartTime = startTime;
    this.logger = logger ? logger : silentLogger;
    this.componentPath = componentPath;
    this.emitEvent = emit;
    this.ancestorsType = ancestorsType;

    this.nextSearchList = [];
    this.children = new Set(); //child dispatcher instance
    this.runningTasks = [];
    this.hasFailedComponent = false;
    this.hasUnknownComponent = false;
    this.isInitialized = this._asyncInit();
  }

  async _asyncInit() {
    this.cwfJson = await readJsonGreedy(path.resolve(this.cwfDir, componentJsonFilename));

    //overwrite doCleanup if parent's cleanupFlag is not "2"
    if (this.cwfJson.cleanupFlag !== "2") {
      this.doCleanup = this.cwfJson.cleanupFlag === "0";
    }

    const children = await promisify(glob)(path.join(this.cwfDir, "*", componentJsonFilename));
    const childComponents = await Promise.all(children.map((e)=>{
      return readJsonGreedy(e);
    }));

    this.currentSearchList = childComponents
      .filter((component)=>{
        return !component.subComponent && isInitialComponent(component);
      });

    this.logger.debug("initial tasks : ", this.currentSearchList.map((e)=>{
      return e.name;
    }));

    return true;
  }

  async _dispatch() {
    if (this.isInitialized !== true) {
      await this.isInitialized;
    }
    const promises = [];

    while (this.currentSearchList.length > 0) {
      const target = this.currentSearchList.shift();
      if (target.disable) {
        this.logger.info(`disabled component: ${target.name}(${target.ID})`);
        continue;
      }
      if (target.type === "source") {
        await this._setComponentState(target, "finished");
      }
      if (target.state === "finished") {
        this.logger.info(`finished component: ${target.name}(${target.ID})`);
        await this._addNextComponent(target);
        continue;
      }
      if (!await this._isReady(target)) {
        this.nextSearchList.push(target);
        continue;
      }

      this.logger.debug("currentList:", this.currentSearchList.map((e)=>{
        return e.name;
      }));
      this.logger.debug("next waiting component", this.nextSearchList.map((e)=>{
        return e.name;
      }));


      await this._setComponentState(target, "running");

      if (target.type === "stepjobTask") {
        const parentComponent = await getComponent(this.projectRootDir, target.parent);
        target.host = parentComponent.host;
        target.queue = parentComponent.queue;
        target.parentName = parentComponent.name;
      }

      promises.push(
        this._cmdFactory(target.type).call(this, target)
          .then(()=>{
            if (target.state === "unknown") {
              this.hasUnknownComponent = true;
            } else if (target.state === "failed") {
              this.hasFailedComponent = true;
            }
          })
          .catch(async(err)=>{
            await this._setComponentState(target, "failed");
            this.hasFailedComponent = true;
            return Promise.reject(err);
          })
      );
    }//end of while loop

    try {
      await Promise.all(promises);
    } catch (e) {
      this.emit("error", e);
    }

    //remove duplicated entry
    const nextIDs = Array.from(new Set(this.nextSearchList.map((e)=>{
      return e.ID;
    })));
    this.currentSearchList = nextIDs.map((id)=>{
      return this.nextSearchList.find((e)=>{
        return e.ID === id;
      });
    });
    this.nextSearchList = [];

    if (this._isFinished()) {
      this.removeListener("dispatch", this._dispatch);
      let state = "finished";
      if (this.hasUnknownComponent) {
        state = "unknown";
      } else if (this.hasFailedComponent) {
        state = "failed";
      }
      this.emit("done", state);
    } else {
      //call next dispatcher
      setTimeout(()=>{
        this.emit("dispatch");
      }, interval);
    }
  }

  _isFinished() {
    this.runningTasks = this.runningTasks.filter((task)=>{
      if (task.state === "unknown") {
        this.hasUnknownComponent = true;
      }
      if (task.state === "failed") {
        this.hasFailedComponent = true;
      }
      return !isFinishedState(task.state);
    });
    return this.currentSearchList.length === 0 && this.nextSearchList.length === 0 && this.runningTasks.length === 0;
  }

  async start() {
    if (this.listenerCount("dispatch") === 0) {
      this.on("dispatch", this._dispatch);
    }

    for (const child of this.children) {
      child.start();
    }
    setImmediate(()=>{
      this.emit("dispatch");
    });
    return new Promise((resolve, reject)=>{
      const onStop = ()=>{
        /*eslint-disable no-use-before-define */
        this.removeListener("error", onError);
        this.removeListener("done", onDone);
        /*eslint-enable no-use-before-define */
        this.removeListener("stop", onStop);
      };

      const onDone = (state)=>{
        onStop();
        resolve(state);
      };

      const onError = (err)=>{
        onStop();
        reject(err);
      };
      this.once("done", onDone);
      this.once("error", onError);
      this.once("stop", onStop);
    });
  }

  pause() {
    this.emit("stop");
    this.removeListener("dispatch", this._dispatch);

    for (const child of this.children) {
      child.pause();
    }
  }

  remove() {
    this.pause();

    for (const child of this.children) {
      child.remove();
    }
    this.children.clear();
    this.currentSearchList = [];
    this.nextSearchList = [];
  }

  async _addNextComponent(component, useElse = false) {
    let nextComponentIDs = [];
    if (component.type !== "source" && component.type !== "viewer") {
      nextComponentIDs = useElse ? Array.from(component.else) : Array.from(component.next);
    }
    if (Object.prototype.hasOwnProperty.call(component, "outputFiles")) {
      const behindIfComponentList = await this._getBehindIfComponentList(component);
      component.outputFiles.forEach((outputFile)=>{
        const tmp = outputFile.dst.map((e)=>{
          if (behindIfComponentList.indexOf(e.dstNode) >= 0) {
            return null;
          }
          if (Object.prototype.hasOwnProperty.call(e, "origin")) {
            return null;
          }
          if (e.dstNode !== component.parent) {
            return e.dstNode;
          }
          return null;
        }).filter((e)=>{
          return e !== null;
        });
        Array.prototype.push.apply(nextComponentIDs, tmp);
      });
    }
    const nextComponents = await Promise.all(nextComponentIDs.map((id)=>{
      return this._getComponent(id);
    }));

    Array.prototype.push.apply(this.nextSearchList, nextComponents);
  }

  async _getBehindIfComponentList(component) {
    const behindIfComponetList = [];
    for (const outputFile of component.outputFiles) {
      for (const e of outputFile.dst) {
        const outputCmp = await this._getComponent(e.dstNode);
        if (outputCmp.type === "viewer") {
          continue;
        }
        const prviousCmp = await Promise.all(outputCmp.previous.map((id)=>{
          return this._getComponent(id);
        }));
        prviousCmp.forEach((cmp)=>{
          if (cmp.type === "if") {
            behindIfComponetList.push(e.dstNode);
          }
        });
      }
    }
    return behindIfComponetList;
  }

  async _dispatchTask(task) {
    this.logger.debug("_dispatchTask called", task.name);
    task.dispatchedTime = getDateString(true, true);
    task.startTime = "not started"; //to be assigned in executer
    task.endTime = "not finished"; //to be assigned in executer
    task.preparedTime = null; //to be assigned in executer
    task.jobSubmittedTime = null; //to be assigned in executer
    task.jobStartTime = null; //to be assigned in executer
    task.jobEndTime = null; //to be assigned in executer
    task.projectStartTime = this.projectStartTime;
    task.projectRootDir = this.projectRootDir;
    task.workingDir = path.resolve(this.cwfDir, task.name);
    task.emitEvent = this.emitEvent;

    task.ancestorsName = replacePathsep(path.relative(task.projectRootDir, path.dirname(task.workingDir)));
    task.ancestorsType = this.ancestorsType;

    if (task.cleanupFlag === 2) {
      task.doCleanup = this.doCleanup;
    } else {
      task.doCleanup = task.cleanupFlag === 0;
    }

    if (task.usePSSettingFile === true) {
      await this._bulkjobHandler(task);
    }

    if (Object.prototype.hasOwnProperty.call(this.cwfJson, "currentIndex")) {
      task.currentIndex = this.cwfJson.currentIndex;
    }
    task.parentType = this.cwfJson.type;

    exec(task, this.logger); //exec is async function but dispatcher never wait end of task execution

    //runningTasks in this class and dispatchedTask in Project class is for different purpose, please keep duplicate!
    this.runningTasks.push(task);
    this.emitEvent("taskDispatched", task);
    await fs.writeJson(path.resolve(task.workingDir, componentJsonFilename), task, { spaces: 4, replacer: componentJsonReplacer });
    await this._addNextComponent(task);
  }

  async _checkIf(component) {
    this.logger.debug("_checkIf called", component.name);
    const childDir = path.resolve(this.cwfDir, component.name);
    const currentIndex = Object.prototype.hasOwnProperty.call(this.cwfJson, "currentIndex") ? this.cwfJson.currentIndex : null;
    const condition = await evalCondition(component.condition, childDir, currentIndex, this.logger);
    await this._addNextComponent(component, !condition);
    await this._setComponentState(component, "finished");
  }

  async _delegate(component) {
    this.logger.debug("_delegate called", component.name);
    const childDir = path.resolve(this.cwfDir, component.name);
    const ancestorsType = typeof this.ancestorsType === "string" ? `${this.ancestorsType}/${component.type}` : component.type;
    const child = new Dispatcher(this.projectRootDir, component.ID, childDir, this.projectStartTime,
      this.logger, this.componentPath, this.emitEvent, ancestorsType);
    this.children.add(child);

    //exception should be catched in caller
    try {
      component.state = await child.start();
      await fs.writeJson(path.join(childDir, componentJsonFilename), component, { spaces: 4, replacer: componentJsonReplacer });

      //if component type is not workflow, it must be copied component of PS, for, while or foreach
      //so, it is no need to emit "componentStateChanged" here.
      if (component.type === "workflow" || component.type === "stepjob") {
        this.emitEvent("componentStateChanged");
      }
    } finally {
      await this._addNextComponent(component);
    }
  }

  async _loopFinalize(component, lastDir, keepLoopInstance) {
    const dstDir = path.resolve(this.cwfDir, component.originalName);

    if (lastDir !== dstDir) {
      this.logger.debug("copy ", lastDir, "to", dstDir);
      await fs.copy(lastDir, dstDir, { overwrite: true, dereference: true }); //dst will be overwrite always
    }

    if (component.keep === 0) {
      keepLoopInstance(component, this.cwfDir);
    }

    this.logger.debug("loop finished", component.name);
    delete component.initialized;
    delete component.currentIndex;
    delete component.subComponent;
    component.name = component.originalName;
    await this._addNextComponent(component);
    component.state = component.hasFaild ? "failed" : "finished";
    //write to file
    //to avoid git add when task state is changed, we do NOT use updateComponentJson(in workflowUtil) here
    const componentDir = this._getComponentDir(component.ID);
    await fs.writeJson(path.join(componentDir, componentJsonFilename), component, { spaces: 4, replacer: componentJsonReplacer });
  }

  async _loopHandler(getNextIndex, isFinished, getTripCount, keepLoopInstance, component) {
    if (component.childLoopRunning) {
      //send back itself to searchList for next loop trip
      this.nextSearchList.push(component);
      return Promise.resolve();
    }
    this.logger.debug("_loopHandler called", component.name);
    component.childLoopRunning = true;

    //determine old loop block directory
    let srcDir = component.initialized ? `${component.originalName}_${sanitizePath(component.currentIndex)}` : component.name;
    srcDir = path.resolve(this.cwfDir, srcDir);

    if (!component.initialized) {
      loopInitialize(component, getTripCount);
    }

    //update index variable(component.currentIndex)
    component.currentIndex = await getNextIndex(component);

    //end determination
    if (await isFinished(component)) {
      await this._loopFinalize(component, srcDir, keepLoopInstance);
      return Promise.resolve();
    }

    //send back itself to searchList for next loop trip
    this.nextSearchList.push(component);

    const newComponent = Object.assign({}, component);
    newComponent.name = `${component.originalName}_${sanitizePath(component.currentIndex)}`;
    newComponent.subComponent = true;
    const dstDir = path.resolve(this.cwfDir, newComponent.name);

    try {
      this.logger.debug("copy from", srcDir, "to ", dstDir);
      await fs.copy(srcDir, dstDir, { dereference: true });
      await setStateR(dstDir, "not-started");
      await fs.writeJson(path.resolve(dstDir, componentJsonFilename), newComponent, { spaces: 4, replacer: componentJsonReplacer });
      await this._delegate(newComponent);

      keepLoopInstance(component, this.cwfDir);

      if (newComponent.state === "failed") {
        component.hasFaild = true;
      }
    } catch (e) {
      e.index = component.currentIndex;
      this.logger.warn("fatal error occurred during loop child dispatching.", e);
      return Promise.reject(e);
    }
    if (component.childLoopRunning) {
      this.logger.debug("finished for index =", component.currentIndex);
      component.childLoopRunning = false;
    }
    return Promise.resolve();
  }

  async _getTargetFile(component) {
    const templateRoot = path.resolve(this.cwfDir, component.name);
    const paramSettingsFilename = path.resolve(templateRoot, component.parameterFile);
    const paramSettings = await readJsonGreedy(paramSettingsFilename).catch((err)=>{
      this.logger.warn("parameter file read failed", err);
      throw err;
    });
    this.logger.debug(`read prameter setting done. version = ${paramSettings.version}`);

    //treat single value as array contains single element
    if (Object.prototype.hasOwnProperty.call(paramSettings, "targetFiles") && typeof paramSettings.targetFiles === "string") {
      paramSettings.targetFiles = [paramSettings.targetFiles];
    }
    if (Object.prototype.hasOwnProperty.call(paramSettings, "target_file") && typeof paramSettings.target_file === "string") {
      paramSettings.target_file = [paramSettings.target_file];
    }
    if (!Object.prototype.hasOwnProperty.call(paramSettings, "targetFiles") && Object.prototype.hasOwnProperty.call(paramSettings, "target_file")) {
      paramSettings.targetFiles = paramSettings.target_file;
    }

    //convert id to relative path from PS component
    const targetFiles = Object.prototype.hasOwnProperty.call(paramSettings, "targetFiles") ? paramSettings.targetFiles.map((e)=>{
      if (Object.prototype.hasOwnProperty.call(e, "targetName")) {
        const targetDir = Object.prototype.hasOwnProperty.call(e, "targetNode") ? path.relative(templateRoot, this._getComponentDir(e.targetNode)) : "";
        return path.join(targetDir, e.targetName);
      }
      return e;
    }) : [];

    return [templateRoot, paramSettingsFilename, paramSettings, targetFiles];
  }

  async _PSHandler(component) {
    this.logger.debug("_PSHandler called", component.name);
    const [templateRoot, paramSettingsFilename, paramSettings, targetFiles] = await this._getTargetFile(component);

    const scatterRecipe = Object.prototype.hasOwnProperty.call(paramSettings, "scatter") ? paramSettings.scatter.map((e)=>{
      return {
        srcName: e.srcName,
        dstNode: path.relative(templateRoot, this._getComponentDir(e.dstNode)),
        dstName: e.dstName
      };
    }) : [];
    const gatherRecipe = Object.prototype.hasOwnProperty.call(paramSettings, "gather") ? paramSettings.gather.map((e)=>{
      return {
        srcName: e.srcName,
        srcNode: path.relative(templateRoot, this._getComponentDir(e.srcNode)),
        dstName: e.dstName
      };
    }) : [];

    const [getParamSpace, getScatterFiles, scatterFiles, gatherFiles, rewriteTargetFile] = makeCmd(paramSettings);
    const paramSpace = await getParamSpace(templateRoot);
    //TODO check paramSpace

    //ignore all filenames in file type parameter space and parameter study setting file
    const ignoreFiles = [componentJsonFilename, paramSettingsFilename]
      .concat(
        getFilenames(paramSpace),
        targetFiles,
        await getScatterFiles(templateRoot, paramSettings)
      ).map((e)=>{
        return path.resolve(templateRoot, e);
      });

    const promises = [];
    component.numTotal = getParamSize(paramSpace);
    //reset counter
    component.numFailed = 0;
    component.numFinished = 0;

    this.logger.debug("start paramSpace loop");

    for (const paramVec of paramVecGenerator(paramSpace)) {
      const params = paramVec.reduce((p, c)=>{
        p[c.key] = c.value;
        return p;
      }, {});
      const newName = sanitizePath(paramVec.reduce((p, e)=>{
        return `${p}_${e.key}_${e.value}`;
      }, component.name));
      const instanceRoot = path.resolve(this.cwfDir, newName);

      const options = { overwrite: component.forceOverwrite };
      options.filter = function(filename) {
        return !ignoreFiles.includes(filename);
      };
      this.logger.debug("copy from", templateRoot, "to ", instanceRoot);
      await fs.copy(templateRoot, instanceRoot, options);

      this.logger.debug("copy files which is used as parameter");
      await Promise.all(paramVec.filter((e)=>{
        return e.type === "file";
      }).map((e)=>{
        return e.value;
      })
        .map((e)=>{
          //TODO files should be deliverd under specific component
          const src = path.resolve(templateRoot, e);
          const dst = path.resolve(instanceRoot, e);
          this.logger.debug("parameter: copy from", src, "to ", dst);
          return fs.copy(src, dst, { overwrite: component.forceOverwrite });
        }));

      this.logger.debug("scatter files");
      await scatterFiles(templateRoot, instanceRoot, scatterRecipe, params);
      this.logger.debug("rewrite target files");
      await rewriteTargetFile(templateRoot, instanceRoot, targetFiles, params);

      const newComponent = Object.assign({}, component);
      newComponent.name = newName;
      newComponent.subComponent = true;
      const newComponentFilename = path.join(instanceRoot, componentJsonFilename);
      if (!await fs.pathExists(newComponentFilename)) {
        await fs.writeJson(newComponentFilename, newComponent, { spaces: 4, replacer: componentJsonReplacer });
      }
      const p = this._delegate(newComponent)
        .then(()=>{
          if (newComponent.state === "finished") {
            ++(component.numFinished);
          } else if (newComponent.state === "failed") {
            ++(component.numFailed);
          } else {
            this.logger.warn("child state is illegal", newComponent.state);
          }
          fs.writeJson(path.join(templateRoot, componentJsonFilename), component, { spaces: 4, replacer: componentJsonReplacer })
            .then(()=>{
              this.emitEvent("componentStateChanged");
            });
        })
        .then(()=>{
          this.logger.debug("gather files");
          return gatherFiles(templateRoot, instanceRoot, gatherRecipe, params);
        });
      promises.push(p);
    }
    await Promise.all(promises);
    await this._addNextComponent(component);
    const state = component.numFailed > 0 ? "failed" : "finished";
    await this._setComponentState(component, state);

    if (component.deleteLoopInstance) {
      const pm = [];
      for (const paramVec of paramVecGenerator(paramSpace)) {
        const deleteComponentName = sanitizePath(paramVec.reduce((p, e)=>{
          return `${p}_${e.key}_${e.value}`;
        }, component.name));
        const deleteDir = path.resolve(this.cwfDir, deleteComponentName);
        pm.push(fs.remove(deleteDir));
      }
      await Promise.all(pm);
    }
  }

  async _viewerHandler(component) {
    this.logger.debug("_viewerHandler called", component.name);
    const viewerURLRoot = path.resolve(path.dirname(__dirname), "viewer");
    await fs.ensureDir(viewerURLRoot);
    const dir = await fs.mkdtemp(viewerURLRoot + path.sep);

    const componentRoot = path.resolve(this.cwfDir, component.name);
    const files = await Promise.all(component.files.map((e)=>{
      return getFiletype(e.dst);
    }));
    delete component.files;
    const rt = await Promise.all(
      files
        .filter((e)=>{
          if (typeof e === "undefined") {
            return false;
          }
          if (viewerSupportedTypes.includes(e.ext)) {
            return e.name;
          }
          this.logger.warn("unsupported type for viewer", path.basename(e.name));
          return false;
        })
        .map((e)=>{
          return deliverFile(e.name, path.resolve(dir, path.relative(componentRoot, e.name)));
        })
    );
    this.logger.debug("send URLs", rt.map((e)=>{
      return e.src;
    }));
    this.emitEvent("resultFilesReady", rt.map((e)=>{
      return { componentID: component.ID, filename: path.relative(componentRoot, e.src), url: path.relative(viewerURLRoot, e.dst) };
    }));
    await this._setComponentState(component, "finished");
  }

  async _bulkjobHandler(component) {
    this.logger.debug("_bulkjobHandler called", component.name);
    const [templateRoot, paramSettingsFilename, paramSettings, targetFiles] = await this._getTargetFile(component);
    const paramSpace = await getParamSpacev2(paramSettings.params, templateRoot);

    const bulkNumTotal = getParamSize(paramSpace);
    component.endBulkNumber = bulkNumTotal - 1;
    component.startBulkNumber = 0;
    let countBulkNum = 0;

    this.logger.debug("start paramSpace loop");

    for (const paramVec of paramVecGenerator(paramSpace)) {
      const params = paramVec.reduce((p, c)=>{
        p[c.key] = c.value;
        return p;
      }, {});

      await Promise.all(paramVec.filter((e)=>{
        return e.type === "file";
      }).map((e)=>{
        return e.value;
      })
        .map((e)=>{
          const src = path.resolve(templateRoot, e);
          const dst = path.resolve(templateRoot, `${countBulkNum}.${e}`);
          this.logger.debug("parameter: copy from", src, "to ", dst);
          return fs.copy(src, dst);
        }));

      this.logger.debug("rewrite target files");
      await replaceByNunjucksForBulkjob(templateRoot, targetFiles, params, countBulkNum);
      await writeParameterSetFile(templateRoot, targetFiles, params, countBulkNum);
      countBulkNum++;
    }
    fs.writeJson(path.join(templateRoot, componentJsonFilename), component, { spaces: 4, replacer: componentJsonReplacer });
  }

  async _isReady(component) {
    if (component.type === "source") {
      return true;
    }
    if (component.previous) {
      for (const ID of component.previous) {
        const previous = await this._getComponent(ID);
        this.logger.trace(`previous component name = ${previous.type}(state:${previous.state})`);

        if (!isFinishedState(previous.state) && previous.type !== "stepjobTask") {
          this.logger.trace(`${component.name}(${component.ID}) is not ready because ${previous.name}(${previous.ID}) is not finished`);
          return false;
        }
      }
    }

    for (const inputFile of component.inputFiles) {
      for (const src of inputFile.src) {
        if (src.srcNode === component.parent) {
          continue;
        }
        const previous = await this._getComponent(src.srcNode);

        if (!isFinishedState(previous.state) && previous.type !== "stepjobTask") {
          this.logger.trace(`${component.name}(${component.ID}) is not ready because ${inputFile} from ${previous.name}(${previous.ID}) is not arrived`);
          return false;
        }
      }
    }
    const result = await this._getOutputFiles(component);
    //store gatherd filenames. it will be used and removed in _ViewerHandler()
    if (component.type === "viewer") {
      component.files = result;
    }

    return true;
  }

  _getComponentDir(id) {
    const originalCwfDir = convertPathSep(this.componentPath[this.cwfID]);
    const originalDir = convertPathSep(this.componentPath[id]);
    const relativePath = path.relative(originalCwfDir, originalDir);

    return path.resolve(this.cwfDir, relativePath);
  }

  async _getComponent(id) {
    const componentDir = this._getComponentDir(id);
    const filename = path.resolve(this.cwfDir, componentDir, componentJsonFilename);
    return readJsonGreedy(filename);
  }

  async _setComponentState(component, state) {
    component.state = state; //update in memory
    const componentDir = this._getComponentDir(component.ID);
    //write to file
    //to avoid git add when task state is changed, we do NOT use updateComponentJson(in workflowUtil) here
    await fs.writeJson(path.join(componentDir, componentJsonFilename), component, { spaces: 4, replacer: componentJsonReplacer });
    this.emitEvent("componentStateChanged");
  }

  async _getOutputFiles(component) {
    this.logger.debug(`getOutputFiles for ${component.name}`);
    const promises = [];
    const deliverRecipes = new Set();
    for (const inputFile of component.inputFiles) {
      const dstName = inputFile.name;
      //resolve real src
      for (const src of inputFile.src) {
        //get files from upper level
        if (src.srcNode === component.parent) {
          promises.push(
            this._getComponent(src.srcNode)
              .then((srcComponent)=>{
                const srcEntry = srcComponent.inputFiles.find((i)=>{
                  if (!(i.name === src.srcName && Object.prototype.hasOwnProperty.call(i, "forwardTo"))) {
                    return false;
                  }
                  const result = i.forwardTo.findIndex((e)=>{
                    return e.dstNode === component.ID && e.dstName === inputFile.name;
                  });
                  return result !== -1;
                });
                if (typeof srcEntry === "undefined") {
                  return;
                }
                for (const e of srcEntry.src) {
                  const originalSrcRoot = this._getComponentDir(e.srcNode);
                  deliverRecipes.add({ dstName, srcRoot: originalSrcRoot, srcName: e.srcName });
                }
              })
          );
        } else {
          const srcRoot = this._getComponentDir(src.srcNode);
          promises.push(
            this._getComponent(src.srcNode)
              .then((srcComponent)=>{
                const srcEntry = srcComponent.outputFiles.find((outputFile)=>{
                  return outputFile.name === src.srcName;
                });
                if (typeof srcEntry === "undefined") {
                  return;
                }
                //get files from lower level component
                if (Object.prototype.hasOwnProperty.call(srcEntry, "origin")) {
                  for (const e of srcEntry.origin) {
                    const originalSrcRoot = this._getComponentDir(e.srcNode);
                    deliverRecipes.add({ dstName, srcRoot: originalSrcRoot, srcName: e.srcName });
                  }
                } else {
                  deliverRecipes.add({ dstName, srcRoot, srcName: src.srcName });
                }
              })
          );
        }
      }
    }
    await Promise.all(promises);

    //actual deliver file process
    const dstRoot = this._getComponentDir(component.ID);
    const p2 = [];
    for (const recipe of deliverRecipes) {
      const srces = await promisify(glob)(recipe.srcName, { cwd: recipe.srcRoot });
      const hasGlob = glob.hasMagic(recipe.srcName);
      for (const srcFile of srces) {
        const oldPath = path.resolve(recipe.srcRoot, srcFile);
        let newPath = path.resolve(dstRoot, recipe.dstName);

        //dst is regard as directory if srcName has glob pattern or dstName ends with path separator
        //if newPath is existing Directory, src will also be copied under newPath directory
        if (hasGlob || recipe.dstName.endsWith(path.posix.sep) || recipe.dstName.endsWith(path.win32.sep)) {
          newPath = path.resolve(newPath, srcFile);
        }
        p2.push(deliverFile(oldPath, newPath));
      }
    }
    const results = await Promise.all(p2);
    for (const result of results) {
      this.logger.trace(`make ${result.type} from  ${result.src} to ${result.dst}`);
    }
    return results;
  }

  _cmdFactory(type) {
    let cmd = ()=>{};

    switch (type.toLowerCase()) {
      case "task":
        cmd = this._dispatchTask;
        break;
      case "stepjobtask":
        cmd = this._dispatchTask;
        break;
      case "bulkjobtask":
        cmd = this._dispatchTask;
        break;
      case "if":
        cmd = this._checkIf;
        break;
      case "for":
        cmd = this._loopHandler.bind(this, forGetNextIndex, forIsFinished, forTripCount, forKeepLoopInstance);
        break;
      case "while":
        cmd = this._loopHandler.bind(this, whileGetNextIndex, whileIsFinished.bind(null, this.cwfDir, this.logger), null, whileKeepLoopInstance);
        break;
      case "foreach":
        cmd = this._loopHandler.bind(this, foreachGetNextIndex, foreachIsFinished, foreachTripCount, foreachKeepLoopInstance);
        break;
      case "workflow":
        cmd = this._delegate;
        break;
      case "stepjob":
        cmd = this._delegate;
        break;
      case "parameterstudy":
        cmd = this._PSHandler;
        break;
      case "viewer":
        cmd = this._viewerHandler;
        break;
      default:
        this.logger.error("illegal type specified", type);
    }
    return cmd;
  }
}
module.exports = Dispatcher;
