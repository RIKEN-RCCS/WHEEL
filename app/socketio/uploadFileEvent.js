"use strict";
var fs = require("fs");
var path = require("path");
var logger = require("../logger");
/**
 * socket io communication class for upload file to server
 */
var UploadFileEvent = (function () {
    function UploadFileEvent() {
        /**
         * upload file data
         */
        this.upload = {};
        /**
         * write threshold size (kb)
         */
        this.writeThreshold = 32 * 1024 * 1024;
        /**
         * upload ready event
         */
        this.readyEventName = 'onUploadReady';
        /**
         * upload start event
         */
        this.startEventName = 'onUploadStart';
        /**
         * upload done event
         */
        this.doneEventName = 'onUploadDone';
    }
    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    UploadFileEvent.prototype.onEvent = function (socket) {
        var _this = this;
        var openFile = function (filepath, size) {
            fs.open(filepath, 'a', 755, function (err, fd) {
                if (err) {
                    logger.error(err);
                    socket.emit(_this.doneEventName, false, filepath);
                    return;
                }
                _this.upload[filepath] = {
                    uploaded: 0,
                    size: size,
                    data: '',
                    handler: fd
                };
                socket.emit(_this.startEventName, _this.upload[filepath].uploaded, filepath);
            });
        };
        var closeFile = function (filepath, isSucceed) {
            var file = _this.upload[filepath];
            fs.close(file.handler, function (err) {
                if (err) {
                    logger.error(err);
                    socket.emit(_this.doneEventName, isSucceed, filepath);
                    delete _this.upload.filepath;
                }
                else {
                    fs.chmod(filepath, '664', function (err) {
                        if (err) {
                            logger.error(err);
                        }
                        socket.emit(_this.doneEventName, isSucceed, filepath);
                        delete _this.upload.filepath;
                    });
                }
            });
        };
        var appendFile = function (filepath, callback) {
            var file = _this.upload[filepath];
            fs.write(file.handler, file.data, null, 'Binary', function (err, witten, str) {
                logger.info("progress:" + path.basename(filepath) + ":" + file.uploaded + "/" + file.size);
                if (err) {
                    logger.error(err);
                    closeFile(filepath, false);
                    return;
                }
                file.data = '';
                if (callback) {
                    callback();
                }
            });
        };
        socket
            .on(this.startEventName, function (filepath, data) {
            var file = _this.upload[filepath];
            file.uploaded += data.length;
            file.data += data;
            if (file.uploaded !== file.size) {
                if (file.data.length >= _this.writeThreshold) {
                    appendFile(filepath);
                }
                socket.emit(_this.startEventName, file.uploaded, filepath);
            }
            else {
                appendFile(filepath, function () {
                    closeFile(filepath, true);
                    logger.info("upload file=" + filepath);
                });
            }
        })
            .on(this.readyEventName, function (filepath, size) {
            fs.unlink(filepath, function (err) {
                openFile(filepath, size);
            });
        });
    };
    return UploadFileEvent;
}());
module.exports = UploadFileEvent;
//# sourceMappingURL=uploadFileEvent.js.map