"use strict";
var logger = require("../logger");
var ServerUtility = require("../serverUtility");
/**
 * socket io communication class for delete directory from server
 */
var DeleteDirectoryEvent = (function () {
    function DeleteDirectoryEvent() {
    }
    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    DeleteDirectoryEvent.prototype.onEvent = function (socket) {
        socket.on(DeleteDirectoryEvent.eventName, function (directorys) {
            (function loop() {
                var directory = directorys.shift();
                if (!directory) {
                    socket.emit(DeleteDirectoryEvent.eventName);
                    return;
                }
                ServerUtility.unlinkDirectoryAsync(directory, function (err) {
                    if (!err) {
                        logger.info("delete  dir=" + directory);
                    }
                    loop();
                });
            })();
        });
    };
    return DeleteDirectoryEvent;
}());
/**
 * event name
 */
DeleteDirectoryEvent.eventName = 'onDeleteDirectory';
module.exports = DeleteDirectoryEvent;
//# sourceMappingURL=deleteDirectoryEvent.js.map