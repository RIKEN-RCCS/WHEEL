const path = require("path");
const os = require("os");

const fs = require("fs-extra");
const siofu = require("socketio-file-upload");
const minimatch = require("minimatch");

const { getLogger } = require('../logSettings');
const logger = getLogger('workflow');
const fileBrowser = require("./fileBrowser");
const { gitAdd } = require('./project');
const { getSystemFiles } = require('./utility');

async function sendDirectoryContents(emit, target, request, withSND=true, withDir=true, allFilter=/.*/){
  request = request || target;
  const result = await fileBrowser(target, {
    "request": request,
    "SND": withSND,
    "sendDirname": withDir,
    "filter": {
      all: allFilter,
      file:getSystemFiles()
    }
  });
  emit("fileList", result);
}

async function onGetFileList(uploaderDir, emit, requestDir, cb){
  logger.debug(`current dir = ${requestDir}`);
  if(typeof cb !== "function") cb = ()=>{};
  try{
    const stats = await fs.stat(requestDir);
    const targetDir = stats.isDirectory() ? requestDir : path.dirname(requestDir) ;
    if(targetDir !== requestDir) logger.debug('requested directory is not directory, show parent of reqested:', targetDir);
    await sendDirectoryContents(emit, targetDir, requestDir);
    uploaderDir = targetDir;
  }catch(e){
    logger.error(requestDir,"read failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onGetSNDContents(emit, requestDir, glob, cb){
  logger.debug(`getSNDContents event recieved: ${requestDir}/${glob}`);
  if(typeof cb !== "function") cb = ()=>{};
  try{
    await sendDirectoryContents(emit, requestDir, requestDir, false, false, minimatch.makeRe(glob));
  }catch(e){
    logger.error(requestDir,"read failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onRemoveFile(emit, label, target, cb){
  logger.debug(`removeFile event recieved: ${target}`);
  if(typeof cb !== "function") cb = ()=>{};
  try{
    await fs.remove(target, { force: true });
    await gitAdd(label, target, true);
  }catch(err){
    logger.warn(`removeFile failed: ${err}`);
    cb(false);
    return;
  }
  try{
    const  parentDir = path.dirname(target);
    await sendDirectoryContents(emit, parentDir);
  }catch(e){
    logger.error("re-read directory failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onRenameFile(emit, label, msg, cb){
  logger.debug(`renameFile event recieved: ${msg}`);
  if(typeof cb !== "function") cb = ()=>{};
  if (!(msg.hasOwnProperty('oldName') && msg.hasOwnProperty('newName') && msg.hasOwnProperty('path'))) {
    logger.warn(`illegal request ${msg}`);
    cb(false);
    return;
  }

  const  oldName = path.resolve(msg.path, msg.oldName);
  const  newName = path.resolve(msg.path, msg.newName);
  try{
    await fs.rename(oldName, newName);
  }catch(e){
    e.path = msg.path;
    e.oldName = msg.oldName;
    e.newName = msg.newName;
    logger.error('renameFile failed: ',e);
    cb(false);
    return;
  }

  try{
    await gitAdd(label, oldName, true);
    await gitAdd(label, newName, false);
  }catch(e){
    logger.error('rename succeeded but git add failed', e);
    cb(false);
    return;
  }

  try{
    await sendDirectoryContents(emit, msg.path);
  }catch(e){
    logger.error("re-read directory failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onDownloadFile(emit, msg, cb){
  logger.debug('downloadFile event recieved: ', msg);
  if(typeof cb !== "function") cb = ()=>{};
  const filename = path.resolve(msg.path, msg.name);
  try{
    const file = await fs.readFile(filename);
    emit('downloadData', file);
  }catch(e){
    if(e.code === "EISDIR"){
      logger.error("download directory is not supported for now");
    }else{
      logger.error('file download failed', e);
    }
    cb(false);
    return;
  }
  cb(true);
}

async function onCreateNewFile(emit, label, filename, cb){
  logger.debug('createNewFile event recieved: ', filename);
  if(typeof cb !== "function") cb = ()=>{};
  try{
    await fs.writeFile(filename, '')
    await gitAdd(label, filename);
    await sendDirectoryContents(emit, msg.path);
  }catch(e){
    logger.error('create new file failed', e);
    cb(false);
  }
  cb(true);
}
async function onCreateNewDir(emit, label, dirname, cb){
  logger.debug('createNewDir event recieved: ', dirname);
  if(typeof cb !== "function") cb = ()=>{};
  try{
    await fs.mkdir(dirname)
    await fs.writeFile(path.resolve(dirname,'.gitkeep'), '')
    await gitAdd(label, path.resolve(dirname,'.gitkeep'));
    await sendDirectoryContents(emit, msg.path);
  }catch(e){
    logger.error('create new directory failed', e);
    cb(false);
  }
  cb(true);
}

function registerListeners(socket, label){
  const uploader = new siofu();
  uploader.listen(socket);
  uploader.dir = os.homedir();
  uploader.on("saved", async(event)=>{
    logger.info(`upload completed ${event.file.pathName} [${event.file.size} Byte]`);
    await gitAdd(label, event.file.pathName);
    const result = await fileBrowser(socket, 'fileList', uploader.dir, {"filter": {file: getSystemFiles()}});
    socket.emit("fileList", result);
  });
  uploader.on("error", (event)=>{
    logger.error("file upload failed", event);
  });
  socket.on('getFileList',    onGetFileList.bind(null, uploader.dir, socket.emit.bind(socket)));
  socket.on('getSNDContents', onGetSNDContents.bind(null, socket.emit.bind(socket)));
  socket.on('removeFile',     onRemoveFile.bind(null, socket.emit.bind(socket), label));
  socket.on('renameFile',     onRenameFile.bind(null, socket.emit.bind(socket), label));
  socket.on('downloadFile',   onDownloadFile.bind(null, socket.emit.bind(socket)));
  socket.on('createNewFile',  onCreateNewFile.bind(null, socket.emit.bind(socket), label));
  socket.on('createNewDir',   onCreateNewDir.bind(null, socket.emit.bind(socket), label));
}

module.exports = registerListeners;
