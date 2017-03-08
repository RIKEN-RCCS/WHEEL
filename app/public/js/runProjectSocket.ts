class RunProjectSocket {

    /**
     * event name
     */
    public static eventName = 'onRunProject';

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

    public onEvent(callback: ((state: string) => void)): void {
        this.socket.once(RunProjectSocket.eventName, callback);
    }

    public emit(swfFilePath: string, callback: ((state: string) => void)): void {
        this.onEvent(callback);
        this.socket.emit(RunProjectSocket.eventName, swfFilePath);
    }
}
