/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
"use strict";
const path = require("path");
const { getLogger } = require("../core/projectResource");
const { openFile, saveFile } = require("../core/fileUtils");

async function onOpenFile(emit, projectRootDir, filename, dirname, forceNormal, cb) {
  getLogger(projectRootDir).debug("openFile event recieved:", filename, dirname, forceNormal);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }

  try {
    const files = await openFile(projectRootDir, path.resolve(dirname, filename), forceNormal);
    for (const file of files) {
      if (file.isParameterSettingFile) {
        emit("parameterSettingFile", file);
      } else {
        emit("file", file);
      }
    }
  } catch (err) {
    getLogger(projectRootDir).warn("openFile event failed", err);
    return cb(err);
  }
  cb(true);
}

async function onSaveFile(emit, projectRootDir, filename, dirname, content, cb) {
  getLogger(projectRootDir).debug("saveFile event recieved:", filename, dirname);

  if (typeof cb !== "function") {
    cb = ()=>{};
  }
  try {
    await saveFile(path.resolve(dirname, filename), content);
  } catch (err) {
    getLogger(projectRootDir).warn("saveFile event failed", err);
    return cb(err);
  }
  cb(true);
}

function registerListeners(socket, projectRootDir) {
  socket.on("openFile", onOpenFile.bind(null, socket.emit.bind(socket), projectRootDir));
  socket.on("saveFile", onSaveFile.bind(null, socket.emit.bind(socket), projectRootDir));
}

module.exports = registerListeners;
