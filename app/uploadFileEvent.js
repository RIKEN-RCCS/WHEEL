"use strict";
var fs = require("fs");
var path = require("path");
var logger = require("./logger");
var UploadFileEvent = (function () {
    function UploadFileEvent() {
    }
    /**
     *
     * @param socket
     */
    UploadFileEvent.prototype.onEvent = function (socket) {
        socket.on(UploadFileEvent.eventName, function (filepath, data) {
            var writeStream = fs.createWriteStream(filepath);
            writeStream
                .on('error', function (err) {
                logger.error(err);
                socket.emit(UploadFileEvent.eventName, false);
            })
                .on('close', function (err) {
                logger.info("upload file=" + filepath);
                socket.emit(UploadFileEvent.eventName, true, path.basename(filepath));
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