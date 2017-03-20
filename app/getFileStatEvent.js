"use strict";
var fs = require("fs");
/**
 * socket io communication class for gettingfile status
 */
var GetFileStatEvent = (function () {
    function GetFileStatEvent() {
    }
    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    GetFileStatEvent.prototype.onEvent = function (socket) {
        socket.on(GetFileStatEvent.eventName, function (filepath) {
            fs.stat(filepath, function (err, stats) {
                if (err) {
                    // logger.error(err);
                    socket.emit(GetFileStatEvent.eventName);
                }
                else {
                    socket.json.emit(GetFileStatEvent.eventName, stats);
                }
            });
        });
    };
    return GetFileStatEvent;
}());
/**
 * event name
 */
GetFileStatEvent.eventName = 'onGetFileStat';
module.exports = GetFileStatEvent;
//# sourceMappingURL=getFileStatEvent.js.map