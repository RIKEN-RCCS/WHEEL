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
        this.extension = this.config.extension;
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
                        var projectJson = ServerUtility.readProjectJson(path_project);
                        if (projectJson.state === 'Planning') {
                            _this.createProjectJson(path_project, projectJson, socket);
                        }
                        else {
                            _this.updateProjectJson(path_project, projectJson, socket);
                        }
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
     * @param path_project
     * @param projectJson
     * @param socket
     */
    OpenProjectJsonEvent.prototype.createProjectJson = function (path_project, projectJson, socket) {
        var dir_project = path.dirname(path_project);
        var path_workflow = path.resolve(dir_project, projectJson.path_workflow);
        projectJson.log = ServerUtility.createLogJson(path_workflow);
        ServerUtility.writeJson(path_project, projectJson, function () {
            socket.json.emit(OpenProjectJsonEvent.eventName, projectJson);
        }, function () {
            socket.json.emit(OpenProjectJsonEvent.eventName);
        });
    };
    /**
     *
     * @param path_project
     * @param projectJson
     * @param socket
     */
    OpenProjectJsonEvent.prototype.updateProjectJson = function (path_project, projectJson, socket) {
        projectJson.log = ServerUtility.readLogJson(projectJson.log);
        ServerUtility.writeJson(path_project, projectJson, function () {
            socket.json.emit(OpenProjectJsonEvent.eventName, projectJson);
        }, function () {
            socket.json.emit(OpenProjectJsonEvent.eventName);
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