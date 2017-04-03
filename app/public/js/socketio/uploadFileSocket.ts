/**
 * uplodad file data
 */
interface UploadFileData {
    /**
     * uplodad file path
     */
    filepath: string;
    /**
     * upload file
     */
    file: File;
    /**
     * file reader
     */
    fileReader?: FileReader;
}

/**
 * socket io communication class for upload file to server
 */
class UploadFileSocket {

    /**
     * socketio client side instance
     */
    private readonly socket: SocketIOClient.Socket;

    /**
     * upload file data
     */
    private upload: { [filepath: string]: UploadFileData } = {};

    /**
     * max send size (kb)
     */
    private readonly maxSendSize = 1 * 1024 * 1024;

    /**
     * upload ready event
     */
    private readonly readyEventName = 'onUploadReady';

    /**
     * upload start event
     */
    private readonly startEventName = 'onUploadStart';

    /**
     * upload done event
     */
    private readonly doneEventName = 'onUploadDone';

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
        this.socket.on(this.doneEventName, (isUpload: boolean, filepath: string) => {
            delete this.upload[filepath];
            callback(isUpload, filepath);
        });
        this.socket.on(this.startEventName, (place: number, filepath: string) => {
            const data = this.upload[filepath];
            const newFile = data.file.slice(place, place + Math.min(this.maxSendSize, data.file.size - place));
            data.fileReader.readAsBinaryString(newFile);
        });
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
        this.upload[data.filepath] = {
            file : data.file,
            filepath: data.filepath,
            fileReader: fileReader
        };

        fileReader.onload = (e: any) => {
            this.socket.emit(this.startEventName, data.filepath, e.target.result);
        };

        this.socket.emit(this.readyEventName, data.filepath, data.file.size);
    }
}
