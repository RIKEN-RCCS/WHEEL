
class OpenProjectJsonSocket {

    /**
     * event name
     */
    private static eventName = 'openProjectJson';

    /**
     * socketio client side instance
     */
    private socket: SocketIO.Socket;

    /**
     * callback function
     */
    private callback: ((projectJson: SwfProjectJson) => void);

    /**
     * create new instance
     * @param socket
     */
    public constructor(socket: SocketIO.Socket) {
        this.socket = socket;
    }

    /**
     *
     * @param filename
     * @param callback
     */
    public onConnect(filename: string, callback: ((projectJson: SwfProjectJson) => void)): void {
        this.callback = callback;
        this.socket
            .on('connect', () => {
                this.emit(filename);
            });
    }

    /**
     *
     * @param callback
     */
    public onEvent(callback?: ((projectJson: SwfProjectJson) => void)): void {
        if (callback == null) {
            callback = this.callback;
        }
        this.socket.once(OpenProjectJsonSocket.eventName, callback);
    }

    /**
     *
     * @param filename
     * @param callback
     */
    public emit(filename: string, callback?: ((projectJson: SwfProjectJson) => void)) {
        this.onEvent(callback);
        this.socket.emit(OpenProjectJsonSocket.eventName, filename);
    }
}
