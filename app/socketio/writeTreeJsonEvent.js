"use strict";
var fs = require("fs");
var path = require("path");
var logger = require("../logger");
var ServerUtility = require("../serverUtility");
var ServerConfig = require("../serverConfig");
var SwfType = require("../swfType");
/**
 * socket io communication class for write SwfTreeJson information to server
 */
var WriteTreeJsonEvent = (function () {
    function WriteTreeJsonEvent() {
        /**
         * queue of json data path
         */
        this.queue = [];
    }
    /**
     * Adds a listener for this event
     * @param socket socket io instance
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
     * save tree json
     * @param callback The function to call when we save tree json
     */
    WriteTreeJsonEvent.prototype.saveTreeJson = function (callback) {
        var _this = this;
        var data = this.queue.shift();
        if (!data) {
            callback();
            return;
        }
        var filename = ServerUtility.getDefaultName(data.json.type);
        var oldDirectory = path.join(data.directory, data.json.oldPath);
        var newDirectory = path.join(data.directory, data.json.path);
        var filepath = path.join(newDirectory, filename);
        var error = function (err) {
            logger.error(err);
            _this.error = true;
            _this.saveTreeJson(callback);
        };
        var update = function () {
            _this.generateSubmitScript(data, function (err) {
                if (err) {
                    error(err);
                    return;
                }
                var copy = JSON.parse(JSON.stringify(data.json));
                delete copy.children;
                delete copy.oldPath;
                delete copy.script_param;
                fs.writeFile(filepath, JSON.stringify(copy, null, '\t'), function (err) {
                    if (err) {
                        logger.error(err);
                        _this.error = true;
                    }
                    logger.info("update file=" + filepath);
                    _this.saveTreeJson(callback);
                });
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
        if (data.json.path === undefined) {
            // delete
        }
        else if (!data.json.oldPath) {
            add();
        }
        else if (data.json.path !== data.json.oldPath) {
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
     * set data to queue
     * @param parentDirectory parent tree directory
     * @param json tree json data
     */
    WriteTreeJsonEvent.prototype.setQueue = function (parentDirectory, json) {
        var _this = this;
        this.queue.push({
            directory: parentDirectory,
            json: json
        });
        var childDirectory = path.join(parentDirectory, json.path);
        if (json.children) {
            json.children.forEach(function (child) {
                _this.setQueue(childDirectory, child);
            });
        }
    };
    /**
     * genereta submic script
     * @param data json data path
     * @param callback The function to call when we generate submit script
     */
    WriteTreeJsonEvent.prototype.generateSubmitScript = function (data, callback) {
        if (data.json.type !== SwfType.JOB) {
            callback();
            return;
        }
        var config = ServerConfig.getConfig();
        var submitJobname = config.submit_script;
        var jobJson = data.json;
        var srcPath = path.join(__dirname, config.scheduler[jobJson.remote.job_scheduler]);
        var dstPath = path.join(data.directory, data.json.path, submitJobname);
        fs.stat(dstPath, function (err, stat) {
            if (err && jobJson.job_script.path) {
                jobJson.script.path = submitJobname;
                var format = {
                    '%%nodes%%': jobJson.script_param.nodes.toString(),
                    '%%cores%%': jobJson.script_param.cores.toString(),
                    '%%script%%': jobJson.job_script.path
                };
                ServerUtility.writeFileKeywordReplacedAsync(srcPath, dstPath, format, callback);
                logger.info("create file=" + dstPath);
                return;
            }
            callback();
        });
    };
    return WriteTreeJsonEvent;
}());
/**
 * event name
 */
WriteTreeJsonEvent.eventName = 'writeTreeJson';
module.exports = WriteTreeJsonEvent;
//# sourceMappingURL=writeTreeJsonEvent.js.map