/**
 * socket io communication class for create new project to server
 */
var CreateNewProjectSocket = (function () {
    /**
     * create new instance
     * @param socket socket io instance
     */
    function CreateNewProjectSocket(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    CreateNewProjectSocket.prototype.onEvent = function (callback) {
        this.socket.once(CreateNewProjectSocket.eventName, callback);
    };
    /**
     * emit to server for create new project
     * @param directoryPath create project path name
     * @param callback The function to call when we get the event
     */
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