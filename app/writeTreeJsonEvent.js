"use strict";
var fs = require("fs");
var path = require("path");
var logger = require("./logger");
var serverUtility = require("./serverUtility");
/**
 *
 */
var WriteTreeJsonEvent = (function () {
    function WriteTreeJsonEvent() {
        /**
         *
         */
        this.queue = [];
    }
    /**
     *
     * @param socket
     */
    WriteTreeJsonEvent.prototype.onEvent = function (socket) {
        var _this = this;
        socket.on(WriteTreeJsonEvent.eventName, function (projectDirectory, json) {
            _this.error = false;
            _this.queue.length = 0;
            _this.setQueue(projectDirectory, json);
            _this.saveTreeJson(function () {
                socket.emit(WriteTreeJsonEvent.eventName, _this.error);
            });
        });
    };
    /**
     *
     * @param callback
     */
    WriteTreeJsonEvent.prototype.saveTreeJson = function (callback) {
        var _this = this;
        var data = this.queue.shift();
        if (!data) {
            callback();
            return;
        }
        var copy = JSON.parse(JSON.stringify(data.tree));
        var filename = serverUtility.getDefaultName(data.tree.type);
        var oldDirectory = path.join(data.dir, copy.oldPath);
        var newDirectory = path.join(data.dir, copy.path);
        var filepath = path.join(newDirectory, filename);
        delete copy.children;
        delete copy.oldPath;
        var error = function (err) {
            logger.error(err);
            _this.error = true;
            _this.saveTreeJson(callback);
        };
        var update = function () {
            fs.writeFile(filepath, JSON.stringify(copy, null, '\t'), function (err) {
                if (err) {
                    logger.error(err);
                    _this.error = true;
                }
                logger.info("update file=" + filepath);
                _this.saveTreeJson(callback);
            });
        };
        var add = function () {
            fs.mkdir(newDirectory, function (err) {
                if (err) {
                    error(err);
                }
                else {
                    logger.info("make    dir=" + newDirectory);
                    update();
                }
            });
        };
        var rename = function () {
            fs.rename(oldDirectory, newDirectory, function (err) {
                if (err) {
                    error(err);
                }
                else {
                    logger.info("rename  dir=" + oldDirectory + " to " + newDirectory);
                    update();
                }
            });
        };
        if (data.tree.path === undefined) {
        }
        else if (!data.tree.oldPath) {
            add();
        }
        else if (data.tree.path !== data.tree.oldPath) {
            fs.stat(oldDirectory, function (err, stat) {
                if (err) {
                    error(err);
                }
                else if (stat.isDirectory()) {
                    rename();
                }
                else {
                    add();
                }
            });
        }
        else {
            fs.stat(filepath, function (err, stat) {
                if (err) {
                    add();
                }
                else if (stat.isFile()) {
                    update();
                }
                else {
                    add();
                }
            });
        }
    };
    /**
     *
     * @param parentDirectory
     * @param json
     */
    WriteTreeJsonEvent.prototype.setQueue = function (parentDirectory, json) {
        var _this = this;
        this.queue.push({
            dir: parentDirectory,
            tree: json
        });
        var childDirectory = path.join(parentDirectory, json.path);
        if (json.children) {
            json.children.forEach(function (child) {
                _this.setQueue(childDirectory, child);
            });
        }
    };
    return WriteTreeJsonEvent;
}());
/**
 * event name
 */
WriteTreeJsonEvent.eventName = 'writeTreeJson';
module.exports = WriteTreeJsonEvent;
//# sourceMappingURL=writeTreeJsonEvent.js.map