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
        this.socket
            .on('connect', function () {
            _this.emit(filename, callback);
        });
    };
    /**
     *
     * @param callback
     */
    OpenProjectJsonSocket.prototype.onEvent = function (callback) {
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