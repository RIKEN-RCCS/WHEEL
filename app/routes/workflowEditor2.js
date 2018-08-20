const path = require("path");
const {promisify} = require("util");

const fs = require("fs-extra");
const klaw = require('klaw');
const pathIsInside = require("path-is-inside");

const {getLogger} = require('../logSettings');
const logger = getLogger('workflow');
const {projectJsonFilename, componentJsonFilename} = require('../db/db');
const {sendWorkflow, getComponentDir, getComponent} = require("./workflowUtil");
const {setCwf, getCwf, gitAdd} = require("./project");
const {replacePathsep, isValidName} = require('./utility');
const componentFactory = require("./workflowComponent");

/**
 * add suffix to dirname and make directory
 * @param basename dirname
 * @param suffix   number
 * @return actual directory name
 *
 * makeDir create "basenme+suffix" direcotry. suffix is increased until the dirname is no longer duplicated.
 */
async function _makeDir(basename, suffix){
  const dirname=basename+suffix;
  return promisify(fs.mkdir)(dirname)
    .then(()=>{
      return dirname;
    })
    .catch((err)=>{
      if(err.code === 'EEXIST') {
        return _makeDir(basename, suffix+1);
      }
      logger.warn('mkdir failed', err);
    });
}

// this function is used as modifier of updateComponentPath
async function changeComponentPath(ID, newPath, projectRootDir, componentPath){
  componentPath[ID] = replacePathsep(path.relative(projectRootDir, newPath));
}

async function  updateComponentPath(projectRootDir, modifier){
  const filename = path.resolve(projectRootDir, projectJsonFilename);
  const projectJson = await fs.readJson(filename);
  if(typeof modifier === "function") await modifier(projectRootDir, projectJson.componentPath);

  await fs.writeJson(filename, projectJson, {spaces: 4});
  await gitAdd(projectRootDir, filename);
}

// even return search root it self
async function getDescendantsID(projectRootDir, ID){
  const filename = path.resolve(projectRootDir, projectJsonFilename);
  const projectJson = await fs.readJson(filename);
  const poi = await getComponentDir(projectRootDir, ID);
  const rt=[]
  for([id, componentPath] of Object.entries(projectJson.componentPath)){
    if(pathIsInside(path.resolve(projectRootDir, componentPath), poi)){
      rt.push(id);
    }
  }
  return rt;
}

// component can be one of "path of component Json file", "component json object", or "component's ID"
async function updateComponentJson(projectRootDir, component, modifier){
  const componentJson = await getComponent(projectRootDir, component);

  if(typeof modifier === "function") await modifier(component)

  // resolve component json filename from parenet dirname, component.name, and componentJsonFilename constant
  // to avoid using old path in componentPath when component's name is changed
  const parentDir = component.parent ? await getComponentDir(projectRootDir, component.parent) : projectRootDir;
  const filename = path.resolve(parentDir, component.name, componentJsonFilename);
  await fs.writeJson(filename, component, {spaces: 4});
  return gitAdd(projectRootDir, filename);
}

async function onWorkflowRequest(emit, projectRootDir, ID, cb){
  if(typeof cb !== "function") cb = ()=>{};
  logger.debug('Workflow Request event recieved:', projectRootDir, ID);
  const componentDir = await getComponentDir(projectRootDir, ID);
  const workflowFilename=path.resolve(componentDir, componentJsonFilename);
  logger.info('open workflow:', componentDir);
  try{
    //TODO pass ID
    await setCwf(projectRootDir, workflowFilename);
    await sendWorkflow(emit, projectRootDir);
  }catch(e){
    logger.error("read workflow failed", e);
    cb(false);
  }
  cb(true);
}

