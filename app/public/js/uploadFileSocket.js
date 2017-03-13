/**
 *
 */
var UploadFileSocket = (function () {
    /**
     * create new instance
     * @param socket
     */
    function UploadFileSocket(socket) {
        this.socket = socket;
    }
    /**
     *
     * @param callback
     */
    UploadFileSocket.prototype.onEvent = function (callback) {
        this.socket.once(UploadFileSocket.eventName, callback);
    };
    /**
     *
     * @param file
     * @param filepath
     * @param callback
     */
    UploadFileSocket.prototype.emit = function (data, callback) {
        var _this = this;
        this.onEvent(callback);
        var fileReader = new FileReader();
        fileReader.readAsBinaryString(data.file);
        fileReader.onload = function (eventObject) {
            var result = fileReader.result;
            _this.socket.emit(UploadFileSocket.eventName, data.path, fileReader.result);
        };
        fileReader.onerror = function (err) {
            console.error(err);
        };
    };
    return UploadFileSocket;
}());
/**
 * event name
 */
UploadFileSocket.eventName = 'onUploadFile';
//# sourceMappingURL=uploadFileSocket.js.map