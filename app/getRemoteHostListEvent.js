"use strict";
var swfUtility = require("./serverUtility");
/**
 *
 */
var GetRemoteHostListEvent = (function () {
    function GetRemoteHostListEvent() {
    }
    /**
     *
     * @param socket
     */
    GetRemoteHostListEvent.prototype.onEvent = function (socket) {
        socket.on(GetRemoteHostListEvent.eventName, function () {
            swfUtility.getHostInfo(function (hostList) {
                socket.json.emit(GetRemoteHostListEvent.eventName, hostList);
            }, function () {
                socket.emit(GetRemoteHostListEvent.eventName);
            });
        });
    };
    return GetRemoteHostListEvent;
}());
/**
 * event name
 */
GetRemoteHostListEvent.eventName = 'onGetRemoteHostList';
module.exports = GetRemoteHostListEvent;
//# sourceMappingURL=getRemoteHostListEvent.js.map