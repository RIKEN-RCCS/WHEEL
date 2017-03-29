/**
 * socket io communication class for write file to server
 */
class WriteFileSocket {

    /**
     * event name
     */
    private static eventName = 'writeFile';

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
    public onEvent(callback: ((isSucceed: boolean) => void)): void {
        this.socket.once(WriteFileSocket.eventName, (isSucceed: boolean) => {
            callback(isSucceed);
        });
    }

    /**
     * emit to server for write file
     * @param filepath write file path
     * @param data write data string
     * @param callback The function to call when we get the event
     */
    public emit(filepath: string, data: string, callback: ((isSucceed: boolean) => void)): void {
        this.onEvent(callback);
        this.socket.emit(WriteFileSocket.eventName, filepath, data);
    }
}