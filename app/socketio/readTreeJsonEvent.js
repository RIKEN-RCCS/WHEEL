"use strict";
var path = require("path");
var logger = require("../logger");
var ServerUtility = require("../serverUtility");
/**
 * socket io communication class for read tree json from server
 */
var ReadTreeJsonEvent = (function () {
    function ReadTreeJsonEvent() {
    }
    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    ReadTreeJsonEvent.prototype.onEvent = function (socket) {
        socket.on(ReadTreeJsonEvent.eventName, function (workflowJsonFilePath) {
            var roodDirectory = path.dirname(workflowJsonFilePath);
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