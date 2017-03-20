/**
 * socket io communication class for run project to server
 */
class RunProjectSocket {

    /**
     * event name
     */
    public static eventName = 'onRunProject';

    /**
     * socketio client side instance
     */
    private socket: SocketIO.Socket;

    /**
     * construct new socket
     * @param socket socket io instance
     */
    public constructor(socket: SocketIO.Socket) {
        this.socket = socket;
    }

    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    public onEvent(callback: ((isSucceed: boolean) => void)): void {
        this.socket.once(RunProjectSocket.eventName, callback);
    }

    /**
     * emit to server for run project
     * @param projectFilepath project file path
     * @param passInfo password information hash
     * @param callback The function to call when we get the event
     */
    public emit(projectFilepath: string, passInfo: { [name: string]: string }, callback: ((isSucceed: boolean) => void)): void {
        this.onEvent(callback);
        this.socket.emit(RunProjectSocket.eventName, projectFilepath, passInfo);
    }
}
