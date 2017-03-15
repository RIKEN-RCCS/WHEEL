"use strict";
var fs = require("fs");
var path = require("path");
var logger = require("./logger");
var serverConfig = require("./serverConfig");
var serverUtility = require("./serverUtility");
/**
 *
 */
var CreateNewProjectEvent = (function () {
    function CreateNewProjectEvent() {
        /**
         *
         */
        this.config = serverConfig.getConfig();
    }
    /**
     *
     * @param socket
     */
    CreateNewProjectEvent.prototype.onEvent = function (socket) {
        var _this = this;
        socket.on(CreateNewProjectEvent.eventName, function (directoryPath) {
            var projectFileName = _this.config.system_name;
            var workflowFileName = _this.config.default_filename;
            var projectJson = serverUtility.readTemplateProjectJson();
            var workflowJson = serverUtility.readTemplateWorkflowJson();
            projectJson.path = "./" + projectFileName + _this.config.extension.project;
            projectJson.path_workflow = "./" + workflowFileName + _this.config.extension.workflow;
            projectJson.log.path = path.dirname(projectJson.path_workflow);
            projectJson.log.name = workflowJson.name;
            projectJson.log.description = workflowJson.description;
            workflowJson.path = path.basename(directoryPath);
            var projectFilePath = path.join(directoryPath, projectJson.path);
            var workflowFilePath = path.join(directoryPath, projectJson.path_workflow);
            fs.mkdir(directoryPath, function (mkdirErr) {
                if (mkdirErr) {
                    logger.error(mkdirErr);
                    socket.emit(CreateNewProjectEvent.eventName);
                    return;
                }
                serverUtility.writeJson(projectFilePath, projectJson, function (err) {
                    if (err) {
                        logger.error(err);
                        socket.emit(CreateNewProjectEvent.eventName);
                        return;
                    }
                    serverUtility.writeJson(workflowFilePath, workflowJson, function (err) {
                        if (err) {
                            logger.error(err);
                            socket.emit(CreateNewProjectEvent.eventName);
                            return;
                        }
                        socket.emit(CreateNewProjectEvent.eventName, projectFilePath);
                    });
                });
            });
        });
    };
    return CreateNewProjectEvent;
}());
/**
 * event name
 */
CreateNewProjectEvent.eventName = 'onCreateNewProject';
module.exports = CreateNewProjectEvent;
//# sourceMappingURL=createNewProjectEvent.js.map