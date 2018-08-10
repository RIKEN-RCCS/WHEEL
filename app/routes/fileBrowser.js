"use strict";
const fs = require("fs-extra");
const path = require("path");
/**
 * send directory contents via socket.io
 *
 * @param {function} emit - function which is used to sed directory contents
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
async function sendDir(emit, eventName, targetDir, options=null) {
  if(emit== null || eventName == null || targetDir == null){
    throw "illegal argument.";
  }
  const request       = options.request != null ? options.request : targetDir;
  const sendDirname   = options.sendDirname  != null ? options.sendDirname  : true;
  const sendFilename  = options.sendFilename != null ? options.sendFilename : true;
  const sendSymlink   = options.sendSymlink  != null ? options.sendSymlink  : true;
  const withParentDir = options.withParentDir != null? options.withParentDir : false;

  const dirList=[];
  const fileList=[];

  const names = await fs.readdir(targetDir);
  await Promise.all(names.map(async (name)=>{
    if (options.filter && options.filter.all && !options.filter.all.test(name)) return;
    const absoluteFilename=path.join(targetDir, name);
    const stats = await fs.lstat(absoluteFilename);
    if (stats.isDirectory() && sendDirname){
      if(options.filter && options.filter.dir && !options.filter.dir.test(name)) return;
      dirList.push({"path": request, "name": name, "type": "dir", "islink": false});
    }else if (stats.isFile() && sendFilename){
      if(options.filter && options.filter.file && !options.filter.file.test(name)) return;
      fileList.push({ "path": request, "name": name, "type": "file", "islink": false });
    }
    if (stats.isSymbolicLink() && sendSymlink) {
      const stats2 = await fs.stat(absoluteFilename);
      if (stats2.isDirectory() && sendDirname) {
        if(options.filter && options.filter.dir && ! options.filter.dir.test(name)) return;
        dirList.push({"path": request, "name": name, "type": "dir", "islink": true});
      }
      if (stats2.isFile() && sendFilename) {
        if(options.filter && options.filter.file && !options.filter.file.test(name)) return;
        fileList.push({ "path": request, "name": name, "type": "file", "islink": true});
      }
    }
  }));
  if(withParentDir){
    dirList.push({"path": request, "name": "../", "type": "dir", "islink": false});
  }

  //TODO 連番ファイルをチェックして存在すればfileListを置き換える

  const result = dirList.sort().concat(fileList.sort());
  emit("fileList", result);
}
module.exports = sendDir;
