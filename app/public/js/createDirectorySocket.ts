
class CreateDirectorySocket {

    /**
     * event name
     */
    private static eventName = 'onCreateDirectory';

    /**
     * socketio client side instance
     */
    private socket: SocketIO.Socket;

    /**
     * construct new socket
     * @param nsp: namespace of socket
     */
    public constructor(socket: SocketIO.Socket) {
        this.socket = socket;
    }

    /**
     *
     * @param callback
     */
    public onEvent(callback: ((isCreateDir: boolean) => void)): void {
        this.socket.once(CreateDirectorySocket.eventName, callback);
    }

    /**
     *
     * @param directoryPath
     * @param callback
     */
    public emit(directoryPath: string, callback: ((isCreateDir: boolean) => void)): void {
        this.onEvent(callback);
        this.socket.emit(CreateDirectorySocket.eventName, directoryPath);
    }
}
