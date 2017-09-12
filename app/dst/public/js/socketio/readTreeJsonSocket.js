/**
 * socket io communication class for read tree json from server
 */
class ReadTreeJsonSocket {
    /**
     * create new instance
     * @param socket socket io instance
     */
    constructor(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for connect event that will be invoked a single time before being automatically removed
     * @param treeJsonFilepath tree json file path
     * @param callback The function to call when we get the event
     */
    onConnect(treeJsonFilepath, callback) {
        this.callback = callback;
        this.socket
            .on('connect', () => {
            this.emit(treeJsonFilepath);
        });
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     */
    onEvent() {
        this.socket.once(ReadTreeJsonSocket.eventName, (treeJson) => {
            this.callback(treeJson);
        });
    }
    /**
     * emit to server for read tree json
     * @param treeJsonFilepath tree json file path
     */
    emit(treeJsonFilepath) {
        this.onEvent();
        this.socket.emit(ReadTreeJsonSocket.eventName, treeJsonFilepath);
    }
}
/**
 * event name
 */
ReadTreeJsonSocket.eventName = 'readTreeJson';
//# sourceMappingURL=readTreeJsonSocket.js.map