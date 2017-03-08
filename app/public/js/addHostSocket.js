/**
 * add host information to server
 */
var AddHostSocket = (function () {
    /**
     * create new instance
     * @param socket
     */
    function AddHostSocket(socket) {
        this.socket = socket;
    }
    /**
     * set callback function for add host information event
     * @param callback callback function
     */
    AddHostSocket.prototype.onEvent = function (callback) {
        this.socket.once(AddHostSocket.eventName, callback);
    };
    /**
     * emit to server for save host information
     * @param hostInfo send
     * @param callback callback function
     */
    AddHostSocket.prototype.emit = function (hostInfo, callback) {
        this.onEvent(callback);
        this.socket.json.emit(AddHostSocket.eventName, hostInfo);
    };
    return AddHostSocket;
}());
/**
 * event name
 */
AddHostSocket.eventName = 'onAddHost';
//# sourceMappingURL=addHostSocket.js.map