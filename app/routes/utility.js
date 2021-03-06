/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
"use strict";
const { EventEmitter } = require("events");
const { projectJsonFilename, componentJsonFilename } = require("../db/db");
const { escapeRegExp } = require("../lib/utility");

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


class EmitArbitrator_old extends EventEmitter {
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
  const arbitrator = new EmitArbitrator_old(emit, event, array, chunksize);
  return arbitrator.go();
}


module.exports = {
  doCleanup,
  getSystemFiles,
  emitLongArray
};
