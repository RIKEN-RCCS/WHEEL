interface UploadFileData {
    path: string,
    file: File
}

/**
 *
 */
class UploadFileSocket {

    /**
     * event name
     */
    private static eventName = 'onUploadFile';

    /**
     * socketio client side instance
     */
    private socket: SocketIO.Socket;

    /**
     * create new instance
     * @param socket
     */
    public constructor(socket: SocketIO.Socket) {
        this.socket = socket;
    }

    /**
     *
     * @param callback
     */
    public onEvent(callback: ((isUpload: boolean) => void)): void {
        this.socket.once(UploadFileSocket.eventName, callback);
    }

    /**
     *
     * @param file
     * @param filepath
     * @param callback
     */
    public emit(data: UploadFileData, callback: ((isUpload: boolean) => void)): void {
        this.onEvent(callback);
        const fileReader = new FileReader();
        fileReader.readAsBinaryString(data.file);
        fileReader.onload = (eventObject: JQueryEventObject) => {
            const result = fileReader.result;
            this.socket.emit(UploadFileSocket.eventName, data.path, fileReader.result);
        };
        fileReader.onerror = (err) => {
            console.error(err);
        };
    }
}
