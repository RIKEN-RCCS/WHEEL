var CleanProjectSocket = (function () {
    /**
     * create new instance
     * @param socket
     */
    function CleanProjectSocket(socket) {
        this.socket = socket;
    }
    /**
     *
     * @param callback
     */
    CleanProjectSocket.prototype.onEvent = function (callback) {
        this.socket.once(CleanProjectSocket.eventName, callback);
    };
    /**
     *
     * @param projectFilepath
     * @param callback
     */
    CleanProjectSocket.prototype.emit = function (projectFilepath, callback) {
        this.onEvent(callback);
        this.socket.emit(CleanProjectSocket.eventName, projectFilepath);
    };
    return CleanProjectSocket;
}());
/**
 * event name
 */
CleanProjectSocket.eventName = 'cleanProject';
//# sourceMappingURL=cleanProjectSocket.js.map