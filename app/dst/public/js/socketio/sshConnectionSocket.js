/**
 * socket io communication class for remote ssh connection test to server
 */
var SshConnectionSocket = (function () {
    /**
     * create new instance
     * @param socket socket io instance
     */
    function SshConnectionSocket(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    SshConnectionSocket.prototype.onEvent = function (callback) {
        this.socket.once(SshConnectionSocket.eventName, callback);
    };
    /**
     * emit to server for remote ssh connection test
     * @param name key name of registered host information
     * @param password password string
     * @param callback The function to call when we get the event
     */
    SshConnectionSocket.prototype.emit = function (name, password, callback) {
        this.onEvent(callback);
        this.socket.emit(SshConnectionSocket.eventName, name, password);
    };
    return SshConnectionSocket;
}());
/**
 * event name
 */
SshConnectionSocket.eventName = 'onSshConnection';
//# sourceMappingURL=sshConnectionSocket.js.map