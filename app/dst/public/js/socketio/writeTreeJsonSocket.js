/**
 * socket io communication class for write SwfTreeJson information to server
 */
var WriteTreeJsonSocket = (function () {
    /**
     * create new instance
     * @param socket socket io instance
     */
    function WriteTreeJsonSocket(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    WriteTreeJsonSocket.prototype.onEvent = function (callback) {
        this.socket.once(WriteTreeJsonSocket.eventName, function (isSucceed) {
            callback(isSucceed);
        });
    };
    /**
     * emit to server for write SwfTreeJson information
     * @param projectDirectory project directory name
     * @param tree write SwfTree instance
     * @param callback The function to call when we get the event
     */
    WriteTreeJsonSocket.prototype.emit = function (projectDirectory, tree, callback) {
        this.onEvent(callback);
        this.socket.emit(WriteTreeJsonSocket.eventName, projectDirectory, tree.toSwfTreeJson());
    };
    /**
     * event name
     */
    WriteTreeJsonSocket.eventName = 'writeTreeJson';
    return WriteTreeJsonSocket;
}());
//# sourceMappingURL=writeTreeJsonSocket.js.map