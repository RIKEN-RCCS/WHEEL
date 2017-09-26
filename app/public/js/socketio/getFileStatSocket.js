/**
 * socket io communication class for gettingfile status
 */
class GetFileStatSocket {
    /**
     * create new instance
     * @param socket socket io instance
     */
    constructor(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for connect event that will be invoked a single time before being automatically removed
     * @param filename
     * @param callback The function to call when we get this event
     */
    onConnect(filename, callback) {
        this.socket
            .on('connect', () => {
            this.emit(filename, callback);
        });
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get this event
     */
    onEvent(callback) {
        this.socket.once(GetFileStatSocket.eventName, callback);
    }
    /**
     * emit to server for gettingfile status
     * @param filepath
     * @param callback The function to call when we get this event
     */
    emit(filepath, callback) {
        this.onEvent(callback);
        this.socket.emit(GetFileStatSocket.eventName, filepath);
    }
}
/**
 * event name
 */
GetFileStatSocket.eventName = 'onGetFileStat';
//# sourceMappingURL=getFileStatSocket.js.map