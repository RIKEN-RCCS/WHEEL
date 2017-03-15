
class ReadFileSocket {

    /**
     * event name
     */
    private static eventName = 'readFile';

    /**
     * socketio client side instance
     */
    private socket: SocketIO.Socket;

    /**
     * callback function
     */
    private callback: ((data: Buffer) => void);

    /**
     * create new instance
     * @param socket
     */
    public constructor(socket: SocketIO.Socket) {
        this.socket = socket;
    }

    /**
     *
     * @param filepath
     * @param callback
     */
    public onConnect(filepath: string, callback: ((data) => void)): void {
        this.callback = callback;
        this.socket
            .on('connect', () => {
                this.emit(filepath);
            });
    }

    /**
     *
     */
    public onEvent(): void {
        this.socket.once(ReadFileSocket.eventName, (data) => {
            this.callback(data);
        });
    }

    /**
     *
     * @param editFilePath
     */
    public emit(editFilePath: string): void {
        this.onEvent();
        this.socket.emit(ReadFileSocket.eventName, editFilePath);
    }
}
