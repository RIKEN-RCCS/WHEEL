var SshConnectionSocket = (function () {
    /**
     * create new instance
     * @param socket
     */
    function SshConnectionSocket(socket) {
        this.socket = socket;
    }
    /**
     *
     * @param callback
     */
    SshConnectionSocket.prototype.onEvent = function (callback) {
        this.socket.once(SshConnectionSocket.eventName, callback);
    };
    /**
     *
     * @param label
     * @param password
     * @param isTest
     * @param callback
     */
    SshConnectionSocket.prototype.emit = function (label, password, isTest, callback) {
        this.onEvent(callback);
        this.socket.json.emit(SshConnectionSocket.eventName, label, password, isTest);
    };
    return SshConnectionSocket;
}());
/**
 * event name
 */
SshConnectionSocket.eventName = 'onSshConnection';
//# sourceMappingURL=sshConnectionSocket.js.map