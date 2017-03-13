"use strict";
var fs = require("fs");
var logger = require("./logger");
var UploadFileEvent = (function () {
    function UploadFileEvent() {
    }
    /**
     *
     * @param socket
     */
    UploadFileEvent.prototype.onEvent = function (socket) {
        socket.on(UploadFileEvent.eventName, function (path, data) {
            var writeStream = fs.createWriteStream(path);
            writeStream
                .on('error', function (err) {
                logger.error(err);
                socket.emit(UploadFileEvent.eventName, false);
            })
                .on('close', function (err) {
                logger.info("upload file=" + path);
                socket.emit(UploadFileEvent.eventName, true);
            });
            writeStream.write(data, 'binary');
            writeStream.end();
        });
    };
    return UploadFileEvent;
}());
/**
 * event name
 */
UploadFileEvent.eventName = 'onUploadFile';
module.exports = UploadFileEvent;
//# sourceMappingURL=uploadFileEvent.js.map