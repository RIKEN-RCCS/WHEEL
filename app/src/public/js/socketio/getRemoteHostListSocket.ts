/**
 * socket io communication class for getting host information from server
 */
class GetRemoteHostListSocket {

    /**
     * event name
     */
    private static readonly eventName = 'onGetRemoteHostList';

    /**
     * socketio client side instance
     */
    private readonly socket: SocketIOClient.Socket;

    /**
     * callback function
     */
    private callback: ((hostInfos: SwfHostJson[]) => void);

    /**
     * create new instance
     * @param socket socket io instance
     */
    public constructor(socket: SocketIOClient.Socket) {
        this.socket = socket;
    }

    /**
     * Adds a listener for connect event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    public onConnect(callback: ((hostInfos: SwfHostJson[]) => void)): void {
        this.callback = callback;
        this.socket
            .on('connect', () => {
                this.emit(callback);
            });
    }

    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    public onEvent(callback?: ((hostInfos: SwfHostJson[]) => void)): void {
        if (callback == null) {
            callback = this.callback;
        }
        this.socket.once(GetRemoteHostListSocket.eventName, (hostInfos: SwfHostJson[]) => {
            callback(hostInfos);
        });
    }

    /**
     * emit to server for getting host information
     * @param callback The function to call when we get the event
     */
    public emit(callback?: ((hostInfos: SwfHostJson[]) => void)): void {
        this.onEvent(callback);
        this.socket.emit(GetRemoteHostListSocket.eventName);
    }
}