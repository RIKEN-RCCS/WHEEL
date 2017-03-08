
interface FileType {
    name: string;
    type: string;
}

interface FileTypeList {
    directory: string;
    files: FileType[];
}

class GetFileListSocket {

    /**
     * event name
     */
    private static eventName = 'onGetFileList';

    /**
     * socketio client side instance
     */
    private socket: SocketIO.Socket;

    /**
     * file extension
     */
    private extension: string;

    /**
     * create new instance
     * @param socket
     * @param extension
     */
    public constructor(socket: SocketIO.Socket, extension?: string) {
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
    public onEvent(callback: ((fileTypes: FileTypeList) => void)): void {
        this.socket.once(GetFileListSocket.eventName, callback);
    }

    /**
     *
     * @param directory
     */
    public emit(directory: string = null, callback: ((fileTypes: FileTypeList) => void)): void {
        this.onEvent(callback);
        this.socket.emit('onGetFileList', directory, this.extension);
    }
}
