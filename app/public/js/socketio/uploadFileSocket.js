/**
 * socket io communication class for upload file to server
 */
var UploadFileSocket = (function () {
    /**
     * create new instance
     * @param socket socket io instance
     */
    function UploadFileSocket(socket) {
        /**
         * upload file data
         */
        this.upload = {};
        /**
         * max send size (kb)
         */
        this.maxSendSize = 1 * 1024 * 1024;
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
        this.socket = socket;
    }
    /**
     * Adds a listener for this event
     * @param callback The function to call when we get the event
     */
    UploadFileSocket.prototype.onEvent = function (callback) {
        var _this = this;
        this.socket.on(this.doneEventName, function (isUpload, filepath) {
            delete _this.upload[filepath];
            callback(isUpload, filepath);
        });
        this.socket.on(this.startEventName, function (place, filepath) {
            var data = _this.upload[filepath];
            var newFile = data.file.slice(place, place + Math.min(_this.maxSendSize, data.file.size - place));
            data.fileReader.readAsBinaryString(newFile);
        });
    };
    /**
     * remove all listeners on this socket
     */
    UploadFileSocket.prototype.offEvent = function () {
        this.socket.removeAllListeners();
    };
    /**
     * emit to server for upload file
     * @param data uplodad file data
     */
    UploadFileSocket.prototype.emit = function (data) {
        var _this = this;
        var fileReader = new FileReader();
        this.upload[data.filepath] = {
            file: data.file,
            filepath: data.filepath,
            fileReader: fileReader
        };
        fileReader.onload = function (e) {
            _this.socket.emit(_this.startEventName, data.filepath, e.target.result);
        };
        this.socket.emit(this.readyEventName, data.filepath, data.file.size);
    };
    return UploadFileSocket;
}());
//# sourceMappingURL=uploadFileSocket.js.map