
class CreateNewProjectSocket {
    /**
     * event name
     */
    private static eventName = 'onCreateNewProject';

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

    public onEvent(callback: ((rootFilePath: string) => void)): void {
        this.socket.once(CreateNewProjectSocket.eventName, callback);
    }

    public emit(directoryPath: string, callback: ((rootFilePath: string) => void)): void {
        this.onEvent(callback);
        this.socket.emit(CreateNewProjectSocket.eventName, directoryPath);
    }
}