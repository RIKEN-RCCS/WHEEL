"use strict";
var logger = require("../logger");
var ServerUtility = require("../serverUtility");
/**
 * socket io communication class for getting host information from server
 */
var GetRemoteHostListEvent = (function () {
    function GetRemoteHostListEvent() {
    }
    /**
     * Adds a listener for connect event
     * @param socket socket io instance
     */
    GetRemoteHostListEvent.prototype.onEvent = function (socket) {
        socket.on(GetRemoteHostListEvent.eventName, function () {
            ServerUtility.getHostInfo(function (err, hostList) {
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