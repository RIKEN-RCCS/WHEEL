"use strict";
var fs = require("fs");
var logger = require("./logger");
var ProjectOperator = require("./projectOperator");
var ServerConfig = require("./serverConfig");
/**
 * socket io communication class for cleaning project request to server
 */
var CleanProjectvent = (function () {
    function CleanProjectvent() {
        /**
         * plannning state
         */
        this.planningState = ServerConfig.getConfig().state.planning;
    }
    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    CleanProjectvent.prototype.onEvent = function (socket) {
        var _this = this;
        socket.on(CleanProjectvent.eventName, function (projectFilePath) {
            var operator = new ProjectOperator(projectFilePath);
            operator.cleanAsync(function () {
                _this.cleanProject(projectFilePath, function (err) {
                    if (err) {
                        logger.error(err);
                        socket.emit(CleanProjectvent.eventName, false);
                        return;
                    }
                    socket.emit(CleanProjectvent.eventName, true);
                });
            });
        });
    };
    /**
     * clean project json
     * @param projectFilePath project json file path
     * @param callback The function to call when we clean project
     */
    CleanProjectvent.prototype.cleanProject = function (projectFilePath, callback) {
        var _this = this;
        fs.readFile(projectFilePath, function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            var projectJson = JSON.parse(data.toString());
            projectJson.state = _this.planningState;
            _this.cleanLogJson(projectJson.log);
            fs.writeFile(projectFilePath, JSON.stringify(projectJson, null, '\t'), function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                callback();
            });
        });
    };
    /**
     * clearn log json
     * @param logJson log json object
     */
    CleanProjectvent.prototype.cleanLogJson = function (logJson) {
        var _this = this;
        logJson.state = this.planningState;
        logJson.execution_start_date = '';
        logJson.execution_end_date = '';
        logJson.children.forEach(function (child) {
            _this.cleanLogJson(child);
        });
    };
    return CleanProjectvent;
}());
/**
 * event name
 */
CleanProjectvent.eventName = 'cleanProject';
module.exports = CleanProjectvent;
//# sourceMappingURL=cleanProjectEvent.js.map