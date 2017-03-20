"use strict";
var fs = require("fs");
var path = require("path");
var logger = require("./logger");
var ServerUtility = require("./serverUtility");
/**
 * socket io communication class for gettingfile list
 */
var GetFileListEvent = (function () {
    function GetFileListEvent() {
    }
    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    GetFileListEvent.prototype.onEvent = function (socket) {
        this.onGetFileList(socket);
        this.onDisconnect(socket);
    };
    /**
     * get file list
     * @param socket socket io instance
     */
    GetFileListEvent.prototype.onGetFileList = function (socket) {
        var _this = this;
        socket.on(GetFileListEvent.eventName, function (directoryPath, extension) {
            if (directoryPath == null) {
                directoryPath = ServerUtility.getHomeDir();
            }
            directoryPath = path.resolve(directoryPath);
            var regex = extension == null ? null : new RegExp(extension.replace(/\./, '\\.') + "$");
            _this.emitFileList(directoryPath, socket, regex);
        });
    };
    /**
     * Adds a listener for disconnect event
     * @param socket socket io object
     */
    GetFileListEvent.prototype.onDisconnect = function (socket) {
        var _this = this;
        socket.on('disconnect', function () {
            if (_this.watcher != null) {
                _this.watcher.close();
            }
        });
    };
    /**
     * emit to client for sending file list
     * @param pathDirectory read directory path
     * @param socket socket io object
     * @param fileRegex file extension pattern
     */
    GetFileListEvent.prototype.emitFileList = function (pathDirectory, socket, fileRegex) {
        try {
            var getFileList = this.getFileList(pathDirectory, fileRegex);
            logger.debug("send file list " + JSON.stringify(getFileList));
            var fileList = {
                directory: pathDirectory.replace(/[\\/]/g, '/') + "/",
                files: getFileList
            };
            socket.json.emit(GetFileListEvent.eventName, fileList);
            if (this.watcher != null) {
                this.watcher.close();
            }
        }
        catch (err) {
            logger.error(err);
            socket.emit(GetFileListEvent.eventName);
        }
    };
    /**
     * get file list
     * @param pathDirectory read directory path
     * @param fileRegexfile extension pattern
     * @return file list
     */
    GetFileListEvent.prototype.getFileList = function (pathDirectory, fileRegex) {
        var getFileList = [
            {
                name: "../",
                type: "dir"
            }
        ];
        fs.readdirSync(pathDirectory)
            .forEach(function (file) {
            var stat = fs.statSync(pathDirectory + "/" + file);
            if (stat.isFile() && (fileRegex != null && file.match(fileRegex))) {
                getFileList.push({
                    name: file,
                    type: "file"
                });
            }
            else if (stat.isDirectory()) {
                getFileList.push({
                    name: file + "/",
                    type: "dir"
                });
            }
        });
        return getFileList;
    };
    return GetFileListEvent;
}());
/**
 * event name
 */
GetFileListEvent.eventName = 'onGetFileList';
module.exports = GetFileListEvent;
//# sourceMappingURL=getFileListEvent.js.map