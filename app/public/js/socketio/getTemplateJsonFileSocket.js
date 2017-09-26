/**
 * socket io communication class for template json file from server
 */
class GetTemplateJsonFileSocket {
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
        this.socket.once(GetTemplateJsonFileSocket.eventName, callback);
    }
    /**
     * emit to server for getting template json file
     * @param filetype json file type
     * @param callback The function to call when we get the event
     */
    emit(filetype, callback) {
        this.onEvent(callback);
        this.socket.emit(GetTemplateJsonFileSocket.eventName, filetype);
    }
}
/**
 * event name
 */
GetTemplateJsonFileSocket.eventName = 'onGetJsonFile';
//# sourceMappingURL=getTemplateJsonFileSocket.js.map