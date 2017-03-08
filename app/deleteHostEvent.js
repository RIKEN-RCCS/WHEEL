"use strict";
var serverUtility = require("./serverUtility");
var DeleteHostEvent = (function () {
    function DeleteHostEvent() {
    }
    /**
     *
     * @param socket
     */
    DeleteHostEvent.prototype.onEvent = function (socket) {
        socket.on(DeleteHostEvent.eventName, function (label) {
            serverUtility.deleteHostInfo(label, function (remoteHostList) {
                socket.emit(DeleteHostEvent.eventName, true);
            }, function () {
                socket.emit(DeleteHostEvent.eventName, false);
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