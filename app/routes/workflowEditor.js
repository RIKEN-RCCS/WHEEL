const path = require('path');
const fs = require("fs-extra");
const {promisify} = require("util");
const {move} = require('fs-extra');
const glob = require('glob');

const {getLogger} = require('../logSettings');
const logger = getLogger('workflow');
const component = require('./workflowComponent');
const {isValidName, isValidInputFilename, isValidOutputFilename, replacePathsep} = require('./utility');
const {gitAdd, getCwf, getNode, pushNode, getCurrentDir, getRootDir} = require('./project');

function isInitialNode(node){
  if(node === null) return false;
  if(node.previous.length > 0) return false;
  if(node.inputFiles.length >0 ){
    const hasConnectedInputFile =  node.inputFiles.some((e)=>{
      return e.srcNode !== null;
    });
    return !hasConnectedInputFile
  }
  return true;
}

function hasChild(node){
  return node.type === 'workflow' || node.type === 'parameterStudy' || node.type === 'for' || node.type === 'while' || node.type === 'foreach';
}

function _hasName(name, e){
  return e.name === name;
}

/**
 * add new inputFile entry
 * @param inputFiles - inputFile array which will be modified
 * @param name       - target entry's name
 */
function _addInputFile(inputFiles, name, srcNode, srcName){
  const inputFile = inputFiles.find(_hasName.bind(null, name));
  if(! inputFile){
    logger.warn(name, 'not found in inputFiles');
    return [null, null];
  }
  const oldSrcNode = inputFile.srcNode;
  const oldSrcName = inputFile.srcName;
  if(oldSrcNode === srcNode && oldSrcName === srcName){
    return [null, null];
  }
  const rt = [oldSrcNode,oldSrcName];
  inputFile.srcNode = srcNode;
  inputFile.srcName = srcName;
  return rt;
}

/**
 * remove specified inputFile entry
 * @param inputFiles - inputFile array which will be modified
 * @param name       - target entry's name
 */
function _clearInputFile(inputFiles, name){
  const inputFile = inputFiles.find(_hasName.bind(null, name));
  if(! inputFile){
    logger.warn(name, 'not found in inputFiles');
    return null;
  }
  inputFile.srcNode = null;
  inputFile.srcName = null;
}

/**
 * add new outputFile entry
 * @param outputFiles - outputFile array which will be modified
 * @param name        - target entry's name
 * @param dstNode     - target entry's destination node
 * @param dstName     - target entry's filename on dst node
 */
function _addOutputFile(outputFiles, name, dstNode, dstName){
  const outputFile = outputFiles.find(_hasName.bind(null, name));
  if(! outputFile){
    logger.warn(name, 'not found in outputFiles');
    return
  }
  const index = outputFile.dst.findIndex((e)=>{
    return e.dstNode === dstNode && e.dstName === dstName;
  });
  if(index !== -1) return;

  const newEntry={"dstNode": dstNode, "dstName": dstName};
  outputFile.dst.push(newEntry);
}

/**
 * remove specified outputFile entry
 * @param outputFiles - outputFile array which will be modified
 * @param name        - target entry's name
 * @param dstNode     - target entry's destination node
 * @param dstName     - target entry's filename on dst node
 */
function _clearOutputFile(outputFiles, name, dstNode, dstName){
  const outputFile = outputFiles.find(_hasName.bind(null, name));
  if(! outputFile){
    logger.warn(name, 'not found in outputFiles');
    return null;
  }
  outputFile.dst=outputFile.dst.filter((e)=>{
    return e.dstNode !== dstNode && e.dstName !== dstName;
  });
}

/**
 * sofisticated version of getNode
 */
function _getFileLinkTargetNode(wf, index){
  if(index === 'parent'){
    return wf;
  }else if(Number.isInteger(index)){
    return wf.nodes[parseInt(index)];
  }else{
    logger.warn('illegal index specified');
    return null
  }
}

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

