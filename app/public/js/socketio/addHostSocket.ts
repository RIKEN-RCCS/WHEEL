/**
 * socket io communication class for add host information to server
 */
class AddHostSocket {

    /**
     * event name
     */
    private static eventName = 'onAddHost';

    /**
     * socketio client side instance
     */
    private socket: SocketIOClient.Socket;

    /**
     * create new instance
     * @param socket socket io instance
     */
    public constructor(socket: SocketIOClient.Socket) {
        this.socket = socket;
    }

    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    public onEvent(callback: ((isAdd: boolean) => void)): void {
        this.socket.once(AddHostSocket.eventName, callback);
    }

    /**
     * emit to server for add host information
     * @param hostInfo send host information
     * @param callback The function to call when we get this event
     */
    public emit(hostInfo: SwfHostJson, callback: ((isAdd: boolean) => void)): void {
        this.onEvent(callback);
        this.socket.emit(AddHostSocket.eventName, hostInfo);
    }
}
