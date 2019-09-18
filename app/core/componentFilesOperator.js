"use strict";
const path = require("path");
const fs = require("fs-extra");
const { promisify } = require("util");
const glob = require("glob");
const { componentFactory } = require("./workflowComponent");
const { updateComponentPath, removeComponentPath, getComponentDir, getDescendantsIDs } = require("./projectFilesOperator");
const { componentJsonFilename, remoteHost, jobScheduler } = require("../db/db");
const { readJsonGreedy } = require("./fileUtils");
const { gitAdd, gitRm, gitResetHEAD } = require("./gitOperator");
const { isValidName, isValidInputFilename, isValidOutputFilename } = require("../lib/utility");
const { hasChild, isInitialComponent } = require("./workflowComponent");
const { replacePathsep } = require("../core/pathUtils");

/*
 * private functions
 */

/**
 * write component Json file and git add
 */
async function writeComponentJson(projectRootDir, componentDir, component) {
  const filename = path.join(componentDir, componentJsonFilename);
  await fs.writeJson(filename, component, { spaces: 4, replacer: componentJsonReplacer });
  return gitAdd(projectRootDir, filename);
}

/**
 * read component Json file
 */
async function readComponentJson(componentDir) {
  const filename = path.join(componentDir, componentJsonFilename);
  const componentJson = await readJsonGreedy(filename);
  return componentJson;
}

/**
 * getComponentDir and read componentJson
 */
async function getComponent(projectRootDir, ID) {
  const componentDir = await getComponentDir(projectRootDir, ID, true);
  return readComponentJson(componentDir);
}


async function isParent(projectRootDir, parentID, childID) {
  const childJson = await getComponent(projectRootDir, childID);
  if (childJson === null || typeof childID !== "string") {
    return false;
  }
  return childJson.parent === parentID;
}


async function removeAllLink(projectRootDir, ID) {
  const counterparts = new Map();
  const component = await getComponent(projectRootDir, ID);

  if (component.hasOwnProperty("previous")) {
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
  }

  if (component.hasOwnProperty("next")) {
    for (const nextComponent of component.next) {
      const counterpart = counterparts.get(nextComponent) || await getComponent(projectRootDir, nextComponent);
      counterpart.previous = counterpart.previous.filter((e)=>{
        return e !== component.ID;
      });
      counterparts.set(counterpart.ID, counterpart);
    }
  }

  if (component.hasOwnProperty("else")) {
    for (const elseComponent of component.else) {
      const counterpart = counterparts.get(elseComponent) || await getComponent(projectRootDir, elseComponent);
      counterpart.previous = counterpart.previous.filter((e)=>{
        return e !== component.ID;
      });
      counterparts.set(counterpart.ID, counterpart);
    }
  }

  if (component.hasOwnProperty("inputFiles")) {
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
  }

  if (component.hasOwnProperty("outputFiles")) {
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
  }

  const p = [];
  for (const [counterPartID, counterpart] of counterparts) {
    const componentDir = await getComponentDir(projectRootDir, counterPartID, true);
    p.push(writeComponentJson(projectRootDir, componentDir, counterpart));
  }

  return Promise.all(p);
}


