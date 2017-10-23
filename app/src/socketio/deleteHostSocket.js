/**
 * socket io communication class for delete host information from server
 */
export default class {
    /**
     * create new instance
     * @param socket socket io instance
     */
    constructor(socket) {
        this.socket = socket;
        this.eventName = 'onDeleteHost';
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    onEvent(callback) {
        this.socket.once(this.eventName, callback);
    }
    /**
     * emit to server for delete host information
     * @param name key name of registered host information
     * @param callback The function to call when we get the event
     */
    emit(name, callback) {
        this.onEvent(callback);
        this.socket.emit(this.eventName, name);
    }
}
