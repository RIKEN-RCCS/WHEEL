import fs = require('fs');
import SwfFileType = require('./swfFileType');
/**
 * isDir
 * @param  dirPath directory path to check
 * @return dirPath is directory or not
 */
export function isDir(dirPath: string): Boolean {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()
}

/**
 * get file list
 * @param pathDirectory read directory path
 * @param fileRegexfile extension pattern
 * @return file list
 */
export function getFiles(pathDirectory: string, fileRegex: RegExp): FileType[] {
    let getFiles: FileType[] = [
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
            } else if (stat.isDirectory()) {
                getFiles.push({
                    name: `${file}/`,
                    type: SwfFileType.DIRECTORY
                });
            }
        });
    return getFiles;
}


