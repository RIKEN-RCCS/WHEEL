/**
 *
 */
class WriteFileSocket {

    /**
     * event name
     */
    private static eventName = 'writeFile';

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
        this.socket.once(WriteFileSocket.eventName, (isSucceed: boolean) => {
            callback(isSucceed);
        });
    }

    /**
     *
     * @param filepath
     * @param data
     * @param callback
     */
    public emit(filepath: string, data, callback: ((isSucceed: boolean) => void)): void {
        this.onEvent(callback);
        this.socket.emit(WriteFileSocket.eventName, filepath, data);
    }
}