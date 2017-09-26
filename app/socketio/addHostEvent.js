"use strict";
var logger = require("../logger");
var ServerUtility = require("../serverUtility");
/**
 * socket io communication class for addidg host informattion to server
 */
var AddHostEvent = (function () {
    function AddHostEvent() {
    }
    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    AddHostEvent.prototype.onEvent = function (socket) {
        socket.on(AddHostEvent.eventName, function (hostInfo) {
            ServerUtility.addHostInfo(hostInfo, function (err) {
                if (err) {
                    logger.error(err);
                    socket.emit(AddHostEvent.eventName, false);
                }
                else {
                    socket.emit(AddHostEvent.eventName, true);
                }
            });
        });
    };
    /**
     * event name
     */
    AddHostEvent.eventName = 'onAddHost';
    return AddHostEvent;
}());
module.exports = AddHostEvent;
//# sourceMappingURL=addHostEvent.js.map