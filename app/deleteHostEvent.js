"use strict";
var logger = require("./logger");
var serverUtility = require("./serverUtility");
/**
 *
 */
var DeleteHostEvent = (function () {
    function DeleteHostEvent() {
    }
    /**
     *
     * @param socket
     */
    DeleteHostEvent.prototype.onEvent = function (socket) {
        socket.on(DeleteHostEvent.eventName, function (label) {
            serverUtility.deleteHostInfo(label, function (err) {
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
    return DeleteHostEvent;
}());
/**
 * event name
 */
DeleteHostEvent.eventName = 'onDeleteHost';
module.exports = DeleteHostEvent;
//# sourceMappingURL=deleteHostEvent.js.map