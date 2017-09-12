/**
 * socket io communication class for add host information to server
 */
class AddHostSocket {
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
        this.socket.once(AddHostSocket.eventName, callback);
    }
    /**
     * emit to server for add host information
     * @param hostInfo send host information
     * @param callback The function to call when we get this event
     */
    emit(hostInfo, callback) {
        this.onEvent(callback);
        this.socket.emit(AddHostSocket.eventName, hostInfo);
    }
}
/**
 * event name
 */
AddHostSocket.eventName = 'onAddHost';
//# sourceMappingURL=addHostSocket.js.map