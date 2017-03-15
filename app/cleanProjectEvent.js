"use strict";
var fs = require("fs");
var logger = require("./logger");
var ProjectOperator = require("./projectOperator");
var ServerConfig = require("./serverConfig");
/**
 *
 */
var CleanProjectvent = (function () {
    function CleanProjectvent() {
        /**
         *
         */
        this.state = ServerConfig.getConfig().state.planning;
    }
    /**
     *
     * @param socket
     */
    CleanProjectvent.prototype.onEvent = function (socket) {
        var _this = this;
        socket.on(CleanProjectvent.eventName, function (projectFilePath) {
            var operator = new ProjectOperator(projectFilePath);
            operator.clean();
            _this.cleanupProject(projectFilePath, function (err) {
                if (err) {
                    logger.error(err);
                    socket.emit(CleanProjectvent.eventName, false);
                    return;
                }
                socket.emit(CleanProjectvent.eventName, true);
            });
        });
    };
    /**
     *
     * @param projectFilePath
     * @param callback
     */
    CleanProjectvent.prototype.cleanupProject = function (projectFilePath, callback) {
        var _this = this;
        fs.readFile(projectFilePath, function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            var projectJson = JSON.parse(data.toString());
            projectJson.state = _this.state;
            _this.cleanupLogJson(projectJson.log);
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
     *
     * @param json
     */
    CleanProjectvent.prototype.cleanupLogJson = function (logJson) {
        var _this = this;
        logJson.state = this.state;
        logJson.execution_start_date = '';
        logJson.execution_end_date = '';
        logJson.children.forEach(function (child) {
            _this.cleanupLogJson(child);
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