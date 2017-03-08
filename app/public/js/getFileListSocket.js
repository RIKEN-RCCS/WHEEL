var GetFileListSocket = (function () {
    /**
     * create new instance
     * @param socket
     * @param extension
     */
    function GetFileListSocket(socket, extension) {
        this.socket = socket;
        this.extension = extension;
    }
    // /**
    //  *
    //  * @param callback
    //  */
    // public onConnect(callback: ((fileTypes: FileTypeList) => void)): void {
    //     this.socket
    //         .on('connect', () => {
    //             this.onEvent(callback);
    //             this.emit();
    //         });
    // }
    /**
     *
     * @param callback
     */
    GetFileListSocket.prototype.onEvent = function (callback) {
        this.socket.once(GetFileListSocket.eventName, callback);
    };
    /**
     *
     * @param directory
     */
    GetFileListSocket.prototype.emit = function (directory, callback) {
        if (directory === void 0) { directory = null; }
        this.onEvent(callback);
        this.socket.emit('onGetFileList', directory, this.extension);
    };
    return GetFileListSocket;
}());
/**
 * event name
 */
GetFileListSocket.eventName = 'onGetFileList';
//# sourceMappingURL=getFileListSocket.js.map