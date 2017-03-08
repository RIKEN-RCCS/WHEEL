var ReadTreeJsonSocket = (function () {
    /**
     * create new instance
     * @param socket
     */
    function ReadTreeJsonSocket(socket) {
        this.socket = socket;
    }
    /**
     *
     * @param filepath
     * @param callback
     */
    ReadTreeJsonSocket.prototype.onConnect = function (filepath, callback) {
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
    ReadTreeJsonSocket.prototype.onEvent = function () {
        var _this = this;
        this.socket.once(ReadTreeJsonSocket.eventName, function (treeJson) {
            _this.callback(treeJson);
        });
    };
    /**
     *
     * @param filepath
     */
    ReadTreeJsonSocket.prototype.emit = function (filepath) {
        this.onEvent();
        this.socket.emit(ReadTreeJsonSocket.eventName, filepath);
    };
    return ReadTreeJsonSocket;
}());
/**
 * event name
 */
ReadTreeJsonSocket.eventName = 'readTreeJson';
//# sourceMappingURL=readTreeJsonSocket.js.map