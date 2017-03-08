var CreateNewProjectSocket = (function () {
    /**
     * create new instance
     * @param socket
     */
    function CreateNewProjectSocket(socket) {
        this.socket = socket;
    }
    CreateNewProjectSocket.prototype.onEvent = function (callback) {
        this.socket.once(CreateNewProjectSocket.eventName, callback);
    };
    CreateNewProjectSocket.prototype.emit = function (directoryPath, callback) {
        this.onEvent(callback);
        this.socket.emit(CreateNewProjectSocket.eventName, directoryPath);
    };
    return CreateNewProjectSocket;
}());
/**
 * event name
 */
CreateNewProjectSocket.eventName = 'onCreateNewProject';
//# sourceMappingURL=createNewProjectSocket.js.map