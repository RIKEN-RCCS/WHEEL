"use strict";
const path = require("path");
const fs = require("fs-extra");
const { EventEmitter } = require("events");
const { projectJsonFilename, componentJsonFilename } = require("../db/db");
const { escapeRegExp, isValidName, isValidInputFilename, isValidOutputFilename } = require("../lib/utility");
const { convertPathSep } = require("../core/pathUtils");

/**
 * check if ssh connection can be established
 * @param {hostinfo} hotsInfo - remote host setting
 * @param {string} password - password or passphrase for private key
 */
async function createSshConfig(hostInfo, password) {
  const config = {
    host: hostInfo.host,
    port: hostInfo.port,
    keepaliveInterval: hostInfo.keepaliveInterval || 30000,
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


class EmitArbitrator extends EventEmitter {
  constructor(send, event, array, chunksize) {
    super();
    this.start = 0;
    this.end = chunksize;
    this.array = Array.from(array);
    this.on("send", ()=>{
      send(event, this.array.slice(this.start, this.end), (err)=>{
        if (err) {
          this.emit("error");
        }
        this.start = this.end;
        this.end += chunksize;

        if (this.start < this.array.length) {
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
 * @param {Function} emit - emitting function (should be socket.IO's socket.emit);
 * @param {string} enevt - envet name
 * @param {*[]} array - data to be send
 * @param {number} chunksize - number of array length to be send at one time
 */
async function emitLongArray(emit, event, array, chunksize) {
  const arbitrator = new EmitArbitrator(emit, event, array, chunksize);
  return arbitrator.go();
}

module.exports = {
  doCleanup,
  getSystemFiles,
  createSshConfig,
  escapeRegExp,
  isValidName,
  isValidInputFilename,
  isValidOutputFilename,
  emitLongArray
};
