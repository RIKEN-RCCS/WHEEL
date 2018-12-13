"use strict";
const path = require("path");
const fs = require("fs-extra");
const pathIsInside = require("path-is-inside");
const { projectJsonFilename, componentJsonFilename } = require("../db/db");
const { sendWorkflow, getComponentDir, getComponent, updateComponentJson } = require("./workflowUtil");
const { setCwd, getCwd, getLogger } = require("./projectResource");
const { gitRm, gitAdd, gitResetHEAD } = require("./gitOperator");
const { replacePathsep, isValidName, readJsonGreedy, convertPathSep, getDateString } = require("./utility");
const componentFactory = require("./workflowComponent");

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

//this function is used as modifier of updateComponentPath
function changeComponentPath(ID, newPath, projectRootDir, componentPath) {
  const oldRelativePath = componentPath[ID];
  let newRelativePath = path.relative(projectRootDir, newPath);
  if(! newRelativePath.startsWith(".")) newRelativePath = "./"+newRelativePath;
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
    const parentJson = await getComponent(projectRootDir, path.join(parentDir, componentJsonFilename));
    const parentID = parentJson.ID;

    //create component directory and Json file
    const absDirName = await makeDir(path.resolve(parentDir, request.type), 0);
    const newComponent = componentFactory(request.type, request.pos, parentID);
    newComponent.name = path.basename(absDirName);
    rt = newComponent;
    await updateComponentJson(projectRootDir, newComponent);

    //update path map
    await updateComponentPath(projectRootDir, changeComponentPath.bind(null, newComponent.ID, absDirName));
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

  if (prop === "inputFiles" || prop === "outputFiles") {
    getLogger(projectRootDir).error("updateNode does not support", prop, ". please use renameInputFile or renameOutputFile");
    cb(false);
    return;
  }

  if (prop === "path") {
    getLogger(projectRootDir).error("path property is deprecated. please use 'name' instead.");
    cb(false);
    return;
  }

  const update = (json)=>{
    json[prop] = value;
  };

  try {
    const nodeDir = await getComponentDir(projectRootDir, ID);

    if (prop === "name") {
      if (!isValidName(value)) {
        getLogger(projectRootDir).debug(`${value} is not valid component name`);
        cb(false);
        return;
      }
      if (nodeDir === projectRootDir) {
        getLogger(projectRootDir).debug("updateNode can not rename root workflow");
        cb(false);
        return;
      }
      const newDir = path.resolve(path.dirname(nodeDir), value);
      await gitRm(projectRootDir, nodeDir);
      await fs.move(nodeDir, newDir);
      await updateComponentJson(projectRootDir, path.resolve(newDir, componentJsonFilename), update);
      await updateComponentPath(projectRootDir, changeComponentPath.bind(null, ID, newDir));
      await gitAdd(projectRootDir, newDir);
    } else {
      await updateComponentJson(projectRootDir, path.resolve(nodeDir, componentJsonFilename), update);
    }
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

    console.log("remove target =", targetDir);
    await fs.remove(targetDir);
    const pathSpec = `${path.relative(projectRootDir, targetDir)}/*`;
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
    getLogger(projectRootDir).error("reset component failed:", e);
    cb(false);
    return;
  }
  cb(true);
}

function registerListeners(socket, projectRootDir) {
  const emit = socket.emit.bind(socket);
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
