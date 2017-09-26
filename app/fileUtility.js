"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const SwfFileType = require("./swfFileType");
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
    let getFiles = [
        {
            name: `../`,
            type: SwfFileType.DIRECTORY
        }
    ];
    fs.readdirSync(pathDirectory)
        .forEach(file => {
        const stat = fs.statSync(`${pathDirectory}/${file}`);
        if (stat.isFile() && (fileRegex != null && file.match(fileRegex))) {
            getFiles.push({
                name: file,
                type: SwfFileType.FILE
            });
        }
        else if (stat.isDirectory()) {
            getFiles.push({
                name: `${file}/`,
                type: SwfFileType.DIRECTORY
            });
        }
    });
    return getFiles;
}
exports.getFiles = getFiles;
//# sourceMappingURL=fileUtility.js.map