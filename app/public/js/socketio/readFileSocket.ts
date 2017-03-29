/**
 * socket io communication class for read file data from server
 */
class ReadFileSocket {

    /**
     * event name
     */
    private static eventName = 'readFile';

    /**
     * socketio client side instance
     */
    private socket: SocketIOClient.Socket;

    /**
     * callback function
     */
    private callback: ((data: string) => void);

    /**
     * create new instance
     * @param socket socket io instance
     */
    public constructor(socket: SocketIOClient.Socket) {
        this.socket = socket;
    }

    /**
     * Adds a listener for connect event that will be invoked a single time before being automatically removed
     * @param filepath read file path
     * @param callback The function to call when we get the event
     */
    public onConnect(filepath: string, callback: ((data: string) => void)): void {
        this.callback = callback;
        this.socket
            .on('connect', () => {
                this.emit(filepath);
            });
    }

    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     */
    public onEvent(): void {
        this.socket.once(ReadFileSocket.eventName, (data: string) => {
            this.callback(data);
        });
    }

    /**
     * emit to server for read file data
     * @param filepath read file path
     */
    public emit(filepath: string): void {
        this.onEvent();
        this.socket.emit(ReadFileSocket.eventName, filepath);
    }
}
