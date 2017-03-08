var WriteTreeJsonSocket = (function () {
    /**
     * create new instance
     * @param socket
     */
    function WriteTreeJsonSocket(socket) {
        this.socket = socket;
    }
    /**
     *
     * @param callback
     */
    WriteTreeJsonSocket.prototype.onEvent = function (callback) {
        this.socket.once(WriteTreeJsonSocket.eventName, function (isSucceed) {
            callback(isSucceed);
        });
    };
    /**
     *
     * @param projectDirectory
     * @param treeJson
     * @param callback
     */
    WriteTreeJsonSocket.prototype.emit = function (projectDirectory, tree, callback) {
        this.onEvent(callback);
        this.socket.emit(WriteTreeJsonSocket.eventName, projectDirectory, tree.toSwfTreeJson());
    };
    return WriteTreeJsonSocket;
}());
/**
 * event name
 */
WriteTreeJsonSocket.eventName = 'writeTreeJson';
//# sourceMappingURL=writeTreeJsonSocket.js.map