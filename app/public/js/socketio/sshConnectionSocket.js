/**
 * socket io communication class for remote ssh connection test to server
 */
class SshConnectionSocket {
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
        this.socket.once(SshConnectionSocket.eventName, callback);
    }
    /**
     * emit to server for remote ssh connection test
     * @param name key name of registered host information
     * @param password password string
     * @param callback The function to call when we get the event
     */
    emit(name, password, callback) {
        this.onEvent(callback);
        this.socket.emit(SshConnectionSocket.eventName, name, password);
    }
}
/**
 * event name
 */
SshConnectionSocket.eventName = 'onSshConnection';
//# sourceMappingURL=sshConnectionSocket.js.map