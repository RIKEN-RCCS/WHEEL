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
        this.socket.on(UploadFileSocket.eventName, callback);
    };
    /**
     *
     */
    UploadFileSocket.prototype.offEvent = function () {
        this.socket.removeAllListeners(UploadFileSocket.eventName);
    };
    /**
     *
     * @param file
     */
    UploadFileSocket.prototype.emit = function (data) {
        var _this = this;
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