/**
 *
 */
var WriteFileSocket = (function () {
    /**
     * create new instance
     * @param socket
     */
    function WriteFileSocket(socket) {
        this.socket = socket;
    }
    /**
     *
     * @param callback
     */
    WriteFileSocket.prototype.onEvent = function (callback) {
        this.socket.once(WriteFileSocket.eventName, function (isSucceed) {
            callback(isSucceed);
        });
    };
    /**
     *
     * @param filepath
     * @param data
     * @param callback
     */
    WriteFileSocket.prototype.emit = function (filepath, data, callback) {
        this.onEvent(callback);
        this.socket.emit(WriteFileSocket.eventName, filepath, data);
    };
    return WriteFileSocket;
}());
/**
 * event name
 */
WriteFileSocket.eventName = 'writeFile';
//# sourceMappingURL=writeFileSocket.js.map