/**
 * socket io communication class for upload file to server
 */
var UploadFileSocket = (function () {
    /**
     * create new instance
     * @param socket socket io instance
     */
    function UploadFileSocket(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for this event
     * @param callback The function to call when we get the event
     */
    UploadFileSocket.prototype.onEvent = function (callback) {
        this.socket.on(UploadFileSocket.eventName, callback);
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
        fileReader.readAsBinaryString(data.file);
        fileReader.onload = function (eventObject) {
            var result = fileReader.result;
            _this.socket.emit(UploadFileSocket.eventName, data.filepath, fileReader.result);
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