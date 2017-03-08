"use strict";
var path = require("path");
var logger = require("./logger");
var ServerUtility = require("./serverUtility");
var ReadTreeJsonEvent = (function () {
    function ReadTreeJsonEvent() {
    }
    /**
     *
     * @param socket
     */
    ReadTreeJsonEvent.prototype.onEvent = function (socket) {
        var _this = this;
        socket.on(ReadTreeJsonEvent.eventName, function (workflowJsonFilePath) {
            _this.roodDirectory = path.dirname(workflowJsonFilePath);
            try {
                logger.debug("tree json=" + workflowJsonFilePath);
                var createJsonFile = ServerUtility.createTreeJson(workflowJsonFilePath);
                socket.json.emit(ReadTreeJsonEvent.eventName, createJsonFile);
            }
            catch (error) {
                logger.error(error);
                socket.emit(ReadTreeJsonEvent.eventName);
            }
        });
    };
    return ReadTreeJsonEvent;
}());
/**
 * event name
 */
ReadTreeJsonEvent.eventName = 'readTreeJson';
module.exports = ReadTreeJsonEvent;
//# sourceMappingURL=readTreeJsonEvent.js.map