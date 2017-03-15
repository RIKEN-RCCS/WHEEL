"use strict";
var fs = require("fs");
var path = require("path");
var logger = require("./logger");
var ServerUtility = require("./serverUtility");
var ServerConfig = require("./serverConfig");
var OpenProjectJsonEvent = (function () {
    function OpenProjectJsonEvent() {
        /**
         * config parameter
         */
        this.config = ServerConfig.getConfig();
        /**
         *
         */
        this.queue = [];
    }
    /**
     *
     * @param socket
     */
    OpenProjectJsonEvent.prototype.onEvent = function (socket) {
        var _this = this;
        socket.on(OpenProjectJsonEvent.eventName, function (path_project) {
            fs.readFile(path_project, function (err, data) {
                try {
                    if (err) {
                    }
                    else {
                        var projectJson_1 = ServerUtility.readProjectJson(path_project);
                        if (projectJson_1.state === _this.config.state.planning) {
                            _this.createProjectJson(path_project, projectJson_1, socket);
                            return;
                        }
                        _this.queue.length = 0;
                        _this.setQueue(projectJson_1.log);
                        _this.updateLogJson(function () {
                            projectJson_1.state = projectJson_1.log.state;
                            ServerUtility.writeJson(path_project, projectJson_1, function (err) {
                                if (err) {
                                    logger.error(err);
                                    socket.json.emit(OpenProjectJsonEvent.eventName);
                                    return;
                                }
                                socket.json.emit(OpenProjectJsonEvent.eventName, projectJson_1);
                            });
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
     *
     * @param json
     */
    OpenProjectJsonEvent.prototype.setQueue = function (json) {
        var _this = this;
        this.queue.push(json);
        if (json.children) {
            json.children.forEach(function (child) {
                _this.setQueue(child);
            });
        }
    };
    /**
     *
     * @param callback
     */
    OpenProjectJsonEvent.prototype.updateLogJson = function (callback) {
        var _this = this;
        var json = this.queue.shift();
        if (!json) {
            callback();
            return;
        }
        var logFilePath = path.join(json.path, this.config.system_name + ".log");
        fs.readFile(logFilePath, function (err, data) {
            if (!err) {
                var readJson = JSON.parse(data.toString());
                json.state = readJson.state;
                json.execution_start_date = readJson.execution_start_date;
                json.execution_end_date = readJson.execution_end_date;
            }
            _this.updateLogJson(callback);
        });
    };
    /**
     *
     * @param path_project
     * @param projectJson
     * @param socket
     */
    OpenProjectJsonEvent.prototype.createProjectJson = function (path_project, projectJson, socket) {
        var dir_project = path.dirname(path_project);
        var path_workflow = path.resolve(dir_project, projectJson.path_workflow);
        projectJson.log = ServerUtility.createLogJson(path_workflow);
        ServerUtility.writeJson(path_project, projectJson, function (err) {
            if (err) {
                logger.error(err);
                socket.json.emit(OpenProjectJsonEvent.eventName);
                return;
            }
            socket.json.emit(OpenProjectJsonEvent.eventName, projectJson);
        });
    };
    return OpenProjectJsonEvent;
}());
/**
 * event name
 */
OpenProjectJsonEvent.eventName = 'openProjectJson';
module.exports = OpenProjectJsonEvent;
//# sourceMappingURL=openProjectJsonEvent.js.map