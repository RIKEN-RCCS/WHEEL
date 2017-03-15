"use strict";
var fs = require("fs");
var logger = require("./logger");
var ReadFileEvent = (function () {
    function ReadFileEvent() {
    }
    /**
     *
     * @param socket
     */
    ReadFileEvent.prototype.onEvent = function (socket) {
        socket.on(ReadFileEvent.eventName, function (editFilePath) {
            fs.readFile(editFilePath, function (err, data) {
                if (err) {
                    logger.error(err);
                    socket.emit(ReadFileEvent.eventName);
                    return;
                }
                socket.emit(ReadFileEvent.eventName, data);
            });
        });
    };
    return ReadFileEvent;
}());
/**
 * event name
 */
ReadFileEvent.eventName = 'readFile';
module.exports = ReadFileEvent;
//# sourceMappingURL=readFileEvent.js.map