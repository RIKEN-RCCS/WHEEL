/**
 * socket io communication class for cleaning project request to server
 */
class CleanProjectSocket {

    /**
     * event name
     */
    private static eventName = 'cleanProject';

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
        this.socket.once(CleanProjectSocket.eventName, callback);
    }

    /**
     * emit to server for cleaning project
     * @param projectPath project path name
     * @param callback The function to call when we get the event
     */
    public emit(projectPath: string, callback: ((isSucceed: boolean) => void)): void {
        this.onEvent(callback);
        this.socket.emit(CleanProjectSocket.eventName, projectPath);
    }
}