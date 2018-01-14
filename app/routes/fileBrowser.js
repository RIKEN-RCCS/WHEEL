"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
/**
 * send directory contents via socket.io
 *
 * @param {Object} socket socket.io's server instance
 * @param {string} eventName event name which is used sending directory contents
 * @param {string} targetDir directory path to read
 * @param {Object} options   dictionary contains following option value
 * @param {string}  [options.request]      requested directory path
 * @param {boolean} [options.sendDirname=true]  flag for send directory name or not
 * @param {boolean} [options.sendFilename=true] flag for send file name or not
 * @param {boolean} [options.sendSymlink=true]  flag for send symlink name or not
 * @param {Object} [options.filter]  item name filter
 * @param {Object} [options.filter.all=.*]  filter regex for both directories and files
 * @param {Object} [options.filter.dir=.*]  filter regex only for directories
 * @param {Object} [options.filter.file=.*] filter regex only for files
 * @param {Object} [options.withParentDir=true] flag for send parent dir('../') or not
 * plese note, if both options.filter.all and options.filter.{dir|file} is specified,
 * both filter is used. so the only {directory | file} which is valid filter.all and filter.{dir, file}
 * will be sent
 */
function sendDir(socket, eventName, targetDir, options=null) {
  if(socket == null || eventName == null){
    throw "illegal argument.";;
  }
  let request       = options.request != null ? options.request : targetDir;
  let sendDirname   = options.sendDirname  != null ? options.sendDirname  : true;
  let sendFilename  = options.sendFilename != null ? options.sendFilename : true;
  let sendSymlink   = options.sendSymlink  != null ? options.sendSymlink  : true;
  let withParentDir = options.withParentDir != null? options.withParentDir : false;

  fs.readdir(targetDir, function (err, names) {
    if (err)
      throw err;
    names.forEach(function (name) {
      if (options.filter && options.filter.all && !options.filter.all.test(name)) return;

      let absoluteFilename=path.join(targetDir, name);
      fs.lstat(absoluteFilename, function (err, stats) {
        if (err) return;
        if (stats.isDirectory() && sendDirname){
          if(options.filter && options.filter.dir && !options.filter.dir.test(name)) return;
          socket.emit(eventName, { "path": request, "name": name, "isdir": true, "islink": false });
        }
        if (stats.isFile() && sendFilename){
          if(options.filter && options.filter.file && !options.filter.file.test(name)) return;
          socket.emit(eventName, { "path": request, "name": name, "isdir": false, "islink": false });
        }
        if (stats.isSymbolicLink() && sendSymlink) {
          fs.stat(absoluteFilename, function (err, stats2) {
            if (err) return;
            if (stats2.isDirectory() && sendDirname) {
              if(options.filter && options.filter.dir && ! options.filter.dir.test(name)) return;
              socket.emit(eventName, { "path": request, "name": name, "isdir": true, "islink": true });
            }
            if (stats2.isFile() && sendFilename) {
              if(options.filter && options.filter.file && !options.filter.file.test(name)) return;
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
