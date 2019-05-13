"use strict";
const path = require("path");
const os = require("os");
const fs = require("fs-extra");
const Siofu = require("socketio-file-upload");
const minimatch = require("minimatch");
const fileBrowser = require("../core/fileBrowser");
const { gitAdd, gitRm } = require("../core/gitOperator");
const { getSystemFiles } = require("./utility");
const { convertPathSep } = require("../core/pathUtils");
const { getLogger } = require("../core/projectResource");
const { isComponentDir } = require("../core/componentFilesOperator");

/**
 * return component dir names under target directory
 * @param {string} target
 * @returns {string[]} - array of component dir names
 */
async function getComponentDirs(target) {
  const contents = await fs.readdir(target);
  const flags = await Promise.all(contents.map((e)=>{
    return isComponentDir(path.resolve(target, e));
  }));
  return contents.filter((e, i)=>{
    return flags[i];
  });
}

async function sendDirectoryContents(emit, target, request, withSND = true, sendDir = true, sendFile = true, allFilter = /.*/) {
  request = request || target;
  const componentDirs = await getComponentDirs(request);
  console.log("DEBUG:", componentDirs);
  const regexComponentDirs = new RegExp(`(${componentDirs.join("|")})`);
  const result = await fileBrowser(target, {
    request,
    SND: withSND,
    sendDirname: sendDir,
    sendFilename: sendFile,
    filter: {
      all: allFilter,
      file: getSystemFiles(),
      dir: regexComponentDirs
    }
  });
  emit("fileList", result);
}

