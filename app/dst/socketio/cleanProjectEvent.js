"use strict";
var fs = require("fs");
var logger = require("../logger");
var ProjectOperator = require("../projectOperator");
var SwfState = require("../swfState");
/**
 * socket io communication class for cleaning project request to server
 */
var CleanProjectvent = (function () {
    function CleanProjectvent() {
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
        fs.readFile(projectFilePath, function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            var projectJson = JSON.parse(data.toString());
            projectJson.state = SwfState.PLANNING;
            fs.writeFile(projectFilePath, JSON.stringify(projectJson, null, '\t'), function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                callback();
            });
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