async function addFileLinkToParent(projectRootDir, srcNode, srcName, dstName) {
  const p = [];
  const srcDir = await getComponentDir(projectRootDir, srcNode, true);
  const srcJson = await readComponentJson(srcDir);
  const parentDir = path.dirname(srcDir);
  const parentJson = await readComponentJson(parentDir);
  const parentID = parentJson.ID;

  const srcOutputFile = srcJson.outputFiles.find((e)=>{
    return e.name === srcName;
  });
  if (!srcOutputFile.dst.includes({ dstNode: parentID, dstName })) {
    srcOutputFile.dst.push({ dstNode: parentID, dstName });
  }
  p.push(writeComponentJson(projectRootDir, srcDir, srcJson));

  const parentOutputFile = parentJson.outputFiles.find((e)=>{
    return e.name === dstName;
  });
  if (!parentOutputFile.hasOwnProperty("origin")) {
    parentOutputFile.origin = [];
  }
  if (!parentOutputFile.origin.includes({ srcNode, srcName })) {
    parentOutputFile.origin.push({ srcNode, srcName });
  }
  p.push(writeComponentJson(projectRootDir, parentDir, parentJson));
  return Promise.all(p);
}
async function addFileLinkFromParent(projectRootDir, srcName, dstNode, dstName) {
  const p = [];
  const dstDir = await getComponentDir(projectRootDir, dstNode, true);
  const dstJson = await readComponentJson(dstDir);
  const parentDir = path.dirname(dstDir);
  const parentJson = await readComponentJson(parentDir);
  const parentID = parentJson.ID;

  const parentInputFile = parentJson.inputFiles.find((e)=>{
    return e.name === srcName;
  });
  if (!parentInputFile.hasOwnProperty("forwardTo")) {
    parentInputFile.forwardTo = [];
  }
  if (!parentInputFile.forwardTo.includes({ dstNode, dstName })) {
    parentInputFile.forwardTo.push({ dstNode, dstName });
  }
  p.push(writeComponentJson(projectRootDir, parentDir, parentJson));

  const dstInputFile = dstJson.inputFiles.find((e)=>{
    return e.name === dstName;
  });
  if (!dstInputFile.src.includes({ srcNode: parentID, srcName })) {
    dstInputFile.src.push({ srcNode: parentID, srcName });
  }
  p.push(writeComponentJson(projectRootDir, dstDir, dstJson));
  return Promise.all(p);
}
async function addFileLinkBetweenSiblings(projectRootDir, srcNode, srcName, dstNode, dstName) {
  const p = [];
  const srcDir = await getComponentDir(projectRootDir, srcNode, true);
  const srcJson = await readComponentJson(srcDir);
  const srcOutputFile = srcJson.outputFiles.find((e)=>{
    return e.name === srcName;
  });
  if (!srcOutputFile.dst.includes({ dstNode, dstName })) {
    srcOutputFile.dst.push({ dstNode, dstName });
  }
  p.push(writeComponentJson(projectRootDir, srcDir, srcJson));

  const dstDir = await getComponentDir(projectRootDir, dstNode, true);
  const dstJson = await readComponentJson(dstDir);
  const dstInputFile = dstJson.inputFiles.find((e)=>{
    return e.name === dstName;
  });
  if (!dstInputFile.src.includes({ srcNode, srcName })) {
    dstInputFile.src.push({ srcNode, srcName });
  }
  p.push(writeComponentJson(projectRootDir, dstDir, dstJson));
  return Promise.all(p);
}

async function removeFileLinkToParent(projectRootDir, srcNode, srcName, dstNode, dstName) {
  const p = [];
  const srcDir = await getComponentDir(projectRootDir, srcNode, true);
  const srcJson = await readComponentJson(srcDir);
  const parentDir = path.dirname(srcDir);
  const parentJson = await readComponentJson(parentDir);

  const srcOutputFile = srcJson.outputFiles.find((e)=>{
    return e.name === srcName;
  });
  srcOutputFile.dst = srcOutputFile.dst.filter((e)=>{
    return e.dstNode !== parentJson.ID || e.dstName !== dstName;
  });
  p.push(writeComponentJson(projectRootDir, srcDir, srcJson));

  const parentOutputFile = parentJson.outputFiles.find((e)=>{
    return e.name === dstName;
  });
  if (parentOutputFile.hasOwnProperty("origin")) {
    parentOutputFile.origin = parentOutputFile.origin.filter((e)=>{
      return e.srcNode !== srcNode || e.srcName !== srcName;
    });
  }
  p.push(writeComponentJson(projectRootDir, parentDir, parentJson));
  return Promise.all(p);
}

async function removeFileLinkFromParent(projectRootDir, srcNode, srcName, dstNode, dstName) {
  const p = [];
  const dstDir = await getComponentDir(projectRootDir, dstNode, true);
  const dstJson = await readComponentJson(dstDir);
  const parentDir = path.dirname(dstDir);
  const parentJson = await readComponentJson(parentDir);
  const parentID = parentJson.ID;

  const parentInputFile = parentJson.inputFiles.find((e)=>{
    return e.name === srcName;
  });
  if (parentInputFile.hasOwnProperty("forwardTo")) {
    parentInputFile.forwardTo = parentInputFile.forwardTo.filter((e)=>{
      return e.dstNode !== dstNode || e.dstName !== dstName;
    });
  }
  p.push(writeComponentJson(projectRootDir, parentDir, parentJson));

  const dstInputFile = dstJson.inputFiles.find((e)=>{
    return e.name === dstName;
  });
  dstInputFile.src = dstInputFile.src.filter((e)=>{
    return e.srcNode !== parentID || e.srcName !== srcName;
  });
  p.push(writeComponentJson(projectRootDir, dstDir, dstJson));
  return Promise.all(p);
}

