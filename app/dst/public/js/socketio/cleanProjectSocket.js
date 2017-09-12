/**
 * socket io communication class for cleaning project request to server
 */
class CleanProjectSocket {
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
        this.socket.once(CleanProjectSocket.eventName, callback);
    }
    /**
     * emit to server for cleaning project
     * @param projectPath project path name
     * @param callback The function to call when we get the event
     */
    emit(projectPath, callback) {
        this.onEvent(callback);
        this.socket.emit(CleanProjectSocket.eventName, projectPath);
    }
}
/**
 * event name
 */
CleanProjectSocket.eventName = 'cleanProject';
//# sourceMappingURL=cleanProjectSocket.js.map