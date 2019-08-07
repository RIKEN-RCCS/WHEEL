"use strict";
const { getLogger } = require("../core/projectResource");
const { openFile, saveFile } = require("../core/fileUtils");

async function onOpenFile(emit, projectRootDir, filename, forceNormal, cb) {
  getLogger(projectRootDir).debug("openFile event recieved:", filename, forceNormal);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }

  try {
    const files = await openFile(filename, forceNormal);
    for (const file of files) {
      emit("file", file);
    }
  } catch (err) {
    getLogger(projectRootDir).warn("openFile event failed", err);
    return cb(false);
  }
  cb(true);
}

async function onSaveFile(emit, projectRootDir, filename, content, cb) {
  getLogger(projectRootDir).debug("saveFile event recieved:", filename);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  try {
    await saveFile(filename, content);
  } catch (err) {
    getLogger(projectRootDir).warn("saveFile event failed", err);
    return cb(false);
  }
  cb(true);
}

function registerListeners(socket, projectRootDir) {
  socket.on("openFile", onOpenFile.bind(null, socket.emit.bind(socket), projectRootDir));
  socket.on("saveFile", onSaveFile.bind(null, socket.emit.bind(socket), projectRootDir));
}

module.exports = registerListeners;
