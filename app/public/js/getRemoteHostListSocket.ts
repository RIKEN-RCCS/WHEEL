/**
 *
 */
class GetRemoteHostListSocket {

    /**
     * event name
     */
    private static eventName = 'onGetRemoteHostList';

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
    public onConnect(callback: ((hostInfos: SwfHostJson[]) => void)): void {
        this.socket
            .on('connect', () => {
                this.emit(callback);
            });
    }

    /**
     *
     * @param callback
     */
    public onEvent(callback: ((hostInfos: SwfHostJson[]) => void)): void {
        this.socket.once(GetRemoteHostListSocket.eventName, (hostInfos: SwfHostJson[]) => {
            callback(hostInfos);
        });
    }

    /**
     *
     */
    public emit(callback: ((hostInfos: SwfHostJson[]) => void)): void {
        this.onEvent(callback);
        this.socket.emit(GetRemoteHostListSocket.eventName);
    }
}