function _getChildWorkflowFilename(label, node){
  return  path.resolve(getCurrentDir(label), node.path, node.jsonFile);
}

async function _writeChildWorkflow(label, node, wf){
  const childWorkflowFilename = _getChildWorkflowFilename(label, node);
    await promisify(fs.writeFile)(childWorkflowFilename, JSON.stringify(wf, null, 4));
    return gitAdd(label, childWorkflowFilename);
}

async function readChildWorkflow(label, node){
  return fs.readJson(_getChildWorkflowFilename(label, node));
}

async function createNode(label, request){
  const parentRelativePath = replacePathsep(path.relative(getRootDir(label),getCurrentDir(label)));
  const node=component.factory(request.type, request.pos, parentRelativePath);

  const dirName=path.resolve(getCurrentDir(label),request.type);
  const actualDirname = await _makeDir(dirName, 0)
  node.name=path.basename(actualDirname);
  node.path=node.name;
  node.index=pushNode(label, node);
  let filename = hasChild(node) ? node.jsonFile : '.gitkeep';
  filename = path.resolve(getCurrentDir(label), node.path, filename);
  const data = hasChild(node)? JSON.stringify(node,null,4) : '';
  await promisify(fs.writeFile)(filename, data);
  await gitAdd(label, filename);
  return node.index
}

function removeNode(label, index){
  const cwf = getCwf(label);
  cwf.nodes[index]=null;
}

/**
 * add link between nodes
 * @param label - identifier of currently opend project
 * @param srcIndex {Number} - index number of src node
 * @param dstIndex {Number} - index number of dst node
 * @param isElse {Boolean} - flag to remove 'else' link
 */
function addLink (label, srcIndex, dstIndex, isElse=false){
  if(srcIndex === dstIndex){
    logger.error("loop link is not allowed");
    return;
  }
  const srcNode=getNode(label, srcIndex);
  if(srcNode === null){
    logger.warn("srcNode does not exist");
    return;
  }
  let dstNode=getNode(label, dstIndex);
  if(dstNode === null){
    logger.warn("dstNode does not exist");
    return;
  }

  if(isElse){
    srcNode.else.push(dstIndex);
  }else{
    srcNode.next.push(dstIndex);
  }
  dstNode.previous.push(srcIndex);
}

/**
 * remove link between nodes
 * @param label - identifier of currently opend project
 * @param srcIndex {Number} - index number of src node
 * @param dstIndex {Number} - index number of dst node
 * @param isElse {Boolean} - flag to remove 'else' link
 */
function removeLink(label, srcIndex, dstIndex, isElse=false){
  const srcNode=getNode(label, srcIndex);
  if(srcNode === null){
    logger.warn("srcNode does not exist");
    return;
  }
  let dstNode=getNode(label, dstIndex);
  if(dstNode === null){
    logger.warn("dstNode does not exist");
    return;
  }

  if(isElse && Array.isArray(srcNode.else)){
    srcNode.else=srcNode.else.filter((e)=>{
      return e!==dstIndex;
    });
  }else{
    srcNode.next=srcNode.next.filter((e)=>{
      return e!==dstIndex;
    });
  }
  dstNode.previous=dstNode.previous.filter((e)=>{
    return e!==srcIndex;
  });
}

/**
 * remove all link on the node
 * @param label - identifier of currently opend project
 * @param index - target node's index
 */
function removeAllLink(label, index){
  const target=getNode(label, index);
  target.previous.forEach((p)=>{
    removeLink(label, p, index, false);
    removeLink(label, p, index, true);
  });
  target.next.forEach((n)=>{
    removeLink(label, index, n, false);
  });
  if(target.else){
    target.else.forEach((n)=>{
      removeLink(label, index, n, true);
    });
  }
}

/**
 * add file link
 * @param label - identifier of currently opend project
 * @param srcIndex {Number|string} - index number of src node or "parent"
 * @param dstIndex {Number|string} - index number of dst node or "parent"
 * @param srcName {string} - file/directory/glob patturn on src node
 * @param dstName {string} - file/directory/glob patturn on dst node
 */
