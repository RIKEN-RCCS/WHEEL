"use strict";
var fs = require("fs");
var path = require("path");
var logger = require("../logger");
var ServerUtility = require("../serverUtility");
var ServerConfig = require("../serverConfig");
var SwfState = require("../swfState");
var SwfType = require("../swfType");
/**
 * socket io communication class for getting project json from server
 */
var OpenProjectJsonEvent = (function () {
    function OpenProjectJsonEvent() {
        /**
         * config parameter
         */
        this.config = ServerConfig.getConfig();
    }
    /**
     * Adds a listener for connect event
     * @param socket socket socket io instance
     */
    OpenProjectJsonEvent.prototype.onEvent = function (socket) {
        var _this = this;
        socket.on(OpenProjectJsonEvent.eventName, function (projectFilepath) {
            fs.readFile(projectFilepath, function (err, data) {
                try {
                    if (err) {
                        logger.error(err);
                        socket.emit(OpenProjectJsonEvent.eventName);
                        return;
                    }
                    var projectJson_1 = JSON.parse(data.toString());
                    _this.createProjectJson(projectFilepath, projectJson_1);
                    if (SwfState.isPlanning(projectJson_1)) {
                        socket.json.emit(OpenProjectJsonEvent.eventName, projectJson_1);
                    }
                    else {
                        var queue = [];
                        _this.setQueue(queue, projectJson_1.log);
                        _this.updateLogJson(queue, function () {
                            projectJson_1.state = projectJson_1.log.state;
                            socket.json.emit(OpenProjectJsonEvent.eventName, projectJson_1);
                        });
                    }
                }
                catch (error) {
                    logger.error(error);
                    socket.emit(OpenProjectJsonEvent.eventName);
                }
            });
        });
    };
    /**
     * rename log json path
     * @param logJson log json data
     * @param from string befor conversion
     * @param to string after conversion
     */
    OpenProjectJsonEvent.prototype.renameLogjsonPath = function (logJson, from, to) {
        var _this = this;
        logJson.path = logJson.path.replace(from, to);
        logJson.children.forEach(function (child) {
            _this.renameLogjsonPath(child, from, to);
        });
    };
    ;
    /**
     * set queue scpecified log json data
     * @param queue set queue
     * @param logJson log json data
     */
    OpenProjectJsonEvent.prototype.setQueue = function (queue, logJson) {
        var _this = this;
        queue.push(logJson);
        var _loop_1 = function (index) {
            var child = logJson.children[index];
            if (child.type !== SwfType.FOR && child.type !== SwfType.PSTUDY) {
                this_1.setQueue(queue, child);
                return "continue";
            }
            var basename = path.basename(child.path);
            var files = fs.readdirSync(logJson.path);
            var newChildren = [];
            var regexp = new RegExp("^" + basename + "_([0-9]+)$");
            files.forEach(function (file) {
                if (file.match(regexp)) {
                    var newLogJson_1 = {
                        name: child.name + "_" + RegExp.$1,
                        path: child.path + "_" + RegExp.$1,
                        description: child.description,
                        type: child.type,
                        state: child.state,
                        execution_start_date: '',
                        execution_end_date: '',
                        order: child.order,
                        children: JSON.parse(JSON.stringify(child.children))
                    };
                    newLogJson_1.children.forEach(function (newChild) {
                        _this.renameLogjsonPath(newChild, child.path, newLogJson_1.path);
                    });
                    newChildren.push(newLogJson_1);
                }
            });
            logJson.children.splice(index, 1);
            newChildren
                .sort(function (a, b) {
                var aIndex = parseInt(a.path.match(/([0-9]+)$/)[1]);
                var bIndex = parseInt(b.path.match(/([0-9]+)$/)[1]);
                if (aIndex < bIndex) {
                    return 1;
                }
                else {
                    return -1;
                }
            })
                .forEach(function (newChild) {
                logJson.children.splice(index, 0, newChild);
                _this.setQueue(queue, newChild);
            });
        };
        var this_1 = this;
        for (var index = logJson.children.length - 1; index >= 0; index--) {
            _loop_1(index);
        }
    };
    /**
     * update log json data
     * @param queue set queue
     * @param callback The function to call when we have updated log json
     */
    OpenProjectJsonEvent.prototype.updateLogJson = function (queue, callback) {
        var _this = this;
        var logJson = queue.shift();
        if (!logJson) {
            callback();
            return;
        }
        if (SwfState.isFinished(logJson)) {
            this.updateLogJson(queue, callback);
            return;
        }
        var logFilePath = path.join(logJson.path, this.config.system_name + ".log");
        fs.readFile(logFilePath, function (err, data) {
            if (!err) {
                var readJson = JSON.parse(data.toString());
                logJson.state = readJson.state;
                logJson.execution_start_date = readJson.execution_start_date;
                logJson.execution_end_date = readJson.execution_end_date;
            }
            _this.updateLogJson(queue, callback);
        });
    };
    /**
     * create project new project json
     * @param projectPath project json file path
     * @param projectJson project json data
     */
    OpenProjectJsonEvent.prototype.createProjectJson = function (projectPath, projectJson) {
        var dir_project = path.dirname(projectPath);
        var path_workflow = path.resolve(dir_project, projectJson.path_workflow);
        projectJson.log = ServerUtility.createLogJson(path_workflow);
    };
    return OpenProjectJsonEvent;
}());
/**
 * event name
 */
OpenProjectJsonEvent.eventName = 'openProjectJson';
module.exports = OpenProjectJsonEvent;
//# sourceMappingURL=openProjectJsonEvent.js.map