"use strict";
const fs = require("fs-extra");
const path = require("path");
const { promisify } = require("util");
const childProcess = require("child_process");
const { EventEmitter } = require("events");
const glob = require("glob");
const { interval, componentJsonFilename } = require("../db/db");
const { exec } = require("./executer");
const { addX, isFinishedState, readJsonGreedy } = require("./utility");
const { paramVecGenerator, getParamSize, getFilenames, removeInvalid } = require("./parameterParser");
const { isInitialNode, getChildren, componentJsonReplacer } = require("./workflowUtil");
const { emitEvent, addDispatchedTask } = require("./projectResource");

/**
 * deliver src to dst
 * @param {string} src - absolute path of src path
 * @param {string} dst - absolute path of dst path
 *
 */
async function deliverFile(src, dst) {
  const stats = await fs.lstat(src);
  const type = stats.isDirectory() ? "dir" : "file";

  try {
    await fs.remove(dst);
    await fs.ensureSymlink(src, dst, type);
    return `make symlink from ${src} to ${dst} (${type})`;
  } catch (e) {
    if (e.code === "EPERM") {
      await fs.copy(src, dst, { overwrite: false });
      return `make copy from ${src} to ${dst}`;
    }
    return Promise.reject(e);
  }
}


//private functions
function forGetNextIndex(component) {
  return component.hasOwnProperty("currentIndex") ? component.currentIndex + component.step : component.start;
}

function forIsFinished(component) {
  return (component.currentIndex > component.end && component.step > 0) || (component.currentIndex < component.end && component.step < 0);
}

function whileGetNextIndex(component) {
  return component.hasOwnProperty("currentIndex") ? ++(component.currentIndex) : 0;
}

async function whileIsFinished(cwfDir, logger, component) {
  const cwd = path.resolve(cwfDir, component.name);
  const condition = await evalCondition(component.condition, cwd, component.currentIndex, logger);
  return !condition;
}