function addFileLink(label, srcIndex, dstIndex, srcName, dstName){
  if(srcIndex === dstIndex){
    logger.error("loop file link is not allowed");
    return;
  }
  const srcNode = _getFileLinkTargetNode(getCwf(label), srcIndex);
  if(srcNode === null){
    logger.warn("srcNode does not exist");
    return;
  }
  const dstNode = _getFileLinkTargetNode(getCwf(label), dstIndex);
  if(dstNode === null){
    logger.warn("dstNode does not exist");
    return;
  }

  _addOutputFile(srcNode.outputFiles, srcName, dstIndex, dstName);
  const [oldSrc, oldSrcName]= _addInputFile(dstNode.inputFiles, dstName, srcIndex, srcName);
  if(oldSrc!== null){
    const oldSrcNode = _getFileLinkTargetNode(getCwf(label), oldSrc);
    _clearOutputFile(oldSrcNode.outputFiles, oldSrcName, dstIndex, dstName);
  }
}

/**
 * remove file link
 */
function removeFileLink(label, srcIndex, dstIndex, srcName, dstName){
  const srcNode = _getFileLinkTargetNode(getCwf(label), srcIndex);
  if(srcNode === null){
    logger.warn("srcNode does not exist");
    return;
  }
  const dstNode = _getFileLinkTargetNode(getCwf(label), dstIndex);
  if(dstNode === null){
    logger.warn("dstNode does not exist");
    return;
  }

  _clearOutputFile(srcNode.outputFiles, srcName, dstIndex, dstName);
  _clearInputFile(dstNode.inputFiles, dstName);
}


/**
 * remove all file link on the node
 * @param label - identifier of currently opend project
 * @param index - target node's index
 */
function removeAllFileLink(label, index){
  const target=getNode(label, index);
  target.inputFiles.forEach((inputFile)=>{
    const srcNode=_getFileLinkTargetNode(getCwf(label), inputFile.srcNode);
    if(srcNode){
      _clearOutputFile(srcNode.outputFiles, inputFile.srcName, index, inputFile.name);
    }
  });
  target.outputFiles.forEach((outputFile)=>{
    outputFile.dst.forEach((e)=>{
      const dstNode = _getFileLinkTargetNode(getCwf(label), e.dstNode);
      if(dstNode){
        _clearInputFile(dstNode.inputFiles, e.dstName);
      }
    });
  });
}

async function addValue(label, node, property, value){
  if(property === "inputFiles"){
    if(! isValidInputFilename(value.name)){
      //eslint-disable-next-line no-useless-escape
      logger.error('only alpha numeric and _ - / \ is allowed for inputFile name');
      return;
    }
  } else  if(property === "outputFiles"){
    if(! isValidOutputFilename(value.name)){
      //eslint-disable-next-line no-useless-escape
      logger.error('only alpha numeric and _ - / \ ?!@*()[]{} is allowed for outputFile name');
      return;
    }
  }

  node[property].push(value);
  if(hasChild(node)){
    const childWorkflow = await readChildWorkflow(label, node);
    let target = property;
    if(property === "inputFiles"){
      target = "outputFiles";
      value={name: value.name, dst:[]};
    }else if(property === "outputFiles"){
      target = "inputFiles";
      value={name: value.name, srcNode: null, srcName: null};
    }
    childWorkflow[target].push(value);
    return _writeChildWorkflow(label, node, childWorkflow);
  }
}

async function updateValue(label, node, property, value){
  node[property]=value;
  if(hasChild(node)){
    const childWorkflow = await readChildWorkflow(label, node);
    childWorkflow[property] = value;
    return _writeChildWorkflow(label, node, childWorkflow);
  }
}

