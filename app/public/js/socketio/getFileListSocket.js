/**
 * socket io communication class for get file list
 */
class GetFileListSocket {
    /**
     * create new instance
     * @param socket socket io instance
     * @param extension extension string for file filter, or null we want to all files
     */
    constructor(socket, extension) {
        this.socket = socket;
        this.extension = extension;
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get this event
     */
    onEvent(callback) {
        this.socket.once(GetFileListSocket.eventName, callback);
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
/**
 * event name
 */
GetFileListSocket.eventName = 'onGetFileList';
//# sourceMappingURL=getFileListSocket.js.map