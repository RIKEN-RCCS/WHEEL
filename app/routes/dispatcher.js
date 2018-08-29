"use strict";
const fs = require("fs-extra");
const path = require("path");
const { promisify } = require("util");
const childProcess = require("child_process");
const { EventEmitter } = require("events");

const { interval } = require("../db/db");
const { exec } = require("./executer");
const { addXSync, deliverOutputFiles } = require("./utility");
const { paramVecGenerator, getParamSize, getFilenames, removeInvalid } = require("./parameterParser");
const { isInitialNode, getChildren, getComponent } = require("./workflowUtil");
const { emit, addDispatchedTask } = require("./projectResource");

// utility functions
function forGetNextIndex(component) {
  return component.hasOwnProperty("currentIndex") ? component.currentIndex + component.step : component.start;
}
function forIsFinished(component) {
  return (component.currentIndex > component.end && component.step > 0) || (component.currentIndex < component.end && component.step < 0);
}
function whileGetNextIndex(component) {
  return component.hasOwnProperty("currentIndex") ? ++(component.currentIndex) : 0;
}
function whileIsFinished(cwfDir, logger, component) {
  const cwd = path.resolve(cwfDir, component.path);
  const condition = evalConditionSync(component.condition, cwd, component.currentIndex, logger);

  return !condition;
}
function foreachGetNextIndex(component) {
  if (component.hasOwnProperty("currentIndex")) {
    const i = component.indexList.findIndex((e)=>{
      return e.label === component.currentIndex;
    });

    if (i === -1 || i === component.indexList.length - 1) {
      return undefined;
    }
    return component.indexList[i + 1].label;

  }
  return component.indexList[0].label;

}
function foreachIsFinished(component) {
  return component.currentIndex === undefined;
}

function loopInitialize(component) {
  component.initialized = true;
  component.originalPath = component.path;
  component.originalName = component.name;
}

function isFinishedState(state) {
  return state === "finished" || state === "failed";
}

/**
 * evalute condition by executing external command or evalute JS expression
 * @param {string} condition - command name or javascript expression
 */
function evalConditionSync(condition, cwd, currentIndex, logger) {
  if (!(typeof condition === "string" || typeof condition === "boolean")) {
    logger.warn("condition must be string or boolean");
    return false;
  }
  const script = path.resolve(cwd, condition);

  try {
    fs.accessSync(script);
  } catch (e) {
    if (e.code === "ENOENT") {
      logger.debug("evalute ", condition);
      // eslint-disable-next-line no-eval
      return eval(`var WHEEL_CURRENT_INDEX=${currentIndex};${condition}`);
    }
  }
  logger.debug("execute ", script);
  addXSync(script);
  const dir = path.dirname(script);
  const options = {
    env: process.env,
    cwd: dir
  };

  if (currentIndex !== undefined) {
    options.env.WHEEL_CURRENT_INDEX = currentIndex.toString();
  }
  return childProcess.spawnSync(script, options).status === 0;
}

/**
 * set component state and emit event
 */
function setComponentState(projectRootDir, component, state) {
  component.state = state;
  emit(projectRootDir, "componentStateChanged");
}


/**
 * parse workflow graph and dispatch ready tasks to executer
 * @param {string} projectRootDir - root directory path of project
 * @param {string} parentID       - parent component's ID
 * @param {string} cwfDir         - currently dispatching workflow directory
 * @param {string} startTime      - project start time
 */
class Dispatcher extends EventEmitter {
  constructor(projectRootDir, parentID, cwfDir, startTime, logger) {
    super();
    this.projectRootDir = projectRootDir;
    this.parentID = parentID;
    this.cwfDir = cwfDir;
    this.projectStartTime = startTime;
    this.logger = logger;

    this.nextSearchList = [];
    this.children = new Set(); // child dispatcher instance
    this.dispatchedTaskList = [];
  }

  async _dispatch() {

    // overwrite doCleanup if parent's cleanupFlag is not "2"
    this.parentJson = await getComponent(this.projectRootDir, this.parentID);
    if (this.parentJson.cleanupFlag !== "2") {
      this.doCleanup = this.parentJson.cleanupFlag === "0";
    }
    const childComponents = await getChildren(this.projectRootDir, this.parentID);

    this.currentSearchList = childComponents.filter((component)=>{
      return isInitialNode(component);
    });
    this.logger.debug("initial tasks : ", this.currentSearchList.map((e)=>{
      return e.name;
    }));
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
      if (target.state === "finished") {
        promises.push(
          deliverOutputFiles(target.outputFiles, path.resolve(this.cwfDir, target.path))
            .then((rt)=>{
              if (rt.length > 0) {
                this.logger.debug("deliverOutputFiles:\n", rt);
              }
            })
        );
      } else {
        const cmd = this._cmdFactory(target.type);

        setComponentState(this.projectRootDir, target, "running");
        promises.push(
          cmd.call(this, target)
            .then(()=>{

              // task component is not finished at this time
              if (target.type === "task") {
                return;
              }
              deliverOutputFiles(target.outputFiles, path.resolve(this.cwfDir, target.path))
                .then((rt)=>{
                  if (rt.length > 0) {
                    this.logger.debug("deliverOutputFiles:\n", rt);
                  }
                });
            })
            .catch((err)=>{
              setComponentState(this.projectRootDir, target, "failed");
              return Promise.reject(err);
            })
        );
      }
    }
    try {
      await Promise.all(promises);
    } catch (e) {
      this.emit("error", e);
    }

