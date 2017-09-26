"use strict";
var logger = require("../logger");
var ServerUtility = require("../serverUtility");
/**
 * socket io communication class for delete host information from server
 */
var DeleteHostEvent = (function () {
    function DeleteHostEvent() {
    }
    /**
     * Adds a listener for this event
     * @param socket socket socket io instance
     */
    DeleteHostEvent.prototype.onEvent = function (socket) {
        socket.on(DeleteHostEvent.eventName, function (name) {
            ServerUtility.deleteHostInfo(name, function (err) {
                if (err) {
                    logger.error(err);
                    socket.emit(DeleteHostEvent.eventName, false);
                }
                else {
                    socket.emit(DeleteHostEvent.eventName, true);
                }
            });
        });
    };
    /**
     * event name
     */
    DeleteHostEvent.eventName = 'onDeleteHost';
    return DeleteHostEvent;
}());
module.exports = DeleteHostEvent;
//# sourceMappingURL=deleteHostEvent.js.map