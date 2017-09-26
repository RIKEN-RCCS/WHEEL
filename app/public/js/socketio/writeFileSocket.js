/**
 * socket io communication class for write file to server
 */
class WriteFileSocket {
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
        this.socket.once(WriteFileSocket.eventName, (isSucceed) => {
            callback(isSucceed);
        });
    }
    /**
     * emit to server for write file
     * @param filepath write file path
     * @param data write data string
     * @param callback The function to call when we get the event
     */
    emit(filepath, data, callback) {
        this.onEvent(callback);
        this.socket.emit(WriteFileSocket.eventName, filepath, data);
    }
}
/**
 * event name
 */
WriteFileSocket.eventName = 'writeFile';
//# sourceMappingURL=writeFileSocket.js.map