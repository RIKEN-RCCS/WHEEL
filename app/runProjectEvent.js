"use strict";
var ServerUtility = require("./serverUtility");
var ProjectOperator = require("./projectOperator");
/**
 *
 */
var RunProjectEvent = (function () {
    function RunProjectEvent() {
    }
    /**
     * @param socket
     */
    RunProjectEvent.prototype.onEvent = function (socket) {
        socket.on(RunProjectEvent.eventName, function (swfFilePath, host_passSet) {
            var projectOperator = new ProjectOperator(swfFilePath);
            // TODDO set password and passphrase
            projectOperator.run(host_passSet);
            ServerUtility.updateProjectJsonState(swfFilePath, 'Running', function () {
                socket.emit(RunProjectEvent.eventName, true);
            }, function () {
                socket.emit(RunProjectEvent.eventName, false);
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