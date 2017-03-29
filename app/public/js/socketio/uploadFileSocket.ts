/**
 * uplodad file data
 */
interface UploadFileData {
    /**
     * uplodad file path
     */
    filepath: string,
    /**
     * upload file
     */
    file: File
}

/**
 * socket io communication class for upload file to server
 */
class UploadFileSocket {

    /**
     * event name
     */
    private static eventName = 'onUploadFile';

    /**
     * socketio client side instance
     */
    private socket: SocketIOClient.Socket;

    /**
     * create new instance
     * @param socket socket io instance
     */
    public constructor(socket: SocketIOClient.Socket) {
        this.socket = socket;
    }

    /**
     * Adds a listener for this event
     * @param callback The function to call when we get the event
     */
    public onEvent(callback: ((isUpload: boolean, filename: string) => void)): void {
        this.socket.on(UploadFileSocket.eventName, callback);
    }

    /**
     * remove all listeners on this socket
     */
    public offEvent(): void {
        this.socket.removeAllListeners();
    }

    /**
     * emit to server for upload file
     * @param data uplodad file data
     */
    public emit(data: UploadFileData): void {
        const fileReader = new FileReader();
        fileReader.readAsBinaryString(data.file);
        fileReader.onload = (eventObject: JQueryEventObject) => {
            const result = fileReader.result;
            this.socket.emit(UploadFileSocket.eventName, data.filepath, fileReader.result);
        };
        fileReader.onerror = (err) => {
            console.error(err);
        };
    }
}
