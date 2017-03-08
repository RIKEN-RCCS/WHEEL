"use strict";
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
            serverUtility.addHostInfo(hostInfo, function (remoteHostList) {
                socket.emit(AddHostEvent.eventName, true);
            }, function () {
                socket.emit(AddHostEvent.eventName, false);
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