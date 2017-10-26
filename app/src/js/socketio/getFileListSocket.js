/**
 * socket io communication class for get file list
 */
export default class {
    /**
     * create new instance
     * @param socket socket io instance
     * @param extension extension string for file filter, or null we want to all files
     */
    constructor(socket, extension) {
        this.socket = socket;
        this.extension = extension;
        this.eventName = 'onGetFileList';
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get this event
     */
    onEvent(callback) {
        this.socket.once(this.eventName, callback);
    }
    /**
     * emit to server for get file list
     * @param directory
     * @param callback The function to call when we get this event
     */
    emit(directory = null, callback) {
        this.onEvent(callback);
        this.socket.emit('onGetFileList', directory, this.extension);
    }
}