async function removeFileLinkBetweenSiblings(projectRootDir, srcNode, srcName, dstNode, dstName) {
  const p = [];
  const srcDir = await getComponentDir(projectRootDir, srcNode, true);
  const srcJson = await readComponentJson(srcDir);
  const srcOutputFile = srcJson.outputFiles.find((e)=>{
    return e.name === srcName;
  });
  srcOutputFile.dst = srcOutputFile.dst.filter((e)=>{
    return !(e.dstNode === dstNode && e.dstName === dstName);
  });
  p.push(writeComponentJson(projectRootDir, srcDir, srcJson));

  const dstDir = await getComponentDir(projectRootDir, dstNode, true);
  const dstJson = await readComponentJson(dstDir);
  const dstInputFile = dstJson.inputFiles.find((e)=>{
    return e.name === dstName;
  });
  dstInputFile.src = dstInputFile.src.filter((e)=>{
    return !(e.srcNode === srcNode && e.srcName === srcName);
  });
  p.push(writeComponentJson(projectRootDir, dstDir, dstJson));
  return Promise.all(p);
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

async function getChildren(projectRootDir, parentID) {
  const dir = parentID === null ? projectRootDir : await getComponentDir(projectRootDir, parentID, true);

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
    if (typeof hostinfo === "undefined") {
      //assume local job
      //TODO add jobScheduler setting to server.json and read it
    } else if (!Object.keys(jobScheduler).includes(hostinfo.jobScheduler)) {
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
  return true;
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
  const filename = path.resolve(componentDir, component.parameterFile);
  await fs.access(filename);

  try {
    await readJsonGreedy(filename);
  } catch (err) {
    err.orgMessage = err.message;
    err.message = "parameter file parse error";
    err.parameterFile = component.parameterFile;
    return Promise.reject(err);
  }
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


/*
 * public functions
 */

/**
 * read component Json recursively and pick up remote hosts used in task component
 */
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
    if (component.disable) {
      continue;
    }
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


function componentJsonReplacer(key, value) {
  if (["handler", "doCleanup", "sbsID", "childLoopRunning"].includes(key)) {
    //eslint-disable-next-line no-undefined
    return undefined;
  }
  return value;
}

/**
 * create new component in parentDir
 */
async function createNewComponent(projectRootDir, parentDir, type, pos) {
  const parentJson = await readJsonGreedy(path.resolve(parentDir, componentJsonFilename));
  const parentID = parentJson.ID;

  //create component directory and Json file
  const absDirName = await makeDir(path.resolve(parentDir, type), 0);
  const newComponent = componentFactory(type, pos, parentID);
  newComponent.name = path.basename(absDirName);
  await writeComponentJson(projectRootDir, absDirName, newComponent);
  await updateComponentPath(projectRootDir, newComponent.ID, absDirName);
  return newComponent;
}

/**
 * perform git mv and update component path in projectJson file
 */
async function renameComponentDir(projectRootDir, ID, newName) {
  if (!isValidName(newName)) {
    return Promise.reject(new Error(`${newName} is not valid component name`));
  }
  const oldDir = await getComponentDir(projectRootDir, ID, true);
  if (oldDir === projectRootDir) {
    return Promise.reject(new Error("updateNode can not rename root workflow"));
  }
  const newDir = path.resolve(path.dirname(oldDir), newName);
  await gitRm(projectRootDir, oldDir);
  await fs.move(oldDir, newDir);
  await gitAdd(projectRootDir, newDir);
  return updateComponentPath(projectRootDir, ID, newDir);
}

async function updateComponent(projectRootDir, ID, prop, value) {
  if (prop === "path") {
    return Promise.reject(new Error("path property is deprecated. please use 'name' instead."));
  }
  if (prop === "inputFiles" || prop === "outputFiles") {
    return Promise.reject(new Error(`updateNode does not support ${prop}. please use renameInputFile or renameOutputFile`));
  }
  if (prop === "name") {
    await renameComponentDir(projectRootDir, ID, value);
  }

  const componentDir = await getComponentDir(projectRootDir, ID, true);
  const componentJson = await readComponentJson(componentDir);
  componentJson[prop] = value;
  return writeComponentJson(projectRootDir, componentDir, componentJson);
}

async function addInputFile(projectRootDir, ID, name) {
  if (!isValidInputFilename(name)) {
    return Promise.reject(new Error(`${name} is not valid inputFile name`));
  }
  const componentDir = await getComponentDir(projectRootDir, ID, true);
  const componentJson = await readComponentJson(componentDir);
  if (!componentJson.hasOwnProperty("inputFiles")) {
    const err = new Error(`${componentJson.name} does not have inputFiles`);
    err.component = componentJson;
    return Promise.reject(err);
  }
  componentJson.inputFiles.push({ name, src: [] });
  return writeComponentJson(projectRootDir, componentDir, componentJson);
}
async function addOutputFile(projectRootDir, ID, name) {
  if (!isValidOutputFilename(name)) {
    return Promise.reject(new Error(`${name} is not valid outputFile name`));
  }
  const componentDir = await getComponentDir(projectRootDir, ID, true);
  const componentJson = await readComponentJson(componentDir);
  if (!componentJson.hasOwnProperty("outputFiles")) {
    const err = new Error(`${componentJson.name} does not have outputFiles`);
    err.component = componentJson;
    return Promise.reject(err);
  }
  if (componentJson.type === "source") {
    const err = new Error("source component can not have more than 2 outputFiles");
    err.component = componentJson;
    return Promise.reject(err);
  }
  componentJson.outputFiles.push({ name, dst: [] });
  return writeComponentJson(projectRootDir, componentDir, componentJson);
}
async function removeInputFile(projectRootDir, ID, name) {
  const counterparts = new Set();
  const componentDir = await getComponentDir(projectRootDir, ID, true);
  const componentJson = await readComponentJson(componentDir);
  componentJson.inputFiles = componentJson.inputFiles.filter((inputFile)=>{
    if (name !== inputFile.name) {
      return true;
    }
    for (const src of inputFile.src) {
      counterparts.add(src.srcNode);
    }
    return false;
  });

  const p = [writeComponentJson(projectRootDir, componentDir, componentJson)];
  for (const counterPartID of counterparts) {
    const counterpartDir = await getComponentDir(projectRootDir, counterPartID, true);
    const counterpartJson = await readComponentJson(counterpartDir);

    for (const outputFile of counterpartJson.outputFiles) {
      outputFile.dst = outputFile.dst.filter((dst)=>{
        return dst.dstNode !== ID;
      });
    }
    p.push(writeComponentJson(projectRootDir, counterpartDir, counterpartJson));
  }
  return Promise.all(p);
}
async function removeOutputFile(projectRootDir, ID, name) {
  const counterparts = new Set();
  const componentDir = await getComponentDir(projectRootDir, ID, true);
  const componentJson = await readComponentJson(componentDir);

  componentJson.outputFiles = componentJson.outputFiles.filter((outputFile)=>{
    if (name !== outputFile.name) {
      return true;
    }
    for (const dst of outputFile.dst) {
      counterparts.add(dst.dstNode);
    }
    return false;
  });

  const p = [writeComponentJson(projectRootDir, componentDir, componentJson)];
  for (const counterPartID of counterparts) {
    const counterpartDir = await getComponentDir(projectRootDir, counterPartID, true);
    const counterpartJson = await readComponentJson(counterpartDir);
    for (const inputFile of counterpartJson.inputFiles) {
      inputFile.src = inputFile.src.filter((src)=>{
        return src.srcNode !== ID;
      });
    }
    p.push(writeComponentJson(projectRootDir, counterpartDir, counterpartJson));
  }
  return Promise.all(p);
}
async function renameInputFile(projectRootDir, ID, index, newName) {
  if (!isValidInputFilename(newName)) {
    return Promise.reject(new Error(`${newName} is not valid inputFile name`));
  }
  const componentDir = await getComponentDir(projectRootDir, ID, true);
  const componentJson = await readComponentJson(componentDir);
  if (index < 0 || componentJson.inputFiles.length - 1 < index) {
    return Promise.reject(new Error(`invalid index ${index}`));
  }

  const counterparts = new Set();
  const oldName = componentJson.inputFiles[index].name;
  componentJson.inputFiles[index].name = newName;
  componentJson.inputFiles[index].src.forEach((e)=>{
    counterparts.add(e.srcNode);
  });
  const p = [writeComponentJson(projectRootDir, componentDir, componentJson)];

  for (const counterPartID of counterparts) {
    const counterpartDir = await getComponentDir(projectRootDir, counterPartID, true);
    const counterpartJson = await readComponentJson(counterpartDir);
    for (const outputFile of counterpartJson.outputFiles) {
      for (const dst of outputFile.dst) {
        if (dst.dstNode === ID && dst.dstName === oldName) {
          dst.dstName = newName;
        }
      }
    }
    p.push(writeComponentJson(projectRootDir, counterpartDir, counterpartJson));
  }
  return Promise.all(p);
}
async function renameOutputFile(projectRootDir, ID, index, newName) {
  if (!isValidOutputFilename(newName)) {
    return Promise.reject(new Error(`${newName} is not valid outputFile name`));
  }
  const componentDir = await getComponentDir(projectRootDir, ID, true);
  const componentJson = await readComponentJson(componentDir);
  if (index < 0 || componentJson.outputFiles.length - 1 < index) {
    return Promise.reject(new Error(`invalid index ${index}`));
  }

  const counterparts = new Set();
  const oldName = componentJson.outputFiles[index].name;
  componentJson.outputFiles[index].name = newName;
  componentJson.outputFiles[index].dst.forEach((e)=>{
    counterparts.add(e.dstNode);
  });
  const p = [writeComponentJson(projectRootDir, componentDir, componentJson)];

  for (const counterPartID of counterparts) {
    const counterpartDir = await getComponentDir(projectRootDir, counterPartID, true);
    const counterpartJson = await readComponentJson(counterpartDir);
    for (const inputFile of counterpartJson.inputFiles) {
      for (const src of inputFile.src) {
        if (src.srcNode === ID && src.srcName === oldName) {
          src.srcName = newName;
        }
      }
    }
    p.push(writeComponentJson(projectRootDir, counterpartDir, counterpartJson));
  }
  return Promise.all(p);
}
async function addLink(projectRootDir, src, dst, isElse = false) {
  if (src === dst) {
    return Promise.reject(new Error("cyclic link is not allowed"));
  }
  const srcDir = await getComponentDir(projectRootDir, src, true);
  const srcJson = await readComponentJson(srcDir);
  const dstDir = await getComponentDir(projectRootDir, dst, true);
  const dstJson = await readComponentJson(dstDir);

  for (const type of ["viewer", "source"]) {
    if (srcJson.type !== type && dstJson.type !== type) {
      continue;
    }
    const err = new Error(`${type} can not have link`);
    err.src = src;
    err.srcName = srcJson.name;
    err.dst = dst;
    err.dstName = dstJson.name;
    err.isElse = isElse;
    err.code = "ELINK";
    return Promise.reject(err);
  }

  if (isElse && !srcJson.else.includes(dst)) {
    srcJson.else.push(dst);
  } else if (!srcJson.next.includes(dst)) {
    srcJson.next.push(dst);
  }
  const p = [writeComponentJson(projectRootDir, srcDir, srcJson)];

  if (!dstJson.previous.includes(src)) {
    dstJson.previous.push(src);
  }
  p.push(writeComponentJson(projectRootDir, dstDir, dstJson));
  return Promise.all(p);
}

async function removeLink(projectRootDir, src, dst, isElse) {
  const srcDir = await getComponentDir(projectRootDir, src, true);
  const srcJson = await readComponentJson(srcDir);
  if (isElse) {
    srcJson.else = srcJson.else.filter((e)=>{
      return e !== dst;
    });
  } else {
    srcJson.next = srcJson.next.filter((e)=>{
      return e !== dst;
    });
  }
  const p = [writeComponentJson(projectRootDir, srcDir, srcJson)];

  const dstDir = await getComponentDir(projectRootDir, dst, true);
  const dstJson = await readComponentJson(dstDir);
  dstJson.previous = dstJson.previous.filter((e)=>{
    return e !== src;
  });
  p.push(writeComponentJson(projectRootDir, dstDir, dstJson));
  return Promise.all(p);
}

async function addFileLink(projectRootDir, srcNode, srcName, dstNode, dstName) {
  if (srcNode === dstNode) {
    return Promise.reject(new Error("cyclic link is not allowed"));
  }
  if (dstNode === "parent") {
    return addFileLinkToParent(projectRootDir, srcNode, srcName, dstName);
  }
  if (srcNode === "parent") {
    return addFileLinkFromParent(projectRootDir, srcName, dstNode, dstName);
  }
  //isParent() does not accept "parent" as parent or child ID.
  //so make sure both srcNode and dstNode is not "parent" before call it
  if (await isParent(projectRootDir, dstNode, srcNode)) {
    return addFileLinkToParent(projectRootDir, srcNode, srcName, dstName);
  }
  if (await isParent(projectRootDir, srcNode, dstNode)) {
    return addFileLinkFromParent(projectRootDir, srcName, dstNode, dstName);
  }
  return addFileLinkBetweenSiblings(projectRootDir, srcNode, srcName, dstNode, dstName);
}

async function removeFileLink(projectRootDir, srcNode, srcName, dstNode, dstName) {
  if (dstNode === "parent") {
    return removeFileLinkToParent(projectRootDir, srcNode, srcName, dstNode, dstName);
  }
  if (srcNode === "parent") {
    return removeFileLinkFromParent(projectRootDir, srcNode, srcName, dstNode, dstName);
  }
  //isParent() does not accept "parent" as parent or child ID.
  //so make sure both srcNode and dstNode is not "parent" before call it
  if (await isParent(projectRootDir, dstNode, srcNode)) {
    return removeFileLinkToParent(projectRootDir, srcNode, srcName, dstNode, dstName);
  }
  if (await isParent(projectRootDir, srcNode, dstNode)) {
    return removeFileLinkFromParent(projectRootDir, srcNode, srcName, dstNode, dstName);
  }
  return removeFileLinkBetweenSiblings(projectRootDir, srcNode, srcName, dstNode, dstName);
}


async function cleanComponent(projectRootDir, ID) {
  const targetDir = await getComponentDir(projectRootDir, ID, true);

  await fs.remove(targetDir);
  const pathSpec = `${replacePathsep(path.relative(projectRootDir, targetDir))}/*`;
  await gitResetHEAD(projectRootDir, pathSpec);

  const descendantsDirs = await getDescendantsIDs(projectRootDir, ID);
  return removeComponentPath(projectRootDir, descendantsDirs);
}

async function removeComponent(projectRootDir, ID) {
  const targetDir = await getComponentDir(projectRootDir, ID, true);
  const descendantsIDs = await getDescendantsIDs(projectRootDir, ID);

  //remove all link/filelink to or from components to be removed
  for (const descendantID of descendantsIDs) {
    await removeAllLink(projectRootDir, descendantID);
  }
  //gitOperator.rm() only remove existing files from git repo if directory is passed
  //so, gitRm and fs.remove must be called in this order
  await gitRm(projectRootDir, targetDir);
  await fs.remove(targetDir);

  return removeComponentPath(projectRootDir, descendantsIDs);
}

async function getSourceComponents(projectRootDir) {
  const componentJsonFiles = await promisify(glob)(path.join(projectRootDir, "**", componentJsonFilename));
  const components = await Promise.all(componentJsonFiles
    .map((componentJsonFile)=>{
      return readJsonGreedy(componentJsonFile);
    }));

  return components.filter((componentJson)=>{
    return componentJson.type === "source" && !componentJson.subComponent;
  });
}

/**
 * determin specified path is componennt dir or not
 * @param {string} target - directory path
 * @returns {boolean}
 */
async function isComponentDir(target) {
  const stats = await fs.lstat(path.resolve(target));
  if (!stats.isDirectory()) {
    return false;
  }
  return fs.pathExists(path.resolve(target, componentJsonFilename));
}


module.exports = {
  getHosts,
  getSourceComponents,
  validateComponents,
  componentJsonReplacer,
  createNewComponent,
  renameComponentDir,
  updateComponent,
  addInputFile,
  addOutputFile,
  removeInputFile,
  removeOutputFile,
  renameInputFile,
  renameOutputFile,
  addLink,
  addFileLink,
  removeLink,
  removeFileLink,
  cleanComponent,
  removeComponent,
  isComponentDir
};
