const path = require("path");
const { promisify } = require("util");

const fs = require("fs-extra");
const pathIsInside = require("path-is-inside");

const { getLogger } = require("../logSettings");
const logger = getLogger("workflow");
const { projectJsonFilename, componentJsonFilename } = require("../db/db");
const { sendWorkflow, getComponentDir, getComponent } = require("./workflowUtil");
const { setCwd, getCwd, gitAdd } = require("./projectResource");
const { replacePathsep, isValidName } = require("./utility");
const componentFactory = require("./workflowComponent");

/**
 * add suffix to dirname and make directory
 * @param basename dirname
 * @param suffix   number
 * @returns actual directory name
 *
 * makeDir create "basenme+suffix" direcotry. suffix is increased until the dirname is no longer duplicated.
 */
async function _makeDir(basename, suffix) {
  const dirname = basename + suffix;

  return promisify(fs.mkdir)(dirname)
    .then(()=>{
      return dirname;
    })
    .catch((err)=>{
      if (err.code === "EEXIST") {
        return _makeDir(basename, suffix + 1);
      }
      logger.warn("mkdir failed", err);
    });
}

// this function is used as modifier of updateComponentPath
async function changeComponentPath(ID, newPath, projectRootDir, componentPath) {
  componentPath[ID] = replacePathsep(path.relative(projectRootDir, newPath));
}

async function updateComponentPath(projectRootDir, modifier) {
  const filename = path.resolve(projectRootDir, projectJsonFilename);
  const projectJson = await fs.readJson(filename);

  if (typeof modifier === "function") {
    await modifier(projectRootDir, projectJson.componentPath);
  }

  await fs.writeJson(filename, projectJson, { spaces: 4 });
  await gitAdd(projectRootDir, filename);
}

// return value include search-root itself
async function getDescendantsID(projectRootDir, ID) {
  const filename = path.resolve(projectRootDir, projectJsonFilename);
  const projectJson = await fs.readJson(filename);
  const poi = await getComponentDir(projectRootDir, ID);
  const rt = [];

  for (const [id, componentPath] of Object.entries(projectJson.componentPath)) {
    if (pathIsInside(path.resolve(projectRootDir, componentPath), poi)) {
      rt.push(id);
    }
  }
  return rt;
}

// component can be one of "path of component Json file", "component json object", or "component's ID"
async function updateComponentJson(projectRootDir, component, modifier) {
  const componentJson = await getComponent(projectRootDir, component);

  if (typeof modifier === "function") {
    await modifier(componentJson);
  }

  // resolve component json filename from parenet dirname, component.name, and componentJsonFilename constant
  // to avoid using old path in componentPath when component's name is changed
  const parentDir = componentJson.parent ? await getComponentDir(projectRootDir, componentJson.parent) : projectRootDir;
  const filename = path.resolve(parentDir, componentJson.name, componentJsonFilename);

  await fs.writeJson(filename, componentJson, { spaces: 4 });
  return gitAdd(projectRootDir, filename);
}

async function onWorkflowRequest(emit, projectRootDir, ID, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("Workflow Request event recieved:", projectRootDir, ID);
  const componentDir = await getComponentDir(projectRootDir, ID);

  logger.info("open workflow:", componentDir);
  try {
    await setCwd(projectRootDir, componentDir);
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    logger.error("read workflow failed", e);
    cb(false);
  }
  cb(true);
}