async function updateInputFiles(label, node, value){
  node.inputFiles.forEach((e,i)=>{
    const newName = value[i].name;
    const oldName = e.name;
    if(oldName === newName) return;
    e.name=newName;
    const srcNode = _getFileLinkTargetNode(getCwf(label), e.srcNode);
    if(! srcNode) return;
    _clearOutputFile(srcNode.outputFiles, e.srcName, node.index, oldName);
    _addOutputFile(srcNode.outputFiles, e.srcName, node.index, newName);
  });
  if(hasChild(node)){
    const childWorkflow = await readChildWorkflow(label, node);
    childWorkflow.outputFiles.forEach((e,i)=>{
      const newName = value[i].name;
      const oldName = e.name;
      if(oldName === newName) return;
      e.name=newName;
      e.dst.forEach((dstEntry)=>{
        const dstNode = childWorkflow.nodes[dstEntry.dstNode];
        if(! dstNode) return;
        _clearInputFile(dstNode.inputFiles, dstEntry.dstName);
        _addInputFile(dstNode.inputFiles, dstEntry.dstName, "parent", newName)
      });
    });
    return _writeChildWorkflow(label, node, childWorkflow);
  }
}

async function updateOutputFiles(label, node, value){
  node.outputFiles.forEach((outputFile,i)=>{
    const newName = value[i].name;
    const oldName = outputFile.name;
    if(oldName === newName) return;
    outputFile.name=newName;
    outputFile.dst.forEach((dst)=>{
      const dstNode = _getFileLinkTargetNode(getCwf(label), dst.dstNode);
      if(! dstNode) return;
      _clearInputFile(dstNode.inputFiles, dst.dstName);
      _addInputFile(dstNode.inputFiles, dst.dstName, node.index, newName);
    });
  });
  if(hasChild(node)){
    const childWorkflow = await readChildWorkflow(label, node);
    childWorkflow.inputFiles.forEach((inputFile, i)=>{
      if(value[i] == null || inputFile == null) return;
      const newName = value[i].name;
      const oldName = inputFile.name;
      if(oldName === newName) return;
      inputFile.name = newName;
      const srcNode = _getFileLinkTargetNode(childWorkflow, inputFile.srcNode);
      if(! srcNode) return;
      _clearOutputFile(srcNode.outputFiles, inputFile.srcName, "parent", oldName);
      _addOutputFile(srcNode.outputFiles,  inputFile.srcName, "parent", newName);
    });
    return _writeChildWorkflow(label, node, childWorkflow);
  }
}

async function updateName(label, node, value){
  if(!value || ! isValidName(value)){
    logger.error('invalid component name', value);
    return
  }
  const currentDir = getCurrentDir(label);
  const oldName = path.resolve(currentDir, node.name);
  let newName = path.resolve(currentDir,value);
  try{
    await promisify(fs.mkdir)(newName);
  }catch(e){
    newName = await _makeDir(newName, 0);
  }
  logger.debug('rename', oldName,' to', newName);

  const oldFiles = await promisify(glob)(`${oldName}/**`, {dot: true});
  let pOldFiles  = oldFiles.map((oldFile)=>{
    return promisify(fs.stat)(oldFile)
      .then((stats)=>{
        if(stats.isFile()){
          gitAdd(label, oldFile, true);
        }
      })
    .catch((e)=>{
      logger.warn('git rm',oldFile,' failed',e);
    });
  });
  pOldFiles = pOldFiles.reduce((m,p)=>m.then(p), Promise.resolve());

  await pOldFiles;
  await move(oldName, newName, {overwrite: true});

  const newFiles = await promisify(glob)(`${newName}/**`, {dot: true});
  let pNewFiles = newFiles.map((newFile)=>{
    return promisify(fs.stat)(newFile)
    .then((stats)=>{
      if(stats.isFile()){
        gitAdd(label, newFile);
      }
    })
    .catch((e)=>{
      logger.warn('git add',newFile,' failed',e);
    });
  });
  pNewFiles = pNewFiles.reduce((m,p)=>m.then(p), Promise.resolve());
  await pNewFiles;
  node.name = path.basename(newName);
  node.path = node.name;
  if(hasChild(node)){
    const childWorkflow = await readChildWorkflow(label, node);
    childWorkflow.name = node.name;
    childWorkflow.path = node.path;
    return _writeChildWorkflow(label, node, childWorkflow);
  }
}

