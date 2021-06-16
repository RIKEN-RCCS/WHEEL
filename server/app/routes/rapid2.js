/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
"use strict";
const path = require("path");
const { getLogger } = require("../core/projectResource");
const { openFile, saveFile } = require("../core/fileUtils");


function registerListeners(socket, projectRootDir) {
  //filename must be absolute path!!
  socket.on("openFile", async(filename, forceNormal, cb)=>{
    //these 2 lines should be placed in middleware
    const callback = (typeof cb === "function") ? cb : ()=>{};
    getLogger(projectRootDir).debug("openFile event recieved:", filename, forceNormal);

    try {
      const files = await openFile(filename, forceNormal);
      for (const file of files) {
        if (file.isParameterSettingFile) {
          socket.emit("parameterSettingFile", file);
        } else {
          socket.emit("file", file);
        }
      }
    } catch (err) {
      getLogger(projectRootDir).warn("openFile event failed", err);
      return callback(err);
    }
    return callback(true);
  });

  socket.on("saveFile", async(filename, dirname, content, cb)=>{
    const callback = (typeof cb === "function") ? cb : ()=>{};
    getLogger(projectRootDir).debug("saveFile event recieved:", filename, dirname);

    try {
      await saveFile(path.resolve(dirname, filename), content);
    } catch (err) {
      getLogger(projectRootDir).warn("saveFile event failed", err);
      return callback(err);
    }
    return callback(true);
  });
}

module.exports = registerListeners;
