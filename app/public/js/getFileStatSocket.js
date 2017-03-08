/**
 *
 */
var GetFileStatSocket = (function () {
    /**
     * create new instance
     * @param socket
     */
    function GetFileStatSocket(socket) {
        this.socket = socket;
    }
    /**
     *
     * @param filename
     * @param callback
     */
    GetFileStatSocket.prototype.onConnect = function (filename, callback) {
        var _this = this;
        this.socket
            .on('connect', function () {
            _this.emit(filename, callback);
        });
    };
    /**
     *
     * @param callback
     */
    GetFileStatSocket.prototype.onEvent = function (callback) {
        this.socket.once(GetFileStatSocket.eventName, callback);
    };
    /**
     *
     * @param filepath
     * @param callback
     */
    GetFileStatSocket.prototype.emit = function (filepath, callback) {
        this.onEvent(callback);
        this.socket.emit(GetFileStatSocket.eventName, filepath);
    };
    return GetFileStatSocket;
}());
/**
 * event name
 */
GetFileStatSocket.eventName = 'onGetFileStat';
//# sourceMappingURL=getFileStatSocket.js.map