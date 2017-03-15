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
    public onEvent(callback: ((isUpload: boolean, filename: string) => void)): void {
        this.socket.on(UploadFileSocket.eventName, callback);
    }

    /**
     *
     */
    public offEvent(): void {
        this.socket.removeAllListeners(UploadFileSocket.eventName);
    }

    /**
     *
     * @param file
     */
    public emit(data: UploadFileData): void {
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
