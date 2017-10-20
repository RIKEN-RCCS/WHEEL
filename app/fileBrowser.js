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
 * @param request   requested directory path 
 * @param sendDirname  flag for send directory name or not
 * @param sendFilename flag for send file name or not
 * @param sendSymlink  flag for send symlink name or not
 * @param filter dict which has 'hide', 'hideDir', 'hideFile' keys and each value must be RegExp.
 *               filenames does not emit if it does not much this filter
 */
function default_1(socket, eventName, targetDir, request=null, sendDirname = true, sendFilename = true, sendSymlink = true, filter = null, withParentDir=false) {
  if(!request) request=targetDir;
  fs.readdir(targetDir, function (err, names) {
    if (err)
      throw err;
    names.forEach(function (name) {
      if (filter != null) {
        if (!filter.hide.test(name)) {
          return;
        }
      }
      fs.lstat(path.join(targetDir, name), function (err, stats) {
        if (err)
          throw err;
        if (stats.isDirectory() && sendDirname) {
          if (filter == null || !filter.hideDir || filter.hideDir.test(name)) {
            socket.emit(eventName, { "path": request, "name": name, "isdir": true, "islink": false });
          }
        }
        if (stats.isFile() && sendFilename) {
          if (filter == null || !filter.hideFile || filter.hideFile.test(name)) {
            socket.emit(eventName, { "path": request, "name": name, "isdir": false, "islink": false });
          }
        }
        if (stats.isSymbolicLink() && sendSymlink) {
          fs.stat(path.join(targetDir, name), function (err, stats) {
            if (stats.isDirectory() && sendDirname) {
              if (filter == null || !filter.hideDir || filter.hideDir.test(name)) {
                socket.emit(eventName, { "path": request, "name": name, "isdir": true, "islink": true });
              }
            }
            if (stats.isFile() && sendFilename) {
              if (filter == null || !filter.hideFile || filter.hideFile.test(name)) {
                socket.emit(eventName, { "path": request, "name": name, "isdir": false, "islink": true });
              }
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
module.exports = default_1;