function foreachGetNextIndex(component) {
  if (component.hasOwnProperty("currentIndex")) {
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

function loopInitialize(component) {
  component.initialized = true;
  component.originalName = component.name;
}

/**
 * evalute condition by executing external command or evalute JS expression
 * @param {string} condition - command name or javascript expression
 */
async function evalCondition(condition, cwd, currentIndex, logger) {
  return new Promise(async(resolve, reject)=>{
    //condition is always string for now. but keep following just in case
    if (typeof condition === "boolean") {
      resolve(condition);
    }

    if (typeof condition !== "string") {
      logger.warn("condition must be string or boolean");
      reject(new Error(`illegal condition specified ${typeof condition} \n${condition}`));
    }
    const script = path.resolve(cwd, condition);

    if (await fs.pathExists(script)) {
      logger.debug("execute ", script);
      await addX(script);
      const dir = path.dirname(script);
      const options = {
        env: process.env,
        cwd: dir
      };

      if (typeof currentIndex === "number") {
        options.env.WHEEL_CURRENT_INDEX = currentIndex.toString();
      }
      const cp = childProcess.spawn(script, options, (err)=>{
        if (err) {
          reject(err);
        }
      });
      cp.on("close", (code)=>{
        resolve(code === 0);
      });
    } else {
      logger.debug("evalute ", condition);
      let conditionExpression = "";

      if (typeof currentIndex === "number") {
        conditionExpression += `var WHEEL_CURRENT_INDEX=${currentIndex};`;
      }
      conditionExpression += condition;
      //eslint-disable-next-line no-eval
      resolve(eval(conditionExpression));
    }
  });
}

async function replaceTargetFile(srcDir, dstDir, targetFile, paramVec) {
  const tmp = await fs.readFile(path.resolve(srcDir, targetFile));
  let data = tmp.toString();
  paramVec.forEach((e)=>{
    data = data.replace(new RegExp(`%%${e.key}%%`, "g"), e.value.toString());
  });
  const rewriteFile = path.resolve(dstDir, targetFile);
  //fs.writeFile will overwrites existing file.
  //so, targetFile is always overwrited!!
  await fs.writeFile(rewriteFile, data);
}

/**
 * parse workflow graph and dispatch ready tasks to executer
 * @param {string} projectRootDir - root directory path of project
 * @param {string} cwfID          - current dispatching workflow ID
 * @param {string} cwfDir         - current dispatching workflow directory (absolute path);
 * @param {string} startTime      - project start time
 * @param {Object} logger         - logger instance from log4js
 * @param {Object} componentPath  - componentPath in project Json
 */
class Dispatcher extends EventEmitter {
  constructor(projectRootDir, cwfID, cwfDir, startTime, logger, componentPath, ancestorsType) {
    super();
    this.projectRootDir = projectRootDir;
    this.cwfID = cwfID;
    this.cwfDir = cwfDir;
    this.projectStartTime = startTime;
    this.logger = logger;
    this.componentPath = componentPath;
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
    const childComponents = await getChildren(this.projectRootDir, this.cwfID);
    this.currentSearchList = childComponents.filter((component)=>{
      return isInitialNode(component);
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
      this.logger.debug("currentList:", this.currentSearchList.map((e)=>{
        return e.name;
      }));
      this.logger.debug("next waiting component", this.nextSearchList.map((e)=>{
        return e.name;
      }));

      const target = this.currentSearchList.shift();
      if (!await this._isReady(target)) {
        this.nextSearchList.push(target);
        continue;
      }

      await this._setComponentState(target, "running");
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
    const nextComponentIDs = useElse ? Array.from(component.else) : Array.from(component.next);
    component.outputFiles.forEach((outputFile)=>{
      const tmp = outputFile.dst.map((e)=>{
        if (e.hasOwnProperty("origin")) {
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
    const nextComponents = await Promise.all(nextComponentIDs.map((id)=>{
      return this._getComponent(id);
    }));

    Array.prototype.push.apply(this.nextSearchList, nextComponents);
  }

  async _dispatchTask(task) {
    this.logger.debug("_dispatchTask called", task.name);
    task.startTime = "not started"; //to be assigned in executer
    task.endTime = "not finished"; //to be assigned in executer
    task.projectStartTime = this.projectStartTime;
    task.projectRootDir = this.projectRootDir;
    task.workingDir = path.resolve(this.cwfDir, task.name);

    task.ancestorsName = path.relative(task.projectRootDir, path.dirname(task.workingDir));
    task.ancestorsType = this.ancestorsType;

    if (task.cleanupFlag === "2") {
      task.doCleanup = this.doCleanup;
    } else {
      task.doCleanup = task.cleanupFlag === "0";
    }

    if (this.cwfJson.hasOwnProperty("currentIndex")) {
      task.currentIndex = this.cwfJson.currentIndex;
    }
    task.parentType = this.cwfJson.type;

    exec(task, this.logger); //exec is async function but dispatcher never wait end of task execution

    //runnintTasks in this class and dispatchedTask in Project class is for different purpose, please keep duplicate!
    this.runningTasks.push(task);
    addDispatchedTask(this.projectRootDir, task);
    await this._addNextComponent(task);
  }

  async _checkIf(component) {
    this.logger.debug("_checkIf called", component.name);
    const childDir = path.resolve(this.cwfDir, component.name);
    const currentIndex = this.cwfJson.hasOwnProperty("currentIndex") ? this.cwfJson.currentIndex : null;
    const condition = await evalCondition(component.condition, childDir, currentIndex, this.logger);
    await this._addNextComponent(component, !condition);
    await this._setComponentState(component, "finished");
  }

  async _delegate(component) {
    this.logger.debug("_delegate called", component.name);
    const childDir = path.resolve(this.cwfDir, component.name);
    const ancestorsType = typeof this.ancestorsType === "string" ? `${this.ancestorsType}/${component.type}` : component.type;
    const child = new Dispatcher(this.projectRootDir, component.ID, childDir, this.projectStartTime, this.logger, this.componentPath, ancestorsType);
    this.children.add(child);

    //exception should be catched in caller
    try {
      component.state = await child.start();
      await fs.writeJson(path.join(childDir, componentJsonFilename), component, { spaces: 4, replacer: componentJsonReplacer });

      //if component type is not workflow, it must be copied component of PS, for, while or foreach
      //so, it is no need to emit "componentStateChanged" here.
      if (component.type === "workflow") {
        emitEvent(this.projectRootDir, "componentStateChanged");
      }
    } finally {
      await this._addNextComponent(component);
    }
  }

  async _loopFinalize(component, lastDir) {
    const dstDir = path.resolve(this.cwfDir, component.originalName);

    if (lastDir !== dstDir) {
      this.logger.debug("copy ", lastDir, "to", dstDir);
      await fs.copy(lastDir, dstDir);
    }
    this.logger.debug("loop finished", component.name);
    delete component.initialized;
    delete component.currentIndex;
    component.name = component.originalName;
    await this._addNextComponent(component);
    component.state = component.hasFaild ? "failed" : "finished";
  }

  async _loopHandler(getNextIndex, isFinished, component) {
    if (component.childLoopRunning) {
      //send back itself to searchList for next loop trip
      this.nextSearchList.push(component);
      return Promise.resolve();
    }
    this.logger.debug("_loopHandler called", component.name);
    component.childLoopRunning = true;

    if (!component.initialized) {
      loopInitialize(component);
    }

    //determine old loop block directory
    let srcDir = component.hasOwnProperty("currentIndex") ? `${component.originalName}_${component.currentIndex}` : component.name;
    srcDir = path.resolve(this.cwfDir, srcDir);

    //update index variable(component.currentIndex)
    component.currentIndex = await getNextIndex(component);

    //end determination
    if (await isFinished(component)) {
      await this._loopFinalize(component, srcDir);
      return Promise.resolve();
    }

    //send back itself to searchList for next loop trip
    this.nextSearchList.push(component);

    const newComponent = Object.assign({}, component);
    newComponent.name = `${component.originalName}_${component.currentIndex}`;
    newComponent.subComponent = true;
    const dstDir = path.resolve(this.cwfDir, newComponent.name);

    try {
      this.logger.debug("copy from", srcDir, "to ", dstDir);
      await fs.copy(srcDir, dstDir); //fs-extra's copy overwrites dst by default
      await fs.writeJson(path.resolve(dstDir, componentJsonFilename), newComponent, { spaces: 4 });
      await this._delegate(newComponent);

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

  async _PSHandler(component) {
    this.logger.debug("_PSHandler called", component.name);
    const srcDir = path.resolve(this.cwfDir, component.name);
    const paramSettingsFilename = path.resolve(srcDir, component.parameterFile);
    const paramSettings = JSON.parse(await promisify(fs.readFile)(paramSettingsFilename));
    const targetFile = paramSettings.target_file;
    const paramSpace = removeInvalid(paramSettings.target_param);
    //ignore all filenames in file type parameter space and parameter study setting file
    const ignoreFiles = getFilenames(paramSpace).map((e)=>{
      return path.resolve(srcDir, e);
    });
    ignoreFiles.push(paramSettingsFilename);

    const promises = [];
    component.numTotal = getParamSize(paramSpace);
    //reset counter
    component.numFailed = 0;
    component.numFinished = 0;

    for (const paramVec of paramVecGenerator(paramSpace)) {
      const newName = paramVec.reduce((p, e)=>{
        let v = e.value;

        if (e.type === "file") {
          //TODO /以外のメタキャラクタも置換する
          v = (e.value).replace(path.sep, "_");
        }
        return `${p}_${e.key}_${v}`;
      }, component.name);
      const dstDir = path.resolve(this.cwfDir, newName);

      //pick up files which is specified as parameter
      const includeFiles = paramVec
        .filter((e)=>{
          return e.type === "file";
        })
        .map((e)=>{
          return path.resolve(srcDir, e.value);
        });

      const options = { overwrite: component.forceOverwrite };
      options.filter = function(filename) {
        return !ignoreFiles.filter((e)=>{
          return !includeFiles.includes(e);
        }).includes(filename);
      };
      this.logger.debug("copy from", srcDir, "to ", dstDir);
      await fs.copy(srcDir, dstDir, options);

      await replaceTargetFile(srcDir, dstDir, targetFile, paramVec);

      const newComponent = Object.assign({}, component);
      newComponent.name = newName;
      newComponent.subComponent = true;
      await fs.writeJson(path.join(dstDir, componentJsonFilename), newComponent, { spaces: 4, replacer: componentJsonReplacer });
      const p = this._delegate(newComponent)
        .then(()=>{
          if (newComponent.state === "finished") {
            ++(component.numFinished);
          } else if (newComponent.state === "failed") {
            ++(component.numFailed);
          } else {
            this.logger.warn("child state is illegal", newComponent.state);
          }
        });
      promises.push(p);
    }
    await Promise.all(promises);
    await this._addNextComponent(component);
    const state = component.numFailed > 0 ? "failed" : "finished";
    await this._setComponentState(component, state);
  }

  async _isReady(component) {
    for (const ID of component.previous) {
      const previous = await this._getComponent(ID);

      if (!isFinishedState(previous.state)) {
        this.logger.debug(component.ID, "is not ready because", previous.ID, "is not finished");
        return false;
      }
    }

    for (const inputFile of component.inputFiles) {
      for (const src of inputFile.src) {
        if (src.srcNode === component.parent) {
          continue;
        }
        const previous = await this._getComponent(src.srcNode);

        if (!isFinishedState(previous.state)) {
          this.logger.debug(component.ID, "is not ready because", previous.ID, "(has file dependency)is not finished");
          return false;
        }
      }
    }

    await this._getOutputFiles(component);
    return true;
  }

  _getComponentDir(id) {
    const originalCwfDir = this.componentPath[this.cwfID];
    const originalDir = this.componentPath[id];
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
    emitEvent(this.projectRootDir, "componentStateChanged");
  }


  async _getOutputFiles(component) {
    this.logger.debug(`getOutputFiles for ${component.name}`);

    const promises = [];
    const deliverRecipes = new Set();
    for (const inputFile of component.inputFiles) {
      const dstName = inputFile.name;

      //this component does not need the file
      if (inputFile.hasOwnProperty("forwardTo")) {
        continue;
      }

      //resolve real src
      for (const src of inputFile.src) {
        //get files from upper level
        if (src.srcNode === component.parent) {
          promises.push(
            this._getComponent(src.srcNode)
              .then((srcComponent)=>{
                const srcEntry = srcComponent.inputFiles.find((i)=>{
                  if (!(i.name === src.srcName && i.hasOwnProperty("forwardTo"))) {
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
                if (srcEntry.hasOwnProperty("origin")) {
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

    //actual delive file process
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
    return Promise.all(p2);
  }

  _cmdFactory(type) {
    let cmd = ()=>{};

    switch (type.toLowerCase()) {
      case "task":
        cmd = this._dispatchTask;
        break;
      case "if":
        cmd = this._checkIf;
        break;
      case "for":
        cmd = this._loopHandler.bind(this, forGetNextIndex, forIsFinished);
        break;
      case "while":
        cmd = this._loopHandler.bind(this, whileGetNextIndex, whileIsFinished.bind(null, this.cwfDir, this.logger));
        break;
      case "foreach":
        cmd = this._loopHandler.bind(this, foreachGetNextIndex, foreachIsFinished);
        break;
      case "workflow":
        cmd = this._delegate;
        break;
      case "parameterstudy":
        cmd = this._PSHandler;
        break;
      default:
        this.logger("illegal type specified", type);
    }
    return cmd;
  }
}
module.exports = Dispatcher;
