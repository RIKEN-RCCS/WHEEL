/**
 * socket io communication class for getting project json from server
 */
class OpenProjectJsonSocket {

    /**
     * event name
     */
    private static eventName = 'openProjectJson';

    /**
     * socketio client side instance
     */
    private socket: SocketIOClient.Socket;

    /**
     * callback function
     */
    private callback: ((projectJson: SwfProjectJson) => void);

    /**
     * create new instance
     * @param socket socket socket io instance
     */
    public constructor(socket: SocketIOClient.Socket) {
        this.socket = socket;
    }

    /**
     * Adds a listener for connect event that will be invoked a single time before being automatically removed
     * @param projectFilepath project file path
     * @param callback The function to call when we get the event
     */
    public onConnect(projectFilepath: string, callback: ((projectJson: SwfProjectJson) => void)): void {
        this.callback = callback;
        this.socket
            .on('connect', () => {
                this.emit(projectFilepath);
            });
    }

    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    public onEvent(callback?: ((projectJson: SwfProjectJson) => void)): void {
        if (callback == null) {
            callback = this.callback;
        }
        this.socket.once(OpenProjectJsonSocket.eventName, callback);
    }

    /**
     * emit to server for gettingproject json
     * @param projectFilepath project file path
     * @param callback The function to call when we get the event
     */
    public emit(projectFilepath: string, callback?: ((projectJson: SwfProjectJson) => void)) {
        this.onEvent(callback);
        this.socket.emit(OpenProjectJsonSocket.eventName, projectFilepath);
    }
}