async function onCreateNode(emit, projectRootDir, request, cb){
  if(typeof cb !== "function") cb = ()=>{};
  logger.debug('create event recieved:', request);
  try{
    const parentID = getCwf(projectRootDir).ID;
    const parentDir = await getComponentDir(projectRootDir, parentID);

    // create component directory
    const absDirName = await _makeDir(path.resolve(parentDir,request.type), 0)

    const newComponent=componentFactory(request.type, request.pos, parentID);
    await updateComponentJson(projectRootDir, newComponent, (json)=>{
      json.name= path.basename(absDirName);
    });

    // update path map
    await updateComponentPath(projectRootDir, changeComponentPath.bind(null, newComponent.ID, absDirName));
    await sendWorkflow(emit, projectRootDir);
  }catch(e){
    e.projectRootDir=projectRootDir;
    e.request=request;
    logger.error('create node failed', e);
    cb(false);
    return;
  }
  cb(true);
}

async function onUpdateNode(emit, projectRootDir, ID, prop, value, cb){
  if(typeof cb !== "function") cb = ()=>{};
  logger.debug('updateNode event recieved:', projectRootDir, ID, prop, value);
  if(prop === "inputFiles" || prop === "outputFiles"){
    logger.debug("updateNode does not support",prop,". please use renameInputFile or renameOutputFile");
    cb(false);
    return;
  }
  if(prop === "path"){
    logger.error("path property is deprecated. please use 'name' instead.");
    cb(false);
    return;
  }

  const update = (json)=>{
    json[prop] = value;
  }

  try{
    const nodeDir = await getComponentDir(projectRootDir, ID);
    if(prop === "name"){
      if(nodeDir === projectRootDir || !isValidName(value)){
        logger.debug("updateNode can not rename root workflow")
        cb(false);
        return;
      }
      const newDir = path.resolve(path.dirname(nodeDir), value);
      await fs.move(nodeDir, newDir);
      await updateComponentJson(projectRootDir, path.resolve(newDir, componentJsonFilename), update);
      await updateComponentPath(projectRootDir, changeComponentPath.bind(null, ID, newDir));
    }else{
      await updateComponentJson(projectRootDir, path.resolve(nodeDir, componentJsonFilename), update);
    }
    await sendWorkflow(emit, projectRootDir);
  }catch(e){
    e.projectRootDir= projectRootDir;
    e.ID = ID;
    e.prop = prop;
    e.value = value;
    logger.error("update node failed",e);
    cb(false);
    return;
  }
  cb(true);
}

function onAddValueToArrayProperty(emit, projectRootDir, ID, property, value, cb){
          // await addValue(projectRootDir, targetNode, property, value);
}
function onDelValueFromArrayProperty(emit, projectRootDir, ID, property, value, cb){
            // await delValue(projectRootDir, targetNode, property, value);
}

// remove filelinkとremoveLinkに分ける
async function removeAllLink(projectRootDir, targetID){
  const counterparts = new Map();
  const component = await getComponent(projectRootDir, targetID);

  for(const previousComponent of component.previous){
    const counterpart = counterparts.get(previousComponent) || await getComponent(projectRootDir, previousComponent);
    counterpart.next = counterpart.next.filter((e)=>{
      return e !== component.ID;
    });
    if(counterpart.else){
      counterpart.else = counterpart.else.filter((e)=>{
        return e !== component.ID;
      });
    }
    counterparts.set(counterpart.ID, counterpart);
  }
  for(const nextComponent of component.next){
    const counterpart = counterparts.get(nextComponent) || await getComponent(projectRootDir, nextComponent);
    counterpart.previous= counterpart.previous.filter((e)=>{
      return e !== component.ID;
    });
    counterparts.set(counterpart.ID, counterpart);
  }
  if(component.else){
    for(const elseComponent of component.else){
      const counterpart = counterparts.get(elseComponent) || await getComponent(projectRootDir, elseComponent);
      counterpart.previous= counterpart.previous.filter((e)=>{
        return e !== component.ID;
      });
      counterparts.set(counterpart.ID, counterpart);
    }
  }
  for(const inputFile of component.inputFiles){
    for (const src of inputFile.src){
      const srcComponent = src.srcNode;
      const counterpart = counterparts.get(srcComponent) || await getComponent(projectRootDir, srcComponent);
      for (const outputFile of counterpart.outputFiles){
        outputFile.dst = outputFile.dst.filter((e)=>{
          return e.dstNode !== component.ID;
        });
      }
      counterparts.set(counterpart.ID, counterpart);
    }
  }
  for(const outputFile of component.outputFiles){
    for (const dst of outputFile.dst){
      const dstComponent = dst.dstNode;
      const counterpart = counterparts.get(dstComponent) || await getComponent(projectRootDir, dstComponent);
      for (const inputFile of counterpart.inputFiles){
        inputFile.src = inputFile.src.filter((e)=>{
          return e.srcNode !== component.ID;
        });
      }
      counterparts.set(counterpart.ID, counterpart);
    }
  }

  return Promise.all(Array.from(counterparts, ([key, component])=>{
    return updateComponentJson(projectRootDir, component)
  }));
}

