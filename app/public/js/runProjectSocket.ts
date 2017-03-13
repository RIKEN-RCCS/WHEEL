/**
 *
 */
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
     */
    public constructor(socket: SocketIO.Socket) {
        this.socket = socket;
    }

    /**
     *
     * @param callback
     */
    public onEvent(callback: ((isSucceed: boolean) => void)): void {
        this.socket.once(RunProjectSocket.eventName, callback);
    }

    /**
     *
     * @param swfFilePath
     * @param passInfo
     * @param callback
     */
    public emit(swfFilePath: string, passInfo: { [name: string]: string }, callback: ((isSucceed: boolean) => void)): void {
        this.onEvent(callback);
        this.socket.emit(RunProjectSocket.eventName, swfFilePath, passInfo);
    }
}
