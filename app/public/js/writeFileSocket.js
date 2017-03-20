/**
 * socket io communication class for write file to server
 */
var WriteFileSocket = (function () {
    /**
     * create new instance
     * @param socket socket io instance
     */
    function WriteFileSocket(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    WriteFileSocket.prototype.onEvent = function (callback) {
        this.socket.once(WriteFileSocket.eventName, function (isSucceed) {
            callback(isSucceed);
        });
    };
    /**
     * emit to server for write file
     * @param filepath write file path
     * @param data write data string
     * @param callback The function to call when we get the event
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