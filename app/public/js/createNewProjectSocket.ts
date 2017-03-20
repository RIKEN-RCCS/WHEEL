/**
 * socket io communication class for create new project to server
 */
class CreateNewProjectSocket {

    /**
     * event name
     */
    private static eventName = 'onCreateNewProject';

    /**
     * socketio client side instance
     */
    private socket: SocketIO.Socket;

    /**
     * create new instance
     * @param socket socket io instance
     */
    public constructor(socket: SocketIO.Socket) {
        this.socket = socket;
    }

    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    public onEvent(callback: ((rootFilePath: string) => void)): void {
        this.socket.once(CreateNewProjectSocket.eventName, callback);
    }

    /**
     * emit to server for create new project
     * @param directoryPath create project path name
     * @param callback The function to call when we get the event
     */
    public emit(directoryPath: string, callback: ((rootFilePath: string) => void)): void {
        this.onEvent(callback);
        this.socket.emit(CreateNewProjectSocket.eventName, directoryPath);
    }
}