async function onCreateNode(emit, projectRootDir, request, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("createNode event recieved:", request);
  try {
    const parentDir = getCwd(projectRootDir);
    const parentJson = await getComponent(projectRootDir, path.join(parentDir, componentJsonFilename));
    const parentID = parentJson.ID;

    // create component directory
    const absDirName = await _makeDir(path.resolve(parentDir, request.type), 0);

    const newComponent = componentFactory(request.type, request.pos, parentID);

    await updateComponentJson(projectRootDir, newComponent, (json)=>{
      json.name = path.basename(absDirName);
    });

    // update path map
    await updateComponentPath(projectRootDir, changeComponentPath.bind(null, newComponent.ID, absDirName));
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    e.projectRootDir = projectRootDir;
    e.request = request;
    logger.error("create node failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onUpdateNode(emit, projectRootDir, ID, prop, value, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("updateNode event recieved:", projectRootDir, ID, prop, value);
  if (prop === "inputFiles" || prop === "outputFiles") {
    logger.error("updateNode does not support", prop, ". please use renameInputFile or renameOutputFile");
    cb(false);
    return;
  }
  if (prop === "path") {
    logger.error("path property is deprecated. please use 'name' instead.");
    cb(false);
    return;
  }

  const update = (json)=>{
    json[prop] = value;
  };

  try {
    const nodeDir = await getComponentDir(projectRootDir, ID);

    if (prop === "name") {
      if (nodeDir === projectRootDir || !isValidName(value)) {
        logger.debug("updateNode can not rename root workflow");
        cb(false);
        return;
      }
      const newDir = path.resolve(path.dirname(nodeDir), value);

      await fs.move(nodeDir, newDir);
      await updateComponentJson(projectRootDir, path.resolve(newDir, componentJsonFilename), update);
      await updateComponentPath(projectRootDir, changeComponentPath.bind(null, ID, newDir));
    } else {
      await updateComponentJson(projectRootDir, path.resolve(nodeDir, componentJsonFilename), update);
    }
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    e.projectRootDir = projectRootDir;
    e.ID = ID;
    e.prop = prop;
    e.value = value;
    logger.error("update node failed", e);
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

  return Promise.all(Array.from(counterparts, ([, component])=>{
    return updateComponentJson(projectRootDir, component);
  }));
}

async function onRemoveNode(emit, projectRootDir, targetID, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("removeNode event recieved:", projectRootDir, targetID);
  try {
    const nodeDir = await getComponentDir(projectRootDir, targetID);
    const descendantsID = await getDescendantsID(projectRootDir, targetID);

    // remove all link/filelink to or from components to be removed
    for (const descendantID of descendantsID) {
      await removeAllLink(projectRootDir, descendantID);
    }

    // remove all descendants and target component itself from componentPath
    await updateComponentPath(projectRootDir, async(projectRootDir, componentPath)=>{
      for (const descendantID of descendantsID) {
        delete componentPath[descendantID];
      }
    });

    // memo
    // gitOperator.rm()内部で実際に存在するファイルを再帰的に探して
    // git rmを行なっているので、先にファイルを削除するとエラーになる。
    // しかし、実際にはファイルの削除が正常に終了したファイルから順にgit rmするべき
    //
    // git rm
    await gitAdd(projectRootDir, nodeDir, true);

    // remove files
    await fs.remove(nodeDir);

    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    logger.error("remove node failed:", e);
    cb(false);
  }
  cb(true);
}

async function onAddInputFile(emit, projectRootDir, ID, name, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("addInputFile event recieved:", projectRootDir, ID, name);
  try {
    await updateComponentJson(projectRootDir, ID, (componentJson)=>{
      componentJson.inputFiles.push({ name, src: [] });
    });
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    logger.error("addInputFile failed", e);
    cb(false);
    return;
  }
  cb(true);
}
async function onAddOutputFile(emit, projectRootDir, ID, name, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("addOutputFile event recieved:", projectRootDir, ID, name);
  try {
    await updateComponentJson(projectRootDir, ID, (componentJson)=>{
      componentJson.outputFiles.push({ name, dst: [] });
    });
    await sendWorkflow(emit, projectRootDir);
  } catch (e) {
    logger.error("addOutputFile failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onRemoveInputFile(emit, projectRootDir, ID, name, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("removeInputFile event recieved:", projectRootDir, ID, name);
  const counterparts = new Set();

  try {
    await updateComponentJson(projectRootDir, ID, (componentJson)=>{
      componentJson.inputFiles = componentJson.inputFiles.filter((inputFile)=>{
        if (name === inputFile.name) {
          for (const src of inputFile.src) {

            // TODO 親子間のファイルLinkの仕様が固まったら、そっちも削除
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
    logger.error("removeInputFile failed", e);
    cb(false);
    return;
  }
  cb(true);
}
async function onRemoveOutputFile(emit, projectRootDir, ID, name, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("removeOutputFile event recieved:", projectRootDir, ID, name);
  const counterparts = new Set();

  try {
    await updateComponentJson(projectRootDir, ID, (componentJson)=>{
      componentJson.outputFiles = componentJson.outputFiles.filter((outputFile)=>{
        if (name === outputFile.name) {
          for (const dst of outputFile.dst) {

            // TODO 親子間のファイルLinkの仕様が固まったら、そっちも削除
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
    logger.error("removeOutputFile failed", e);
    cb(false);
    return;
  }
  cb(true);
}
async function onRenameInputFile(emit, projectRootDir, ID, oldName, newName, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("renameIntputFile event recieved:", projectRootDir, ID, oldName, newName);
  const counterparts = new Set();

  try {
    await updateComponentJson(projectRootDir, ID, (componentJson)=>{
      componentJson.inputFiles = componentJson.inputFiles.map((inputFile)=>{
        if (inputFile.name === oldName) {
          inputFile.name = newName;
          inputFile.src.forEach((e)=>{
            counterparts.add(e.srcNode);
          });
        }
        return inputFile;
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
    logger.error("renameInputFile failed", e);
    cb(false);
    return;
  }
  cb(true);
}
async function onRenameOutputFile(emit, projectRootDir, ID, oldName, newName, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("renameOuttputFile event recieved:", projectRootDir, ID, oldName, newName);
  const counterparts = new Set();

  try {
    await updateComponentJson(projectRootDir, ID, (componentJson)=>{
      componentJson.outputFiles = componentJson.outputFiles.map((outputFile)=>{
        if (outputFile.name === oldName) {
          outputFile.name = newName;
          outputFile.dst.forEach((e)=>{
            counterparts.add(e.dstNode);
          });
        }
        return outputFile;
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
    logger.error("renameOutputFile failed", e);
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
  logger.debug("addLink event recieved:", msg.src, msg.dst, msg.isElse);
  if (msg.src === msg.dst) {
    logger.error("cyclic link is not allowed");
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
    logger.error("addLink failed", e);
    cb(false);
    return;
  }
  cb(true);
}
async function onRemoveLink(emit, projectRootDir, msg, cb) {
  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  logger.debug("removeLink event recieved:", msg.src, msg.dst);
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
    logger.error("removeLink failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onAddFileLink(emit, projectRootDir, srcNode, srcName, dstNode, dstName, cb) {
  logger.debug("addFileLink event recieved:", srcNode, srcName, dstNode, dstName);
  if (srcNode === dstNode) {
    logger.error("cyclic link is not allowed");
    cb(false);
    return;
  }
  try {
    const srcDir = await getComponentDir(projectRootDir, srcNode);
    const dstDir = await getComponentDir(projectRootDir, dstNode);

    if (path.dirname(dstDir) === srcDir) {

      // TODO
      // link to parent
    } else if (path.dirname(srcDir) === dstDir) {

      // TODO
      // link to child
    } else {

      // normal case
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
    logger.error("add file link failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onRemoveFileLink(emit, projectRootDir, srcNode, srcName, dstNode, dstName, cb) {
  logger.debug("removeFileLink event recieved:", srcNode, srcName, dstNode, dstName);
  try {
    const srcDir = await getComponentDir(projectRootDir, srcNode);
    const dstDir = await getComponentDir(projectRootDir, dstNode);

    if (path.dirname(dstDir) === srcDir) {

      // TODO
      // link to parent
    } else if (path.dirname(srcDir) === dstDir) {

      // TODO
      // link to child
    } else {

      // normal case
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
    logger.error("remove file link failed", e);
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
}

module.exports = registerListeners;
