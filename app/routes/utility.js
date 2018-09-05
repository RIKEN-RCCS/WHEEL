"use strict";
const path = require("path");
const fs = require("fs-extra");
const Mode = require("stat-mode");
const { projectJsonFilename, componentJsonFilename } = require("../db/db");

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
 * escape meta character of regex (from MDN)
 * please note that this function can not treat '-' in the '[]'
 * @param {string} string - target string which will be escaped
 * @returns {string} escaped regex string
 */
function escapeRegExp(string) {
  //eslint-disable-next-line no-useless-escape
  return string.replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1");
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

//blacklist
const win32reservedName = /(CON|PRN|AUX|NUL|CLOCK$|COM[0-9]|LPT[0-9])\..*$/i;
//whitelist
const alphanumeric = "a-zA-Z0-9";
//due to escapeRegExp's spec, bars must be added separately any other regexp strings
//eslint-disable-next-line no-useless-escape
const bars = "_\-";
const pathseps = "/\\";
const metaCharactors = "*?[]{}()!?+@.";


/**
 * determin specified name is valid file/directory name or not
 */
function isValidName(name) {
  if (typeof name !== "string") {
    return false;
  }

  if (win32reservedName.test(name)) {
    return false;
  }
  const forbidonChars = new RegExp(`[^${escapeRegExp(alphanumeric) + bars}]`);

  if (forbidonChars.test(name)) {
    return false;
  }
  return true;
}

function isValidInputFilename(name) {
  if (win32reservedName.test(name)) {
    return false;
  }
  const forbidonChars = new RegExp(`[^${escapeRegExp(`${alphanumeric + pathseps}.`) + bars}]`);

  if (forbidonChars.test(name)) {
    return false;
  }
  return true;
}

function isValidOutputFilename(name) {
  if (win32reservedName.test(name)) {
    return false;
  }
  const forbidonChars = new RegExp(`[^${escapeRegExp(alphanumeric + pathseps + metaCharactors) + bars}]`);

  if (forbidonChars.test(name)) {
    return false;
  }
  return true;
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

module.exports = {
  escapeRegExp,
  convertPathSep,
  addX,
  getDateString,
  replacePathsep,
  doCleanup,
  isValidName,
  isValidInputFilename,
  isValidOutputFilename,
  getSystemFiles,
  createSshConfig,
  isFinishedState
};
