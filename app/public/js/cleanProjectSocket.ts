class CleanProjectSocket {
    /**
     * event name
     */
    private static eventName = 'cleanProject';

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
    public onEvent(callback: ((isSucceed: boolean) => void)): void {
        this.socket.once(CleanProjectSocket.eventName, callback);
    }

    /**
     *
     * @param projectFilepath
     * @param callback
     */
    public emit(projectFilepath: string, callback: ((isSucceed: boolean) => void)): void {
        this.onEvent(callback);
        this.socket.emit(CleanProjectSocket.eventName, projectFilepath);
    }
}