"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var SwfFileType = require("./swfFileType");
/**
 * isDir
 * @param  dirPath directory path to check
 * @return dirPath is directory or not
 */
function isDir(dirPath) {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}
exports.isDir = isDir;
/**
 * get file list
 * @param pathDirectory read directory path
 * @param fileRegexfile extension pattern
 * @return file list
 */
function getFiles(pathDirectory, fileRegex) {
    var getFiles = [
        {
            name: "../",
            type: SwfFileType.DIRECTORY
        }
    ];
    fs.readdirSync(pathDirectory)
        .forEach(function (file) {
        var stat = fs.statSync(pathDirectory + "/" + file);
        if (stat.isFile() && (fileRegex != null && file.match(fileRegex))) {
            getFiles.push({
                name: file,
                type: SwfFileType.FILE
            });
        }
        else if (stat.isDirectory()) {
            getFiles.push({
                name: file + "/",
                type: SwfFileType.DIRECTORY
            });
        }
    });
    return getFiles;
}
exports.getFiles = getFiles;
//# sourceMappingURL=fileUtility.js.map