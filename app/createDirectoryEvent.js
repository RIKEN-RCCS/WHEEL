"use strict";
var fs = require("fs");
var logger = require("./logger");
var CreateDirectoryEvent = (function () {
    function CreateDirectoryEvent() {
    }
    /**
     *
     * @param socket
     */
    CreateDirectoryEvent.prototype.onEvent = function (socket) {
        socket.on(CreateDirectoryEvent.eventName, function (directoryPath) {
            logger.info("create directory=" + directoryPath);
            fs.mkdir(directoryPath, function (err) {
                if (err) {
                    logger.error(err);
                    socket.emit(CreateDirectoryEvent.eventName, false);
                }
                else {
                    socket.emit(CreateDirectoryEvent.eventName, true);
                }
            });
        });
    };
    return CreateDirectoryEvent;
}());
/**
 * event name
 */
CreateDirectoryEvent.eventName = 'onCreateDirectory';
module.exports = CreateDirectoryEvent;
//# sourceMappingURL=createDirectoryEvent.js.map