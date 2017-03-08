
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
        this.socket
            .on('connect', () => {
                this.emit(filename, callback);
            });
    }

    /**
     *
     * @param callback
     */
    public onEvent(callback: ((projectJson: SwfProjectJson) => void)): void {
        this.socket.once(OpenProjectJsonSocket.eventName, callback);
    }

    /**
     *
     * @param filename
     * @param callback
     */
    public emit(filename: string, callback: ((projectJson: SwfProjectJson) => void)) {
        this.onEvent(callback);
        this.socket.emit(OpenProjectJsonSocket.eventName, filename);
    }
}
