
/**
 *
 */
interface CreateFileCallback {
    (isCreateFile: boolean): void;
}

class CreateFileSocket {

    /**
     * event name
     */
    private static eventName = 'onCreateFile';

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

    public onEvent(callback: CreateFileCallback): void {
        this.socket.once(CreateFileSocket.eventName, callback);
    }

    public emit(filepath: string, data: (string | Buffer), callback: CreateFileCallback): void {
        this.onEvent(callback);
        this.socket.emit(CreateFileSocket.eventName, filepath, data);
    }
}
