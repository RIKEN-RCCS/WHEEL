/**
 * socket io communication class for delete directory from server
 */
class DeleteDirectorySocket {
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
        this.socket.once(DeleteDirectorySocket.eventName, callback);
    }
    /**
     * emit to server for delete directory
     * @param directorys delete directory names
     * @param callback The function to call when we get the event
     */
    emit(directorys, callback) {
        this.onEvent(callback);
        this.socket.emit(DeleteDirectorySocket.eventName, directorys);
    }
}
/**
 * event name
 */
DeleteDirectorySocket.eventName = 'onDeleteDirectory';
//# sourceMappingURL=deleteDirectorySocket.js.map