/**
 *
 */
class DeleteHostSocket {

    /**
     * event name
     */
    private static eventName = 'onDeleteHost';

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
    public onEvent(callback: ((isDeleteHost: boolean) => void)): void {
        this.socket.once(DeleteHostSocket.eventName, callback);
    }

    /**
     *
     * @param labelName
     * @param callback
     */
    public emit(labelName: string, callback: ((isDeleteHost: boolean) => void)): void {
        this.onEvent(callback);
        this.socket.emit(DeleteHostSocket.eventName, labelName);
    }
}
