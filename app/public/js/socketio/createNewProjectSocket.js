/**
 * socket io communication class for create new project to server
 */
class CreateNewProjectSocket {
    /**
     * create new instance
     * @param socket socket io instance
     */
    constructor(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    onEvent(callback) {
        this.socket.once(CreateNewProjectSocket.eventName, callback);
    }
    /**
     * emit to server for create new project
     * @param directoryPath create project path name
     * @param callback The function to call when we get the event
     */
    emit(directoryPath, callback) {
        this.onEvent(callback);
        this.socket.emit(CreateNewProjectSocket.eventName, directoryPath);
    }
}
/**
 * event name
 */
CreateNewProjectSocket.eventName = 'onCreateNewProject';
//# sourceMappingURL=createNewProjectSocket.js.map