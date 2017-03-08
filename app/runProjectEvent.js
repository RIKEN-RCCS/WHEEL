"use strict";
var ProjectOperator = require("./projectOperator");
var RunProjectEvent = (function () {
    function RunProjectEvent() {
    }
    /**
     * @param socket:
     * @return none
     */
    RunProjectEvent.prototype.onEvent = function (socket) {
        socket.on(RunProjectEvent.eventName, function (swfFilePath) {
            var projectOperator = new ProjectOperator(swfFilePath);
            projectOperator.run();
            socket.emit(RunProjectEvent.eventName, "Running");
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