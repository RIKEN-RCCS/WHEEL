"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
/**
 * send directory contents via socket.io
 *
 * @param socket socket.io's server instance
 * @param eventName event name which is used sending directory contents
 * @param targetDir directory path to read
 * @param options   dictionary contains following option value
 *          request      requested directory path
 *          sendDirname  flag for send directory name or not
 *          sendFilename flag for send file name or not
 *          sendSymlink  flag for send symlink name or not
 *          filter       dict which has 'all', 'dir', 'file' keys.
 *                       only directory contents which match them will be send.
 */
function sendDir(socket, eventName, targetDir, options=null) {
  if(socket == null || eventName == null){
    throw "illegal argument.";;
  }
  let request       = options.request != null ? options.request : targetDir;
  let sendDirname   = options.sendDirname  != null ? options.sendDirname  : true;
  let sendFilename  = options.sendFilename != null ? options.sendFilename : true;
  let sendSymlink   = options.sendSymlink  != null ? options.sendSymlink  : true;
  let filter        = {};
  filter.all    = options.filter.all != null? options.filter.all : /.*/;
  filter.dir    = options.filter.dir != null? options.filter.dir : /.*/;
  filter.file    = options.filter.file != null? options.filter.file : /.*/;
  let withParentDir = options.withParentDir != null? options.withParentDir : false;

  fs.readdir(targetDir, function (err, names) {
    if (err)
      throw err;
    names.forEach(function (name) {
      if (!filter.all.test(name)) return;

      fs.lstat(path.join(targetDir, name), function (err, stats) {
        if (err)
          throw err;
        if (stats.isDirectory() && sendDirname && filter.dir.test(name)) {
          socket.emit(eventName, { "path": request, "name": name, "isdir": true, "islink": false });
        }
        if (stats.isFile() && sendFilename && filter.file.test(name)) {
          socket.emit(eventName, { "path": request, "name": name, "isdir": false, "islink": false });
        }
        if (stats.isSymbolicLink() && sendSymlink) {
          fs.stat(path.join(targetDir, name), function (err, stats) {
            if (stats.isDirectory() && sendDirname && filter.dir.test(name)) {
              socket.emit(eventName, { "path": request, "name": name, "isdir": true, "islink": true });
            }
            if (stats.isFile() && sendFilename && filter.file.test(name)) {
              socket.emit(eventName, { "path": request, "name": name, "isdir": false, "islink": true });
            }
          });
        }
      });
    });
  });
  if(withParentDir){
    socket.emit(eventName, { "path": request, "name": '../', "isdir": true, "islink": false });
  }
}
module.exports = sendDir;
