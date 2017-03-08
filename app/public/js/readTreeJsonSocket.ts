
class ReadTreeJsonSocket {

    /**
     * event name
     */
    private static eventName = 'readTreeJson';

    /**
     * socketio client side instance
     */
    private socket: SocketIO.Socket;

    /**
     * callback function
     */
    private callback: ((json: SwfTreeJson) => void);

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
    public onConnect(filepath: string, callback: ((treeJson: SwfTreeJson) => void)): void {
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
        this.socket.once(ReadTreeJsonSocket.eventName, (treeJson: SwfTreeJson) => {
            this.callback(treeJson);
        });
    }

    /**
     *
     * @param filepath
     */
    public emit(filepath: string): void {
        this.onEvent();
        this.socket.emit(ReadTreeJsonSocket.eventName, filepath);
    }
}
