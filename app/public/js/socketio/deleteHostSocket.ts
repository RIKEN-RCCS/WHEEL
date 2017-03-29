/**
 * socket io communication class for delete host information from server
 */
class DeleteHostSocket {

    /**
     * event name
     */
    private static eventName = 'onDeleteHost';

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
    public onEvent(callback: ((isDeleteHost: boolean) => void)): void {
        this.socket.once(DeleteHostSocket.eventName, callback);
    }

    /**
     * emit to server for delete host information
     * @param name key name of registered host information
     * @param callback The function to call when we get the event
     */
    public emit(name: string, callback: ((isDeleteHost: boolean) => void)): void {
        this.onEvent(callback);
        this.socket.emit(DeleteHostSocket.eventName, name);
    }
}
