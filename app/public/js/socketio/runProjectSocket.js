/**
 * socket io communication class for run project to server
 */
class RunProjectSocket {
    /**
     * construct new socket
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
        this.socket.once(RunProjectSocket.eventName, callback);
    }
    /**
     * emit to server for run project
     * @param projectFilepath project file path
     * @param passInfo password information hash
     * @param callback The function to call when we get the event
     */
    emit(projectFilepath, passInfo, callback) {
        this.onEvent(callback);
        this.socket.emit(RunProjectSocket.eventName, projectFilepath, passInfo);
    }
}
/**
 * event name
 */
RunProjectSocket.eventName = 'onRunProject';
//# sourceMappingURL=runProjectSocket.js.map