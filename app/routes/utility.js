"use strict";
const path = require("path");
const fs = require("fs-extra");
const Mode = require("stat-mode");
const promiseRetry = require("promise-retry");
const { projectJsonFilename, componentJsonFilename } = require("../db/db");
const { escapeRegExp, isValidName, isValidInputFilename, isValidOutputFilename } = require("../lib/utility");

/**
 * replace path separator by native path separator
 */
function convertPathSep(pathString) {
  if (path.sep === path.posix.sep) {
    return pathString.replace(new RegExp(`\\${path.win32.sep}`, "g"), path.sep);
  }
  return pathString.replace(new RegExp(path.posix.sep, "g"), path.sep);
}

/**
 * replace path.win32.sep by path.posix.sep
 */
function replacePathsep(pathString) {
  return pathString.replace(new RegExp(`\\${path.win32.sep}`, "g"), path.posix.sep);
}

/**
 * check if ssh connection can be established
 * @param {hostinfo} hotsInfo - remote host setting
 * @param {string} password - password or passphrase for private key
 */
async function createSshConfig(hostInfo, password) {
  const config = {
    host: hostInfo.host,
    port: hostInfo.port,
    username: hostInfo.username
  };

  if (hostInfo.keyFile) {
    config.privateKey = await fs.readFile(hostInfo.keyFile);
    config.privateKey = config.privateKey.toString();

    if (password) {
      config.passphrase = password;
      config.password = null;
    }
  } else {
    config.privateKey = null;

    if (password) {
      config.passphrase = null;
      config.password = password;
    }
  }
  return config;
}

/**
 * add execute permission to file
 * @param {string} file - filename in absolute path
 */
async function addX(file) {
  const stat = await fs.stat(file);
  const mode = new Mode(stat);
  let u = 4;
  let g = 4;
  let o = 4;

  if (mode.owner.read) {
    u += 1;
  }

  if (mode.owner.write) {
    u += 2;
  }

  if (mode.group.read) {
    g += 1;
  }

  if (mode.group.write) {
    g += 2;
  }

  if (mode.others.read) {
    o += 1;
  }

  if (mode.others.write) {
    o += 2;
  }
  const modeString = u.toString() + g.toString() + o.toString();
  return fs.chmod(file, modeString);
}

function getDateString(humanReadable = false) {
  const now = new Date();
  const yyyy = `0000${now.getFullYear()}`.slice(-4);
  const month = now.getMonth() + 1;
  const mm = `00${month}`.slice(-2);
  const dd = `00${now.getDate()}`.slice(-2);
  const HH = `00${now.getHours()}`.slice(-2);
  const MM = `00${now.getMinutes()}`.slice(-2);
  const ss = `00${now.getSeconds()}`.slice(-2);
  return humanReadable ? `${yyyy}/${mm}/${dd}-${HH}:${MM}:${ss}` : `${yyyy}${mm}${dd}-${HH}${MM}${ss}`;
}

/**
 * determine do cleanup or not
 * @param {number || string} flag - cleanup flag
 * @param {number || string} parentflag - parent component's cleanup flag
 */
function doCleanup(flag, parentFlag) {
  const numFlag = parseInt(flag, 10);

  if (numFlag === 2) {
    const numParentFlag = parseInt(parentFlag, 10);
    return numParentFlag === 0;
  }
  return numFlag === 0;
}


/**
 * return regexp of systemfiles
 */
function getSystemFiles() {
  //eslint-disable-next-line no-useless-escape
  return new RegExp(`^(?!^.*(${escapeRegExp(projectJsonFilename)}|${escapeRegExp(componentJsonFilename)}|\.git.*)$).*$`);
}

function isFinishedState(state) {
  return state === "finished" || state === "failed";
}

async function readJsonGreedy(filename) {
  return promiseRetry(async(retry)=>{
    const buf = await fs.readFile(filename)
      .catch((e)=>{
        if (e.code === "ENOENT") {
          retry();
        }
        throw (e);
      });
    const strData = buf.toString("utf8").replace(/^\uFEFF/, "");
    if (strData.length === 0) {
      retry();
    }
    let jsonData;
    try {
      jsonData = JSON.parse(strData);
    } catch (e) {
      if (e instanceof SyntaxError) {
        retry();
      }
      throw (e);
    }
    //need check by jsonSchema but it may cause performance problem
    return jsonData;
  },
  {
    retries: 10,
    minTimeout: 1000,
    factor: 1
  });
}

/**
 * replace illegal chars as path string
 * @param {string} target - string which should be sanitized
 * @return {string} - sanitized path
 */
function sanitizePath(target, replacer="_"){
  //replace path.sep by '_'
  const re = path.sep === path.win32.sep?  new RegExp(`\\${path.win32.sep}`, "g"):new RegExp(path.posix.sep, "g");
  let sanitized = target.toString().replace(re, replacer);

  //remove trailing replacer
  sanitized = sanitized.endsWith(replacer)?sanitized.slice(0,-1):sanitized;

  return sanitized;
}

module.exports = {
  convertPathSep,
  addX,
  getDateString,
  replacePathsep,
  doCleanup,
  getSystemFiles,
  createSshConfig,
  isFinishedState,
  readJsonGreedy,
  escapeRegExp,
  isValidName,
  isValidInputFilename,
  isValidOutputFilename,
  sanitizePath
};
