/**
 * socket io communication class for gettingfile status
 */
var GetFileStatSocket = (function () {
    /**
     * create new instance
     * @param socket socket io instance
     */
    function GetFileStatSocket(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for connect event that will be invoked a single time before being automatically removed
     * @param filename
     * @param callback The function to call when we get this event
     */
    GetFileStatSocket.prototype.onConnect = function (filename, callback) {
        var _this = this;
        this.socket
            .on('connect', function () {
            _this.emit(filename, callback);
        });
    };
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get this event
     */
    GetFileStatSocket.prototype.onEvent = function (callback) {
        this.socket.once(GetFileStatSocket.eventName, callback);
    };
    /**
     * emit to server for gettingfile status
     * @param filepath
     * @param callback The function to call when we get this event
     */
    GetFileStatSocket.prototype.emit = function (filepath, callback) {
        this.onEvent(callback);
        this.socket.emit(GetFileStatSocket.eventName, filepath);
    };
    /**
     * event name
     */
    GetFileStatSocket.eventName = 'onGetFileStat';
    return GetFileStatSocket;
}());
//# sourceMappingURL=getFileStatSocket.js.map