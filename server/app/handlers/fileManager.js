"use strict";
const path = require("path");
const fs = require("fs-extra");
const { gitAdd } = require("../core/gitOperator2");
const { convertPathSep } = require("../core/pathUtils");
const { escapeRegExp } = require("../lib/utility");
const fileBrowser = require("../core/fileBrowser");
const { getLogger } = require("../logSettings");
const logger = getLogger();
const { projectJsonFilename, componentJsonFilename, rootDir } = require("../db/db");
const oldProjectJsonFilename = "swf.prj.json";
const noDotFiles = /^[^.].*$/;
const allFiles = /.*/;
const exceptSystemFiles = new RegExp(`^(?!^.*(${escapeRegExp(projectJsonFilename)}|${escapeRegExp(componentJsonFilename)}|.git.*)$).*$`);
const projectJsonFileOnly = new RegExp(`^.*(?:${escapeRegExp(projectJsonFilename)}|${escapeRegExp(oldProjectJsonFilename)})$`);

/*
 * mode is one of dir, dirWithProjectJson, underComponent, SND
 */
const onGetFileList = async(msg, cb)=>{
  logger.debug("getFileList");

  if (typeof cb !== "function") {
    throw new Error("socketIO API must be called with call back function");
  }

  const target = msg.path ? path.normalize(convertPathSep(msg.path)) : rootDir;
  const request = target;

  const sendFilename = msg.mode !== "dir";
  const SND = msg.mode === "underComponent"; //send serial numberd content as SND or not
  const allFilter = msg.mode === "dir" || msg.mode === "dirWithProjectJson" ? noDotFiles : allFiles;
  const fileFilter = msg.mode === "dirWithProjectJson" ? projectJsonFileOnly
    : msg.mode === "underComponent" || msg.mode === "SND" ? exceptSystemFiles : null;
  //MEMO dir filter is uset to exclude component directory in old version but
  //this behavier was changed becase fileBrowser set isComponentDir flag now
  //so client must exclude component directory if you should not show it.

  try {
    const result = await fileBrowser(target, {
      request,
      sendFilename,
      SND,
      filter: {
        all: allFilter,
        file: fileFilter,
        dir: null
      },
      withParentDir: false
    });
    return cb(result);
  } catch (e) {
    logger.error("error occurred during reading directory", e);
    return cb(null);
  }
};

async function onCreateNewFile(projectRootDir, argFilename, cb) {
  const filename = convertPathSep(argFilename);

  try {
    await fs.writeFile(filename, "");
    await gitAdd(projectRootDir, filename);
  } catch (e) {
    logger.error("create new file failed", e);
    cb(null);
    return;
  }
  cb(filename);
}

async function onCreateNewDir(projectRootDir, argDirname, cb) {
  const dirname = convertPathSep(argDirname);

  try {
    await fs.mkdir(dirname);
    await fs.writeFile(path.resolve(dirname, ".gitkeep"), "");
    await gitAdd(projectRootDir, path.resolve(dirname, ".gitkeep"));
  } catch (e) {
    logger.error("create new directory failed", e);
    cb(null);
    return;
  }
  cb(dirname);
}


module.exports = {
  onGetFileList,
  onCreateNewFile,
  onCreateNewDir
};
