var OpenProjectJsonSocket = (function () {
    /**
     * create new instance
     * @param socket
     */
    function OpenProjectJsonSocket(socket) {
        this.socket = socket;
    }
    /**
     *
     * @param filename
     * @param callback
     */
    OpenProjectJsonSocket.prototype.onConnect = function (filename, callback) {
        var _this = this;
        this.callback = callback;
        this.socket
            .on('connect', function () {
            _this.emit(filename);
        });
    };
    /**
     *
     * @param callback
     */
    OpenProjectJsonSocket.prototype.onEvent = function (callback) {
        if (callback == null) {
            callback = this.callback;
        }
        this.socket.once(OpenProjectJsonSocket.eventName, callback);
    };
    /**
     *
     * @param filename
     * @param callback
     */
    OpenProjectJsonSocket.prototype.emit = function (filename, callback) {
        this.onEvent(callback);
        this.socket.emit(OpenProjectJsonSocket.eventName, filename);
    };
    return OpenProjectJsonSocket;
}());
/**
 * event name
 */
OpenProjectJsonSocket.eventName = 'openProjectJson';
//# sourceMappingURL=openProjectJsonSocket.js.map