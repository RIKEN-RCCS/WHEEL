"use strict";
var fs = require("fs");
var logger = require("../logger");
/**
 * socket io communication class for read file data from server
 */
var ReadFileEvent = (function () {
    function ReadFileEvent() {
    }
    /**
     * Adds a listener for this event
     * @param socket socket socket io instance
     */
    ReadFileEvent.prototype.onEvent = function (socket) {
        socket.on(ReadFileEvent.eventName, function (readFilePath) {
            fs.readFile(readFilePath, function (err, data) {
                if (err) {
                    logger.error(err);
                    socket.emit(ReadFileEvent.eventName);
                    return;
                }
                socket.emit(ReadFileEvent.eventName, data.toString());
            });
        });
    };
    /**
     * event name
     */
    ReadFileEvent.eventName = 'readFile';
    return ReadFileEvent;
}());
module.exports = ReadFileEvent;
//# sourceMappingURL=readFileEvent.js.map