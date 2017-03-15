"use strict";
var fs = require("fs");
var path = require("path");
var logger = require("./logger");
var ServerConfig = require("./serverConfig");
var ServerUtility = require("./serverUtility");
var ProjectOperator = require("./projectOperator");
/**
 *
 */
var RunProjectEvent = (function () {
    function RunProjectEvent() {
        /**
         *
         */
        this.config = ServerConfig.getConfig();
    }
    /**
     * @param socket
     */
    RunProjectEvent.prototype.onEvent = function (socket) {
        var _this = this;
        socket.on(RunProjectEvent.eventName, function (swfFilePath, host_passSet) {
            // TODDO set password and passphrase
            _this.updateProjectJson(swfFilePath, function (err) {
                if (err) {
                    logger.error(err);
                    socket.emit(RunProjectEvent.eventName, false);
                    return;
                }
                var projectOperator = new ProjectOperator(swfFilePath);
                projectOperator.run(host_passSet);
                socket.emit(RunProjectEvent.eventName, true);
            });
        });
    };
    /**
     *
     * @param filepath
     * @param callback
     */
    RunProjectEvent.prototype.updateProjectJson = function (filepath, callback) {
        var _this = this;
        fs.readFile(filepath, function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            var projectJson = JSON.parse(data.toString());
            projectJson.state = _this.config.state.running;
            _this.updateLogJson(projectJson.log);
            fs.writeFile(filepath, JSON.stringify(projectJson, null, '\t'), function (err) {
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
     * @param logJson
     */
    RunProjectEvent.prototype.updateLogJson = function (logJson) {
        var _loop_1 = function (index) {
            var child = logJson.children[index];
            if (!ServerUtility.IsTypeLoop(child)) {
                this_1.updateLogJson(child);
                return "continue";
            }
            var loopFilename = ServerUtility.getDefaultName(child.type);
            var loopJsonFilepath = path.join(child.path, loopFilename);
            try {
                var data = fs.readFileSync(loopJsonFilepath);
                var loopJson = JSON.parse(data.toString());
                var forParam = loopJson.forParam;
                var newChildren = [];
                for (var loop = forParam.start; loop <= forParam.end; loop += forParam.step) {
                    var newLoop = {
                        name: child.name + "[" + loop + "]",
                        path: child.path + "[" + loop + "]",
                        description: child.description,
                        type: child.type,
                        state: child.state,
                        execution_start_date: '',
                        execution_end_date: '',
                        children: JSON.parse(JSON.stringify(child.children))
                    };
                    newChildren.push(newLoop);
                }
                logJson.children.splice(index, 1);
                newChildren.reverse().forEach(function (newChild) {
                    logJson.children.splice(index, 0, newChild);
                });
            }
            catch (err) {
                logger.error(err);
            }
            this_1.updateLogJson(child);
        };
        var this_1 = this;
        for (var index = logJson.children.length - 1; index >= 0; index--) {
            _loop_1(index);
        }
    };
    return RunProjectEvent;
}());
/**
 * event name
 */
RunProjectEvent.eventName = 'onRunProject';
module.exports = RunProjectEvent;
//# sourceMappingURL=runProjectEvent.js.map