/**
 * socket io communication class for delete host information from server
 */
var DeleteHostSocket = (function () {
    /**
     * create new instance
     * @param socket socket io instance
     */
    function DeleteHostSocket(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    DeleteHostSocket.prototype.onEvent = function (callback) {
        this.socket.once(DeleteHostSocket.eventName, callback);
    };
    /**
     * emit to server for delete host information
     * @param name key name of registered host information
     * @param callback The function to call when we get the event
     */
    DeleteHostSocket.prototype.emit = function (name, callback) {
        this.onEvent(callback);
        this.socket.emit(DeleteHostSocket.eventName, name);
    };
    return DeleteHostSocket;
}());
/**
 * event name
 */
DeleteHostSocket.eventName = 'onDeleteHost';
//# sourceMappingURL=deleteHostSocket.js.map