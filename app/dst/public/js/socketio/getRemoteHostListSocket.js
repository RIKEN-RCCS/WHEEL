/**
 * socket io communication class for getting host information from server
 */
class GetRemoteHostListSocket {
    /**
     * create new instance
     * @param socket socket io instance
     */
    constructor(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for connect event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    onConnect(callback) {
        this.callback = callback;
        this.socket
            .on('connect', () => {
            this.emit(callback);
        });
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    onEvent(callback) {
        if (callback == null) {
            callback = this.callback;
        }
        this.socket.once(GetRemoteHostListSocket.eventName, (hostInfos) => {
            callback(hostInfos);
        });
    }
    /**
     * emit to server for getting host information
     * @param callback The function to call when we get the event
     */
    emit(callback) {
        this.onEvent(callback);
        this.socket.emit(GetRemoteHostListSocket.eventName);
    }
}
/**
 * event name
 */
GetRemoteHostListSocket.eventName = 'onGetRemoteHostList';
//# sourceMappingURL=getRemoteHostListSocket.js.map