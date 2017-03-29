/**
 * socket io communication class for read tree json from server
 */
class ReadTreeJsonSocket {

    /**
     * event name
     */
    private static eventName = 'readTreeJson';

    /**
     * socketio client side instance
     */
    private socket: SocketIOClient.Socket;

    /**
     * callback function
     */
    private callback: ((json: SwfTreeJson) => void);

    /**
     * create new instance
     * @param socket socket io instance
     */
    public constructor(socket: SocketIOClient.Socket) {
        this.socket = socket;
    }

    /**
     * Adds a listener for connect event that will be invoked a single time before being automatically removed
     * @param treeJsonFilepath tree json file path
     * @param callback The function to call when we get the event
     */
    public onConnect(treeJsonFilepath: string, callback: ((treeJson: SwfTreeJson) => void)): void {
        this.callback = callback;
        this.socket
            .on('connect', () => {
                this.emit(treeJsonFilepath);
            });
    }

    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     */
    public onEvent(): void {
        this.socket.once(ReadTreeJsonSocket.eventName, (treeJson: SwfTreeJson) => {
            this.callback(treeJson);
        });
    }

    /**
     * emit to server for read tree json
     * @param treeJsonFilepath tree json file path
     */
    public emit(treeJsonFilepath: string): void {
        this.onEvent();
        this.socket.emit(ReadTreeJsonSocket.eventName, treeJsonFilepath);
    }
}
