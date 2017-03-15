"use strict";
var logger = require("./logger");
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
            swfUtility.getHostInfo(function (err, hostList) {
                if (err) {
                    logger.error(err);
                    socket.emit(GetRemoteHostListEvent.eventName);
                }
                else if (!hostList) {
                    logger.error('host list does not exist');
                    socket.emit(GetRemoteHostListEvent.eventName);
                }
                else {
                    socket.json.emit(GetRemoteHostListEvent.eventName, hostList);
                }
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