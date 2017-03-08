"use strict";
var fs = require("fs");
var path = require("path");
var logger = require("./logger");
var ServerUtility = require("./serverUtility");
var serverConfig = require("./serverConfig");
var OpenProjectJsonEvent = (function () {
    function OpenProjectJsonEvent() {
        /**
         * config parameter
         */
        this.config = serverConfig.getConfig();
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
                        // logger.error(err);
                        // TODO TSURUTA create template project.
                        var createJson = ServerUtility.createProjectJson(path_project);
                        socket.json.emit(OpenProjectJsonEvent.eventName, createJson);
                        _this.writeProjectJsonFile(path_project, createJson);
                    }
                    else {
                        var projectJson = ServerUtility.readProjectJson(path_project);
                        if (projectJson.state === 'Planning') {
                            // update log
                            var dir_project = path.dirname(path_project);
                            var path_workflow = path.resolve(dir_project, projectJson.path_workflow);
                            projectJson.log = ServerUtility.createLogJson(path_workflow);
                            _this.writeProjectJsonFile(path_project, projectJson);
                        }
                        socket.json.emit(OpenProjectJsonEvent.eventName, projectJson);
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
     * create project json file
     * @param workflowJsonFile most parent json file name
     * @param json created json file
     */
    OpenProjectJsonEvent.prototype.writeProjectJsonFile = function (path_project, json) {
        if (json == null) {
            return;
        }
        fs.writeFile(path_project, JSON.stringify(json, null, '\t'), function (err) {
            if (err) {
                logger.error(err);
            }
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