var CreateFileSocket = (function () {
    /**
     * create new instance
     * @param socket
     */
    function CreateFileSocket(socket) {
        this.socket = socket;
    }
    CreateFileSocket.prototype.onEvent = function (callback) {
        this.socket.once(CreateFileSocket.eventName, callback);
    };
    CreateFileSocket.prototype.emit = function (filepath, data, callback) {
        this.onEvent(callback);
        this.socket.emit(CreateFileSocket.eventName, filepath, data);
    };
    return CreateFileSocket;
}());
/**
 * event name
 */
CreateFileSocket.eventName = 'onCreateFile';
//# sourceMappingURL=createFileSocket.js.map