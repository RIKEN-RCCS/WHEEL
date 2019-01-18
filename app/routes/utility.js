"use strict";
const path = require("path");
const { promisify } = require("util");
const fs = require("fs-extra");
const { EventEmitter } = require("events");
const Mode = require("stat-mode");
const promiseRetry = require("promise-retry");
const glob = require("glob");
const { projectJsonFilename, componentJsonFilename } = require("../db/db");
const {pathseps, metaCharactors, reWin32ReservedNames, escapeRegExp, isValidName, isValidInputFilename, isValidOutputFilename } = require("../lib/utility");

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
    const tmp = await fs.readFile(path.normalize(convertPathSep(hostInfo.keyFile)));
    config.privateKey = tmp.toString();

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
 * @returns {string} - sanitized path
 */
function sanitizePath(target, replacer = "_") {
  //replace danger chars
  let sanitized = target.toString().replace(new RegExp(`[${escapeRegExp(pathseps+metaCharactors+"~.=")}]`, "g"), replacer);

  //replace win32 reserved names
  sanitized = sanitized.replace(new RegExp(reWin32ReservedNames,"gi"), replacer);

  //remove trailing replacer
  sanitized = sanitized.endsWith(replacer) ? sanitized.slice(0, -1) : sanitized;

  return sanitized;
}

/**
 * expand array of glob and return flat array of path
 * @param {string[]} globs - array contains glob
 * @param {string} cwd - working directory for globbing
 * @returns {string[]} - array of path
 */
async function expandArrayOfGlob(globs, cwd) {
  const names = await Promise.all(
    globs.map((e)=>{
      return promisify(glob)(e, { cwd });
    })
  );
  return Array.prototype.concat.apply([], names);
}

class EmitArbitrator extends EventEmitter {
  constructor(send, event, array, chunksize) {
    super();
    this.start = 0;
    this.end = chunksize;
    this.on("send", ()=>{
      send(event, array.slice(this.start, this.end), (err)=>{
        if (err) {
          this.emit("error");
        }
        this.start = this.end;
        this.end = this.end + chunksize;

        if (this.end < array.length) {
          this.emit("send");
        } else {
          this.emit("done");
        }
      });
    });
  }

  stop() {
    this.emit("stop");
  }

  async go() {
    setImmediate(()=>{
      this.emit("send");
    });
    return new Promise((resolve, reject)=>{
      const onStop = ()=>{
        /*eslint-disable no-use-before-define */
        this.removeListener("error", onError);
        this.removeListener("done", onDone);
        /*eslint-enable no-use-before-define */
        this.removeListener("stop", onStop);
      };

      const onDone = ()=>{
        onStop();
        resolve();
      };

      const onError = (err)=>{
        onStop();
        reject(err);
      };
      this.once("done", onDone);
      this.once("error", onError);
      this.once("stop", onStop);
    });
  }
}


/**
 * divide array to chunk and send each chunk seqentialy
 * @param {function} emit - emitting function (should be socket.IO's socket.emit);
 * @param {string} enevt - envet name
 * @param {*[]} array - data to be send
 * @param {Number} chunksize - number of array length to be send at one time
 */
async function emitLongArray(emit, event, array, chunksize) {
  const arbitrator = new EmitArbitrator(emit, event, array, chunksize);
  return arbitrator.go();
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
  sanitizePath,
  expandArrayOfGlob,
  emitLongArray
};
