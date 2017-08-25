/**
 * socket io communication class for add host information to server
 */
var AddHostSocket = (function () {
    /**
     * create new instance
     * @param socket socket io instance
     */
    function AddHostSocket(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    AddHostSocket.prototype.onEvent = function (callback) {
        this.socket.once(AddHostSocket.eventName, callback);
    };
    /**
     * emit to server for add host information
     * @param hostInfo send host information
     * @param callback The function to call when we get this event
     */
    AddHostSocket.prototype.emit = function (hostInfo, callback) {
        this.onEvent(callback);
        this.socket.emit(AddHostSocket.eventName, hostInfo);
    };
    /**
     * event name
     */
    AddHostSocket.eventName = 'onAddHost';
    return AddHostSocket;
}());
//# sourceMappingURL=addHostSocket.js.map