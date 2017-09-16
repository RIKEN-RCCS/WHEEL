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
 * @param sendDirname  flag for send directory name or not
 * @param sendFilename flag for send file name or not
 * @param sendSymlink  flag for send symlink name or not
 * @param filter dict which has 'hide', 'hideDir', 'hideFile' keys and each value must be RegExp.
 *               filenames does not emit if it does not much this filter
 */
function default_1(socket, eventName, targetDir, sendDirname = true, sendFilename = true, sendSymlink = true, filter = null) {
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
                        socket.emit(eventName, { "path": targetDir, "name": name, "isdir": true, "islink": false });
                    }
                }
                if (stats.isFile() && sendFilename) {
                    if (filter == null || !filter.hideFile || filter.hideFile.test(name)) {
                        socket.emit(eventName, { "path": targetDir, "name": name, "isdir": false, "islink": false });
                    }
                }
                if (stats.isSymbolicLink() && sendSymlink) {
                    fs.stat(path.join(targetDir, name), function (err, stats) {
                        if (stats.isDirectory() && sendDirname) {
                            if (filter == null || !filter.hideDir || filter.hideDir.test(name)) {
                                socket.emit(eventName, { "path": targetDir, "name": name, "isdir": true, "islink": true });
                            }
                        }
                        if (stats.isFile() && sendFilename) {
                            if (filter == null || !filter.hideFile || filter.hideFile.test(name)) {
                                socket.emit(eventName, { "path": targetDir, "name": name, "isdir": false, "islink": true });
                            }
                        }
                    });
                }
            });
        });
    });
}
exports.default = default_1;
function remove(target) {
    // targetはfile又はディレクトリ又はlink
    // linkの時はlinkだけを消すこと(link先を消しちゃ駄目)
}
exports.remove = remove;
function rename(oldName, newName) {
    //oldNameは存在するファイル、newNameは文字列(path.normalizeとかかける必要あり?)
}
exports.rename = rename;
function upload(socket, eventName, targetFile) {
    socket.on(eventName, function (data) {
        //  fs.writeFile(targetFile, data);
    });
}
exports.upload = upload;
function download(socket, eventName, targetFile) {
    fs.readFile(targetFile, function (data) {
        socket.emit(eventName, data);
    });
}
exports.download = download;
//# sourceMappingURL=fileBrowser.js.map