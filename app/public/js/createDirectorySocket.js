var CreateDirectorySocket = (function () {
    /**
     * construct new socket
     * @param nsp: namespace of socket
     */
    function CreateDirectorySocket(socket) {
        this.socket = socket;
    }
    /**
     *
     * @param callback
     */
    CreateDirectorySocket.prototype.onEvent = function (callback) {
        this.socket.once(CreateDirectorySocket.eventName, callback);
    };
    /**
     *
     * @param directoryPath
     * @param callback
     */
    CreateDirectorySocket.prototype.emit = function (directoryPath, callback) {
        this.onEvent(callback);
        this.socket.emit(CreateDirectorySocket.eventName, directoryPath);
    };
    return CreateDirectorySocket;
}());
/**
 * event name
 */
CreateDirectorySocket.eventName = 'onCreateDirectory';
//# sourceMappingURL=createDirectorySocket.js.map