async function onGetFileList(uploader, emit, projectRootDir, requestDir, cb) {
  requestDir = convertPathSep(requestDir);
  getLogger(projectRootDir).debug(`current dir = ${requestDir}`);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }

  try {
    const stats = await fs.stat(requestDir);
    const targetDir = stats.isDirectory() ? requestDir : path.dirname(requestDir);

    if (targetDir !== requestDir) {
      getLogger(projectRootDir).debug("requested directory is not directory, show parent of reqested:", targetDir);
    }
    await sendDirectoryContents(emit, targetDir, requestDir);
    uploader.dir = targetDir;
  } catch (e) {
    getLogger(projectRootDir).error(requestDir, "read failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onGetSNDContents(emit, projectRootDir, requestDir, glob, isDir, cb) {
  requestDir = convertPathSep(requestDir);
  getLogger(projectRootDir).debug("getSNDContents event recieved:", requestDir, glob, isDir);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  const sendDir = isDir;
  const sendFile = !isDir;

  try {
    await sendDirectoryContents(emit, requestDir, requestDir, false, sendDir, sendFile, minimatch.makeRe(glob));
  } catch (e) {
    getLogger(projectRootDir).error(requestDir, "read failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onRemoveFile(emit, projectRootDir, target, cb) {
  getLogger(projectRootDir).debug(`removeFile event recieved: ${target}`);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }

  try {
    await gitRm(projectRootDir, target);
    await fs.remove(target, { force: true });
  } catch (err) {
    getLogger(projectRootDir).warn(`removeFile failed: ${err}`);
    cb(false);
    return;
  }

  try {
    const parentDir = path.dirname(target);
    await sendDirectoryContents(emit, parentDir);
  } catch (e) {
    getLogger(projectRootDir).error("re-read directory failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onRenameFile(emit, projectRootDir, msg, cb) {
  getLogger(projectRootDir).debug(`renameFile event recieved: ${msg}`);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }

  if (!(msg.hasOwnProperty("oldName") && msg.hasOwnProperty("newName") && msg.hasOwnProperty("path"))) {
    getLogger(projectRootDir).warn(`illegal request ${msg}`);
    cb(false);
    return;
  }

  const oldName = path.resolve(msg.path, msg.oldName);
  const newName = path.resolve(msg.path, msg.newName);

  if (oldName === newName) {
    getLogger(projectRootDir).warn("rename to same file or directory name requested");
    cb(false);
    return;
  }

  if (await fs.pathExists(newName)) {
    getLogger(projectRootDir).error(newName, "is already exists");
    cb(false);
    return;
  }

  try {
    await gitRm(projectRootDir, oldName);
    await fs.move(oldName, newName);
    await gitAdd(projectRootDir, newName);
    await sendDirectoryContents(emit, msg.path);
  } catch (e) {
    e.path = msg.path;
    e.oldName = msg.oldName;
    e.newName = msg.newName;
    getLogger(projectRootDir).error("rename failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onDownloadFile(emit, projectRootDir, msg, cb) {
  getLogger(projectRootDir).debug("downloadFile event recieved: ", msg);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  const filename = path.resolve(msg.path, msg.name);

  try {
    const file = await fs.readFile(filename);
    emit("downloadData", file);
  } catch (e) {
    if (e.code === "EISDIR") {
      getLogger(projectRootDir).error("download directory is not supported for now");
    } else {
      getLogger(projectRootDir).error("file download failed", e);
    }
    cb(false);
    return;
  }
  cb(true);
}

async function onCreateNewFile(emit, projectRootDir, filename, cb) {
  getLogger(projectRootDir).debug("createNewFile event recieved: ", filename);
  filename = convertPathSep(filename);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }

  try {
    await fs.writeFile(filename, "");
    await gitAdd(projectRootDir, filename);
    await sendDirectoryContents(emit, path.dirname(filename));
  } catch (e) {
    getLogger(projectRootDir).error("create new file failed", e);
    cb(false);
    return;
  }
  cb(true);
}

async function onCreateNewDir(emit, projectRootDir, dirname, cb) {
  getLogger(projectRootDir).debug("createNewDir event recieved: ", dirname);
  dirname = convertPathSep(dirname);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }

  try {
    await fs.mkdir(dirname);
    await fs.writeFile(path.resolve(dirname, ".gitkeep"), "");
    await gitAdd(projectRootDir, path.resolve(dirname, ".gitkeep"));
    await sendDirectoryContents(emit, path.dirname(dirname));
  } catch (e) {
    getLogger(projectRootDir).error("create new directory failed", e);
    cb(false);
    return;
  }
  cb(true);
}

function registerListeners(socket, projectRootDir) {
  const uploader = new Siofu();
  uploader.listen(socket);
  uploader.dir = os.homedir();
  uploader.on("start", (event)=>{
    getLogger(projectRootDir).debug("upload request recieved", event.file);
  });
  uploader.on("saved", async(event)=>{
    const absFilename = event.file.meta.componentDir ? path.resolve(convertPathSep(event.file.meta.componentDir), path.basename(event.file.pathName)) : event.file.pathName;
    if (event.file.pathName !== absFilename) {
      await fs.move(event.file.pathName, absFilename);
    }
    getLogger(projectRootDir).info(`upload completed ${absFilename} [${event.file.size} Byte]`);
    await gitAdd(projectRootDir, absFilename);
    await sendDirectoryContents(socket.emit.bind(socket), path.dirname(absFilename));
  });
  uploader.on("error", (event)=>{
    getLogger(projectRootDir).error("file upload failed", event.file, event.error);
  });

  socket.on("getFileList", onGetFileList.bind(null, uploader, socket.emit.bind(socket), projectRootDir));
  socket.on("getSNDContents", onGetSNDContents.bind(null, socket.emit.bind(socket), projectRootDir));
  socket.on("removeFile", onRemoveFile.bind(null, socket.emit.bind(socket), projectRootDir));
  socket.on("renameFile", onRenameFile.bind(null, socket.emit.bind(socket), projectRootDir));
  socket.on("downloadFile", onDownloadFile.bind(null, socket.emit.bind(socket), projectRootDir));
  socket.on("createNewFile", onCreateNewFile.bind(null, socket.emit.bind(socket), projectRootDir));
  socket.on("createNewDir", onCreateNewDir.bind(null, socket.emit.bind(socket), projectRootDir));
}

module.exports = registerListeners;
