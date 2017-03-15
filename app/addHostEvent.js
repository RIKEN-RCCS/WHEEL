"use strict";
var logger = require("./logger");
var serverUtility = require("./serverUtility");
/**
 *
 */
var AddHostEvent = (function () {
    function AddHostEvent() {
    }
    /**
     *
     * @param socket
     */
    AddHostEvent.prototype.onEvent = function (socket) {
        socket.on(AddHostEvent.eventName, function (hostInfo) {
            serverUtility.addHostInfo(hostInfo, function (err) {
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
    return AddHostEvent;
}());
/**
 * event name
 */
AddHostEvent.eventName = 'onAddHost';
module.exports = AddHostEvent;
//# sourceMappingURL=addHostEvent.js.map