/**
 * add host information to server
 */
class AddHostSocket {

    /**
     * event name
     */
    private static eventName = 'onAddHost';

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
     * set callback function for add host information event
     * @param callback callback function
     */
    public onEvent(callback: ((isAdd: boolean) => void)): void {
        this.socket.once(AddHostSocket.eventName, callback);
    }

    /**
     * emit to server for save host information
     * @param hostInfo send
     * @param callback callback function
     */
    public emit(hostInfo: SwfHostJson, callback: ((isAdd: boolean) => void)): void {
        this.onEvent(callback);
        this.socket.json.emit(AddHostSocket.eventName, hostInfo);
    }
}