async function delValue(label, node, property, value){
  let index = node[property].findIndex((e)=>{
    return e === value;
  })
  node[property][index]=null;
  if(hasChild(node)){
    const childWorkflow = await readChildWorkflow(label, node);
    let target = property
    childWorkflow[target][index]=null;
    return _writeChildWorkflow(label, node, childWorkflow);
  }
}

async function delInputFiles(label, node, value){
  const targetIndex = node.inputFiles.findIndex((e)=>{
    return e.name === value.name;
  });
  if(targetIndex === -1) return;
  const srcNode = _getFileLinkTargetNode(getCwf(label), node.inputFiles[targetIndex].srcNode);
  if(srcNode){
    _clearOutputFile(srcNode.outputFiles, node.inputFiles[targetIndex].srcName, node.index, value.name);
  }
  node.inputFiles.splice(targetIndex, 1);
  if(hasChild(node)){
    const childWorkflow = await readChildWorkflow(label, node);
    const targetIndex2 = childWorkflow.outputFiles.findIndex((e)=>{
      return e.name === value.name;
    });
    if(targetIndex2 === -1) return;
    childWorkflow.outputFiles[targetIndex2].dst.forEach((e)=>{
      const dstNode = _getFileLinkTargetNode(childWorkflow, e.dstNode);
      _clearInputFile(dstNode.inputFiles, e.dstName);
    });
    childWorkflow.outputFiles.splice(targetIndex2, 1);
    return _writeChildWorkflow(label, node, childWorkflow);
  }
}

async function delOutputFiles(label, node, value){
  const targetIndex = node.outputFiles.findIndex((e)=>{
    return e.name === value.name;
  });
  if(targetIndex === -1) return;
  node.outputFiles[targetIndex].dst.forEach((e)=>{
    const dstNode = _getFileLinkTargetNode(getCwf(label), e.dstNode);
    _clearInputFile(dstNode.inputFiles, e.dstName);
  });
  node.outputFiles.splice(targetIndex, 1);
  if(hasChild(node)){
    const childWorkflow = await readChildWorkflow(label, node);
    const targetIndex2 = childWorkflow.inputFiles.findIndex((e)=>{
      return e.name === value.name;
    });
    if(targetIndex2 === -1) return;
    const srcNode = _getFileLinkTargetNode(childWorkflow, childWorkflow.inputFiles[targetIndex2].srcNode);
    _clearOutputFile(srcNode.outputFiles, childWorkflow.inputFiles[targetIndex2].srcName, "parent", value.name);
    childWorkflow.inputFiles.splice(targetIndex2, 1);
    return _writeChildWorkflow(label, node, childWorkflow);
  }
}


module.exports.isInitialNode = isInitialNode;
module.exports.hasChild= hasChild;
module.exports.readChildWorkflow = readChildWorkflow;

module.exports.createNode = createNode;
module.exports.removeNode = removeNode;
module.exports.addLink = addLink;
module.exports.removeLink = removeLink;
module.exports.removeAllLink = removeAllLink;
module.exports.addFileLink = addFileLink;
module.exports.removeFileLink = removeFileLink;
module.exports.removeAllFileLink = removeAllFileLink;
module.exports.addValue=addValue;
module.exports.updateValue = updateValue;
module.exports.updateInputFiles = updateInputFiles;
module.exports.updateOutputFiles = updateOutputFiles;
module.exports.updateName = updateName;
module.exports.delValue = delValue;
module.exports.delInputFiles = delInputFiles;
module.exports.delOutputFiles = delOutputFiles;
