"use strict";
var fs = require("fs");
var path = require("path");
var logger = require("./logger");
var serverUtility = require("./serverUtility");
var serverConfig = require("./serverConfig");
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
        var filename = serverUtility.getDefaultName(data.json.type);
        var oldDirectory = path.join(data.directory, data.json.oldPath);
        var newDirectory = path.join(data.directory, data.json.path);
        var filepath = path.join(newDirectory, filename);
        var error = function (err) {
            logger.error(err);
            _this.error = true;
            _this.saveTreeJson(callback);
        };
        var update = function () {
            _this.generateJobScript(data, function () {
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
     *
     * @param parentDirectory
     * @param json
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
     *
     * @param json
     * @param callback
     */
    WriteTreeJsonEvent.prototype.generateJobScript = function (data, callback) {
        if (!serverUtility.IsTypeJob(data.json)) {
            callback();
            return;
        }
        var config = serverConfig.getConfig();
        var submitJobname = config.submit_script;
        var srcPath = path.join(__dirname, config.scheduler[data.json.host.job_scheduler]);
        var dstPath = path.join(data.directory, data.json.path, submitJobname);
        fs.stat(dstPath, function (err, stat) {
            if (err && data.json.job_script.path) {
                data.json.script.path = submitJobname;
                var format = {
                    '%%nodes%%': data.json.script_param.nodes.toString(),
                    '%%cores%%': data.json.script_param.cores.toString(),
                    '%%script%%': data.json.job_script.path
                };
                serverUtility.writeFileKeywordReplacedAsync(srcPath, dstPath, format, callback);
                logger.info("create file=" + dstPath);
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