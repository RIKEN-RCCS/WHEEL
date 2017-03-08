"use strict";
var fs = require("fs");
var logger = require("./logger");
var serverConfig = require("./serverConfig");
var OpenTaskJsonEvent = (function () {
    function OpenTaskJsonEvent() {
        /**
         * config parameter
         */
        this.config = serverConfig.getConfig();
        /**
         *
         */
        this.swfExtension = this.config.extension.workflow;
        /**
         *
         */
        this.taskExtension = this.config.extension.task;
    }
    /**
     * @param socket:
     * @return none
     */
    OpenTaskJsonEvent.prototype.onEvent = function (socket) {
        var _this = this;
        socket.on(OpenTaskJsonEvent.eventName, function (taskJsonFilePath) {
            if (!taskJsonFilePath.match(new RegExp("(?:" + _this.swfExtension + "|" + _this.taskExtension + ")$"))) {
                socket.emit(OpenTaskJsonEvent.eventName);
            }
            fs.readFile(taskJsonFilePath, function (err, data) {
                if (err) {
                    logger.error(err);
                    socket.emit(OpenTaskJsonEvent.eventName);
                    return;
                }
                socket.json.emit(OpenTaskJsonEvent.eventName, JSON.parse(data.toString()));
            });
        });
    };
    return OpenTaskJsonEvent;
}());
/**
 * event name
 */
OpenTaskJsonEvent.eventName = 'openTaskJson';
module.exports = OpenTaskJsonEvent;
//# sourceMappingURL=openTaskJsonEvent.js.map