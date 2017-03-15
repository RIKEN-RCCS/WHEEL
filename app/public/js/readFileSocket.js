var ReadFileSocket = (function () {
    /**
     * create new instance
     * @param socket
     */
    function ReadFileSocket(socket) {
        this.socket = socket;
    }
    /**
     *
     * @param filepath
     * @param callback
     */
    ReadFileSocket.prototype.onConnect = function (filepath, callback) {
        var _this = this;
        this.callback = callback;
        this.socket
            .on('connect', function () {
            _this.emit(filepath);
        });
    };
    /**
     *
     */
    ReadFileSocket.prototype.onEvent = function () {
        var _this = this;
        this.socket.once(ReadFileSocket.eventName, function (data) {
            _this.callback(data);
        });
    };
    /**
     *
     * @param editFilePath
     */
    ReadFileSocket.prototype.emit = function (editFilePath) {
        this.onEvent();
        this.socket.emit(ReadFileSocket.eventName, editFilePath);
    };
    return ReadFileSocket;
}());
/**
 * event name
 */
ReadFileSocket.eventName = 'readFile';
//# sourceMappingURL=readFileSocket.js.map