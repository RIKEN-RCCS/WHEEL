/**
 *
 */
var DeleteHostSocket = (function () {
    /**
     * create new instance
     * @param socket
     */
    function DeleteHostSocket(socket) {
        this.socket = socket;
    }
    /**
     *
     * @param callback
     */
    DeleteHostSocket.prototype.onEvent = function (callback) {
        this.socket.once(DeleteHostSocket.eventName, callback);
    };
    /**
     *
     * @param labelName
     * @param callback
     */
    DeleteHostSocket.prototype.emit = function (labelName, callback) {
        this.onEvent(callback);
        this.socket.emit(DeleteHostSocket.eventName, labelName);
    };
    return DeleteHostSocket;
}());
/**
 * event name
 */
DeleteHostSocket.eventName = 'onDeleteHost';
//# sourceMappingURL=DeleteHostSocket.js.map