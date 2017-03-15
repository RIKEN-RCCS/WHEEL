"use strict";
var fs = require("fs");
/**
 *
 */
var GetFileStatEvent = (function () {
    function GetFileStatEvent() {
    }
    /**
     *
     * @param socket
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