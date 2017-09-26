/**
 * socket io communication class for getting project json from server
 */
class OpenProjectJsonSocket {
    /**
     * create new instance
     * @param socket socket socket io instance
     */
    constructor(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for connect event that will be invoked a single time before being automatically removed
     * @param projectFilepath project file path
     * @param callback The function to call when we get the event
     */
    onConnect(projectFilepath, callback) {
        this.callback = callback;
        this.socket
            .on('connect', () => {
            this.emit(projectFilepath);
        });
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    onEvent(callback) {
        if (callback == null) {
            callback = this.callback;
        }
        this.socket.once(OpenProjectJsonSocket.eventName, callback);
    }
    /**
     * emit to server for gettingproject json
     * @param projectFilepath project file path
     * @param callback The function to call when we get the event
     */
    emit(projectFilepath, callback) {
        this.onEvent(callback);
        this.socket.emit(OpenProjectJsonSocket.eventName, projectFilepath);
    }
}
/**
 * event name
 */
OpenProjectJsonSocket.eventName = 'openProjectJson';
//# sourceMappingURL=openProjectJsonSocket.js.map