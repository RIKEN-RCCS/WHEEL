"use strict";
var fs = require("fs");
var logger = require("./logger");
var ServerConfig = require("./serverConfig");
var ProjectOperator = require("./projectOperator");
/**
 * socket io communication class for run project to server
 */
var RunProjectEvent = (function () {
    function RunProjectEvent() {
        /**
         * running state
         */
        this.runningState = ServerConfig.getConfig().state.running;
    }
    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    RunProjectEvent.prototype.onEvent = function (socket) {
        var _this = this;
        socket.on(RunProjectEvent.eventName, function (projectFilepath, host_passSet) {
            _this.updateProjectJson(projectFilepath, function (err) {
                if (err) {
                    logger.error(err);
                    socket.emit(RunProjectEvent.eventName, false);
                    return;
                }
                var projectOperator = new ProjectOperator(projectFilepath);
                projectOperator.run(host_passSet);
                socket.emit(RunProjectEvent.eventName, true);
            });
        });
    };
    /**
     * update project json data
     * @param projectFilepath project json file path
     * @param callback The function to call when we have finished update
     */
    RunProjectEvent.prototype.updateProjectJson = function (projectFilepath, callback) {
        var _this = this;
        fs.readFile(projectFilepath, function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            var projectJson = JSON.parse(data.toString());
            projectJson.state = _this.runningState;
            fs.writeFile(projectFilepath, JSON.stringify(projectJson, null, '\t'), function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                callback();
            });
        });
    };
    return RunProjectEvent;
}());
/**
 * event name
 */
RunProjectEvent.eventName = 'onRunProject';
module.exports = RunProjectEvent;
//# sourceMappingURL=runProjectEvent.js.map