async function onRemoveNode(emit, projectRootDir, targetID, cb){
  if(typeof cb !== "function") cb = ()=>{};
  logger.debug('removeNode event recieved:', projectRootDir, targetID);
  try{
    const nodeDir = await getComponentDir(projectRootDir, targetID);
    const component = await fs.readJson(path.resolve(nodeDir, componentJsonFilename));

    const descendantsID = await getDescendantsID(projectRootDir, targetID);

    // remove all link/filelink to or from components to be removed
    for(const descendantID of descendantsID){
      await removeAllLink(projectRootDir, descendantID);
    }

    //remove all descendants and target component itself from componentPath
    await updateComponentPath(projectRootDir, async (projectRootDir, componentPath)=>{
      for(const descendantID of descendantsID){
        delete componentPath[descendantID];
      }
    });

    //get all files to be removed
    const removeFiles = [];
    const asyncWalk = (root)=>{
      return new Promise((resolve, reject)=>{
        klaw(root)
          .on('data', (item)=>{
            removeFiles.push(item.path);
          })
          .on('end', ()=>{
            resolve();
          });
      });
    }
    await asyncWalk(nodeDir);

    //remove files
    await fs.remove(nodeDir);

    //git rm
    await Promise.all(removeFiles.map(async (e)=>{
        await gitAdd(projectRootDir, e, true);
    }));

    await sendWorkflow(emit, projectRootDir);
  }catch(e){
    logger.error('remove node failed:', e);
    cb(false);
  }
  cb(true);
}

async function onAddInputFile(emit, projectRootDir, ID, name, cb){
  if(typeof cb !== "function") cb = ()=>{};
  logger.debug('addInputFile event recieved:', projectRootDir, ID, name);
  try{
    await updateComponentJson(projectRootDir, ID, (componentJson)=>{
      componentJson.inputFiles.push({name: name, src:[]});
    });
  }catch(e){
    logger.error("addInputFail failed", e);
    cb(false)
    return;
  }
  cb(true);
}
async function onAddOutputFile(emit, projectRootDir, ID, name, cb){
  return updateComponentJson(projectRootDir, ID, (componentJson)=>{
    componentJson.outputFiles.push({name: name, dst:[]});
  });
}
async function onRemoveInputFile(emit, projectRootDir, ID, name, cb){
  return updateComponentJson(projectRootDir, ID, (componentJson)=>{
    componentJson.inputFiles = componentJson.inputFiles.filter((inputFile)=>{
      return name !== inputFile.name;
    });
  });
}
async function onRemoveOutputFile(emit, projectRootDir, ID, name, cb){
  return updateComponentJson(projectRootDir, ID, (componentJson)=>{
    componentJson.outputFiles = componentJson.outputFiles.filter((outputFile)=>{
      return name !== outputFile.name;
    });
  });
}
async function onRenameInputFile(emit, projectRootDir, ID, oldName, newName, cb){
  const counterparts = new Map();
  await updateComponentJson(projectRootDir, ID, (componentJson)=>{
    componentJson.inputFiles = componentJson.inputFiles.map((inputFile)=>{
      if(inputFile.name === oldName){
        inputFile.name = newName;
        inputFile.src.forEach((e)=>{
          counterparts.set(e.srcNode, e.srcName);
        });
      }
      return inputFiles;
    });
  });
  return Promise.all(Array.from(counterparts, ([key, component])=>{
    return updateComponentJson(projectRootDir, key, (componentJson)=>{
      for(const outputFile of componentJson.outputFiles){
        for(const e of outputFile.dst){
          if(dst.dstName === oldName) dst.dstName = newName;
        }
      }
    });
  }));
}
async function onRenameOutputFile(emit, projectRootDir, ID, oldName, newName, cb){
  const counterparts = new Map();
  await updateComponentJson(projectRootDir, ID, (componentJson)=>{
    componentJson.outputFiles = componentJson.outputFiles.map((outputFile)=>{
      if(outputFile.name === oldName){
        outputFile.name = newName;
        outputFile.dst.forEach((e)=>{
          counterparts.set(e.dstNode, e.dstName);
        });
      }
      return inputFiles;
    });
  });
  return Promise.all(Array.from(counterparts, ([key, component])=>{
    return updateComponentJson(projectRootDir, key, (componentJson)=>{
      for(const inputFile of componentJson.inputFiles){
        for(const e of inputFile.dst){
          if(src.srcName === oldName) src.srcName = newName;
        }
      }
    });
  }));
}

