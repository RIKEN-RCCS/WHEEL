/**
 * socket io communication class for read file data from server
 */
class ReadFileSocket {
    /**
     * create new instance
     * @param socket socket io instance
     */
    constructor(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for connect event that will be invoked a single time before being automatically removed
     * @param filepath read file path
     * @param callback The function to call when we get the event
     */
    onConnect(filepath, callback) {
        this.callback = callback;
        this.socket
            .on('connect', () => {
            this.emit(filepath);
        });
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     */
    onEvent() {
        this.socket.once(ReadFileSocket.eventName, (data) => {
            this.callback(data);
        });
    }
    /**
     * emit to server for read file data
     * @param filepath read file path
     */
    emit(filepath) {
        this.onEvent();
        this.socket.emit(ReadFileSocket.eventName, filepath);
    }
}
/**
 * event name
 */
ReadFileSocket.eventName = 'readFile';
//# sourceMappingURL=readFileSocket.js.map