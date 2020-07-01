/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
"use strict";
const path = require("path");
const express = require("express");
const os = require("os");
const { getLogger } = require("../logSettings");
const logger = getLogger("jobScript");
const fileBrowser = require("../core/fileBrowser");
const { jobScript, rootDir } = require("../db/db");
const { convertPathSep } = require("../core/pathUtils");

/**
 *
 *
 * @param {*} sio
 * @param {*} request
 */
async function sendFileListScript(sio, request) {
  logger.debug(`current dir = ${request}`);
  const target = request ? path.normalize(convertPathSep(request)) : rootDir || os.homedir() || "/";
  const result = await fileBrowser(target, {
    request,
    withParentDir: true
  });
  sio.emit("fileList", result);
}

/**
 *
 *
 * @param {*} newlabelName
 */
async function isDuplicateFileName(newlabelName) {
  const currentLabelList = jobScript.getAll();
  if (currentLabelList.length === 0) {
    return false;
  }
  const rt = currentLabelList.some((e)=>{
    return e.templateName === newlabelName;
  });
  return rt;
}

/**
 *
 *
 * @param {*} sio
 * @param {*} request
 */
async function avoidDuplicateFileName(id) {
  const buffer = jobScript.get(id);
  const labelName = buffer.templateName;
  let newlabelName = labelName;
  let suffixNum = 1;

  if (await isDuplicateFileName(labelName)) {
    while (await isDuplicateFileName(`${labelName}_${suffixNum}`)) {
      ++suffixNum;
    }
    newlabelName = `${labelName}_${suffixNum}`;
    logger.warn(labelName, "is already used. so this file is renamed to", newlabelName);
  }
  jobScript.jobScriptcopy(id, newlabelName);
  return newlabelName;
}

/**
 * @param {*} io - socketio
 * @param {*} projectRootDir - project root directory
 * @returns {*} router
 */
module.exports = function (io) {
  const sio = io.of("/jobScript");
  const doAndEmit = (func, msg)=>{
    func(msg).then(()=>{
      sio.emit("jobScriptList", jobScript.getAll());
    });
  };
  sio.on("connect", (socket)=>{
    logger.addContext("sio", socket);
    socket.on("getJobScriptList", ()=>{
      socket.emit("jobScriptList", jobScript.getAll());
    });
    socket.on("addJobScript", doAndEmit.bind(null, jobScript.add.bind(jobScript)));
    socket.on("removeJobScript", doAndEmit.bind(null, jobScript.remove.bind(jobScript)));
    socket.on("updateJobScript", doAndEmit.bind(null, jobScript.update.bind(jobScript)));
    socket.on("copyJobScript", doAndEmit.bind(null, avoidDuplicateFileName.bind(jobScript)));
    socket.on("getFileList", sendFileListScript.bind(null, socket));
  });
  //eslint-disable-next-line new-cap
  const router = express.Router();
  router.get("/", (req, res)=>{
    res.sendFile(path.resolve(__dirname, "../views/jobScript.html"));
  });
  return router;
};


//TODO : テストのときにこのコメントをはずしてmochaでテストします。
// module.exports = {
//   onCreateScript,
//   createTCSScript,
//   createUGEScript,
//   isDuplicateFileName,
//   avoidDuplicateFileName
// };