async function onAddLink(emit, projectRootDir, msg, cb){
  logger.debug('addLink event recieved: ', msg);
  addLink(projectRootDir, msg.src, msg.dst, msg.isElse);
  try{
    await write(projectRootDir)
    await sendWorkflow(emit, projectRootDir);
  }catch(err){
    logger.error('add link failed: ', err);
  }
}
function onRemoveLink(emit, projectRootDir, msg, cb){
  logger.debug('removeLink event recieved:', msg);
  removeLink(projectRootDir, msg.src, msg.dst, msg.isElse);

  write(projectRootDir)
    .then(()=>{
      sendWorkflow(emit, projectRootDir);
    })
    .catch((err)=>{
      logger.error('remove link failed: ', err);
    });
}

async function onAddFileLink(emit, projectRootDir, msg, cb){
  logger.debug('addFileLink event recieved: ', msg);
  addFileLink(projectRootDir, msg.src, msg.dst, msg.srcName, msg.dstName);
  try{
    await write(projectRootDir);
      sendWorkflow(emit, projectRootDir);
  }catch(err){
    logger.error('add filelink failed:', err);
  }
}

async function onRemoveFileLink(emit, projectRootDir, msg, cb){
  logger.debug('removeFileLink event recieved:', msg);
  removeFileLink(projectRootDir, msg.src, msg.dst, msg.srcName, msg.dstName);
  try{
    await write(projectRootDir);
      sendWorkflow(emit, projectRootDir);
  }catch(err){
    logger.error('remove file link failed:', err);
  }
}

function registerListeners(socket, projectRootDir){
  const emit = socket.emit.bind(socket);
  socket.on('getWorkflow',               onWorkflowRequest.bind(null, emit, projectRootDir));
  socket.on('createNode',                onCreateNode.bind(null, emit, projectRootDir));
  socket.on('updateNode',                onUpdateNode.bind(null, emit, projectRootDir));
  socket.on('addValueToArrayProperty',   onAddValueToArrayProperty.bind(null,   emit, projectRootDir));
  socket.on('delValueFromArrayProperty', onDelValueFromArrayProperty.bind(null, emit, projectRootDir));
  socket.on('removeNode',                onRemoveNode.bind(null, emit, projectRootDir));
  socket.on('addInputFile',              onAddInputFile.bind(null, emit, projectRootDir));
  socket.on('addOutputFile',             onAddOutputFile.bind(null, emit, projectRootDir));
  socket.on('removeInputFile',           onRemoveInputFile.bind(null, emit, projectRootDir));
  socket.on('removeOutputFile',          onRemoveOutputFile.bind(null, emit, projectRootDir));
  socket.on('renameInputFile',           onRenameInputFile.bind(null, emit, projectRootDir));
  socket.on('renameOutputFile',          onRenameOutputFile.bind(null, emit, projectRootDir));
  socket.on('addLink',                   onAddLink.bind(null, emit, projectRootDir));
  socket.on('removeLink',                onRemoveLink.bind(null, emit, projectRootDir));
  socket.on('addFileLink',               onAddFileLink.bind(null, emit, projectRootDir));
  socket.on('removeFileLink',            onRemoveFileLink.bind(null, emit, projectRootDir));
}

module.exports = registerListeners;
