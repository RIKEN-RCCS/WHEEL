"use strict";
var fs = require("fs");
var logger = require("../logger");
/**
 * socket io communication class for write file to server
 */
var WriteFileEvent = (function () {
    function WriteFileEvent() {
    }
    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    WriteFileEvent.prototype.onEvent = function (socket) {
        socket.on(WriteFileEvent.eventName, function (filepath, data) {
            fs.writeFile(filepath, data, function (err) {
                if (err) {
                    logger.error(err);
                    socket.emit(WriteFileEvent.eventName, false);
                    return;
                }
                socket.emit(WriteFileEvent.eventName, true);
            });
        });
    };
    return WriteFileEvent;
}());
/**
 * event name
 */
WriteFileEvent.eventName = 'writeFile';
module.exports = WriteFileEvent;
//# sourceMappingURL=writeFileEvent.js.map