    // remove duplicated entry
    const tmp = new Set(this.nextSearchList);

    this.currentSearchList = Array.from(tmp.values());
    this.nextSearchList = [];
    if (this.isFinished()) {
      this.removeListener("dispatch", this._dispatch);
      const hasFailed = this.dispatchedTaskList.some((task)=>{
        return task.state === "failed";
      });

      this.emit("done", !hasFailed);
    } else {

      // call next dispatcher
      setTimeout(()=>{
        this.emit("dispatch");
      }, interval);
    }
  }

  isFinished() {
    if (this.currentSearchList.length > 0 || this.nextSearchList.length > 0) {
      return false;
    }
    const hasRunningTask = this.dispatchedTaskList.some((task)=>{
      return !isFinishedState(task.state);
    });

    return !hasRunningTask;
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
        /* eslint-disable no-use-before-define */
        this.removeListener("error", onError);
        this.removeListener("done", onDone);
        /* eslint-enable no-use-before-define */
        this.removeListener("stop", onStop);
      };
      const onDone = (isSuccess)=>{
        onStop();
        const projectState = isSuccess ? "finished" : "failed";

        resolve(projectState);
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

  _addNextComponent(component, useElse = false) {
    const nextComponents = useElse ? Array.from(component.else) : Array.from(component.next);

    component.outputFiles.forEach((outputFile)=>{
      const tmp = outputFile.dst.map((e)=>{
        if (e.dstNode !== "parent") {
          return e.dstNode;
        }
        return null;

      }).filter((e)=>{
        return e !== null;
      });

      Array.prototype.push.apply(nextComponents, tmp);
    });
    Array.prototype.push.apply(this.nextSearchList, nextComponents);
  }

  async _dispatchTask(task) {
    this.logger.debug("_dispatchTask called", task.name);
    task.startTime = "not started"; // to be assigned in executer
    task.endTime = "not finished"; // to be assigned in executer
    task.projectStartTime = this.projectStartTime;
    task.projectRootDir = this.projectRootDir;
    task.workingDir = path.resolve(this.cwfDir, task.name);

    if (task.cleanupFlag === "2") {
      task.doCleanup = this.doCleanup;
    } else {
      task.doCleanup = task.cleanupFlag === "0";
    }

    if (this.parentJson.currentIndex !== undefined) {
      task.currentIndex = this.parentJson.currentIndex;
    }
    exec(task, this.logger);

    // following 2 containers are used for different purpose, please keep duplicated!
    this.dispatchedTaskList.push(task);
    addDispatchedTask(this.projectRootDir, task);
    this._addNextComponent(task);
  }

  async _checkIf(component) {
    this.logger.debug("_checkIf called", component.name);
    const cwd = path.resolve(this.cwfDir, component.path);

    // TODO read Json and get currentIndex
    const condition = evalConditionSync(component.condition, cwd, this.wf.currentIndex, this.logger);

    this._addNextComponent(component, !condition);
    setComponentState(this.projectRootDir, component, "finished");
  }

  async _readChild(component) {
    const childWorkflowFilename = path.resolve(this.cwfDir, component.path, component.jsonFile);

    return fs.readJSON(childWorkflowFilename);
  }

  async _delegate(component) {
    this.logger.debug("_delegate called", component.name);
    const childDir = path.resolve(this.cwfDir, component.path);
    const childWF = await this._readChild(component);

    if (component.currentIndex !== undefined) {
      childWF.currentIndex = component.currentIndex;
    }
    const child = new Dispatcher(this.projectRootDir, component.ID, childDir, this.projectStartTime);

    this.children.add(child);

    // exception should be catched in caller
    try {
      const state = await child.start();

      setComponentState(this.projectRootDir, component, state);
    } finally {
      this._addNextComponent(component);
    }
  }

  async _loopFinalize(component, lastDir) {
    const dstDir = path.resolve(this.cwfDir, component.originalPath);

    if (lastDir !== dstDir) {
      this.logger.debug("copy ", lastDir, "to", dstDir);
      await fs.copy(lastDir, dstDir);
    }
    delete component.initialized;
    delete component.currentIndex;
    component.name = component.originalName;
    component.path = component.originalPath;
    this._addNextComponent(component);
    component.state = component.hasFaild ? "failed" : "finished";
  }

  async _loopHandler(getNextIndex, isFinished, component) {
    if (component.childLoopRunning) {

      // send back itself to searchList for next loop trip
      this.nextSearchList.push(component.index);
      return;
    }
    this.logger.debug("_loopHandler called", component.name);
    component.childLoopRunning = true;
    if (!component.initialized) {
      loopInitialize(component);
    }

    // determine old loop block directory
    let srcDir = component.hasOwnProperty("currentIndex") ? component.path : `${component.originalPath}_${component.currentIndex}`;

    srcDir = path.resolve(this.cwfDir, srcDir);

    // update index variable(component.currentIndex)
    component.currentIndex = getNextIndex(component);

    // end determination
    if (isFinished(component)) {
      await this._loopFinalize(component, srcDir);
      return;
    }

    // send back itself to searchList for next loop trip
    this.nextSearchList.push(component.index);

    const newComponent = Object.assign({}, component);

    newComponent.name = `${component.originalName}_${component.currentIndex}`;
    newComponent.path = newComponent.name;
    const dstDir = path.resolve(this.cwfDir, newComponent.name);

    try {
      await fs.copy(srcDir, dstDir); // fs-extra's copy overwrites dst by default
      const childWF = await this._readChild(component);

      childWF.name = newComponent.name;
      childWF.path = newComponent.path;
      await fs.writeJson(path.resolve(dstDir, newComponent.jsonFile), childWF, { spaces: 4 });
      await this._delegate(newComponent);
      if (newComponent.state === "failed") {
        component.hasFaild = true;
      }
    } catch (e) {
      e.index = component.currentIndex;
      this.logger.warn("fatal error occurred during loop child dispatching.", e);
      return Promise.reject(e);
    }
    this.logger.debug("loop finished at index =", component.currentIndex);
    component.childLoopRunning = false;
  }
  async _PSHandler(component) {
    this.logger.debug("_PSHandler called", component.name);
    const srcDir = path.resolve(this.cwfDir, component.path);
    const paramSettingsFilename = path.resolve(srcDir, component.parameterFile);
    const paramSettings = JSON.parse(await promisify(fs.readFile)(paramSettingsFilename));

    const targetFile = paramSettings.target_file;
    const paramSpace = removeInvalid(paramSettings.target_param);

    // ignore all filenames in file type parameter space and parameter study setting file
    const ignoreFiles = getFilenames(paramSpace).map((e)=>{
      return path.resolve(srcDir, e);
    });

    ignoreFiles.push(paramSettingsFilename);

    const promises = [];

    component.numTotal = getParamSize(paramSpace);
    for (const paramVec of paramVecGenerator(paramSpace)) {
      let dstDir = paramVec.reduce((p, e)=>{
        let v = e.value;

        if (e.type === "file") {

          // TODO /以外のメタキャラクタも置換する
          v = (e.value).replace(path.sep, "_");
        }
        return `${p}_${e.key}_${v}`;
      }, component.path);

      dstDir = path.resolve(this.cwfDir, dstDir);

      // copy file which is specified as parameter
      const includeFiles = paramVec
        .filter((e)=>{
          return e.type === "file";
        })
        .map((e)=>{
          return path.resolve(srcDir, e.value);
        });
      const options = {};

      options.filter = function(filename) {
        return !ignoreFiles.filter((e)=>{
          return !includeFiles.includes(e);
        }).includes(filename);
      };
      this.logger.debug("copy from", srcDir, "to ", dstDir);
      await fs.copy(srcDir, dstDir, options);

      let data = await promisify(fs.readFile)(path.resolve(srcDir, targetFile));

      data = data.toString();
      paramVec.forEach((e)=>{
        data = data.replace(new RegExp(`%%${e.key}%%`, "g"), e.value.toString());
      });
      const rewriteFile = path.resolve(dstDir, targetFile);

      await promisify(fs.writeFile)(rewriteFile, data); // fs.writeFile overwrites existing file

      const newComponent = Object.assign({}, component);

      newComponent.name = path.relative(this.cwfDir, dstDir);
      newComponent.path = newComponent.name;
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
    this._addNextComponent(component);
    const state = component.numFailed > 0 ? "failed" : "finished";

    setComponentState(this.projectRootDir, component, state);
  }

  async _isReady(component) {
    for (const ID of component.previous) {
      const previous = await getComponent(this.projectRootDir, ID);

      if (!isFinishedState(previous.state)) {
        return false;
      }
    }
    for (const inputFile of component.inputFiles) {
      for (const ID of inputFile.src) {
        const previous = await getComponent(this.projectRootDir, ID);

        if (!isFinishedState(previous.state)) {
          return false;
        }
      }
    }
    return true;
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
