/**
 * socket io communication class for remote ssh connection test to server
 */
class SshConnectionSocket {

    /**
     * event name
     */
    private static readonly eventName = 'onSshConnection';

    /**
     * socketio client side instance
     */
    private readonly socket: SocketIOClient.Socket;

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
    public onEvent(callback: ((isConnect: boolean) => void)): void {
        this.socket.once(SshConnectionSocket.eventName, callback);
    }

    /**
     * emit to server for remote ssh connection test
     * @param name key name of registered host information
     * @param password password string
     * @param callback The function to call when we get the event
     */
    public emit(name: string, password: string, callback: ((isConnect: boolean) => void)): void {
        this.onEvent(callback);
        this.socket.emit(SshConnectionSocket.eventName, name, password);
    }
}