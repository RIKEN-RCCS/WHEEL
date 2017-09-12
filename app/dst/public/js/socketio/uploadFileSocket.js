/**
 * socket io communication class for upload file to server
 */
class UploadFileSocket {
    /**
     * create new instance
     * @param socket socket io instance
     */
    constructor(socket) {
        /**
         * upload file data
         */
        this.upload = {};
        /**
         * max send size (kb)
         */
        this.maxSendSize = 1 * 1024 * 1024;
        /**
         * upload ready event
         */
        this.readyEventName = 'onUploadReady';
        /**
         * upload start event
         */
        this.startEventName = 'onUploadStart';
        /**
         * upload done event
         */
        this.doneEventName = 'onUploadDone';
        this.socket = socket;
    }
    /**
     * Adds a listener for this event
     * @param callback The function to call when we get the event
     */
    onEvent(callback) {
        this.socket.on(this.doneEventName, (isUpload, filepath) => {
            delete this.upload[filepath];
            callback(isUpload, filepath);
        });
        this.socket.on(this.startEventName, (place, filepath) => {
            const data = this.upload[filepath];
            const newFile = data.file.slice(place, place + Math.min(this.maxSendSize, data.file.size - place));
            data.fileReader.readAsBinaryString(newFile);
        });
    }
    /**
     * remove all listeners on this socket
     */
    offEvent() {
        this.socket.removeAllListeners();
    }
    /**
     * emit to server for upload file
     * @param data uplodad file data
     */
    emit(data) {
        const fileReader = new FileReader();
        this.upload[data.filepath] = {
            file: data.file,
            filepath: data.filepath,
            fileReader: fileReader
        };
        fileReader.onload = (e) => {
            this.socket.emit(this.startEventName, data.filepath, e.target.result);
        };
        this.socket.emit(this.readyEventName, data.filepath, data.file.size);
    }
}
//# sourceMappingURL=uploadFileSocket.js.map