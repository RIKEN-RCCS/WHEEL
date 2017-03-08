
class WriteTreeJsonSocket {

    /**
     * event name
     */
    private static eventName = 'writeTreeJson';

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
     * @param callback
     */
    public onEvent(callback: ((isSucceed: boolean) => void)): void {
        this.socket.once(WriteTreeJsonSocket.eventName, (isSucceed: boolean) => {
            callback(isSucceed);
        });
    }

    /**
     *
     * @param projectDirectory
     * @param treeJson
     * @param callback
     */
    public emit(projectDirectory, tree: SwfTree, callback: ((isSucceed: boolean) => void)): void {
        this.onEvent(callback);
        this.socket.emit(WriteTreeJsonSocket.eventName, projectDirectory, tree.toSwfTreeJson());
    }
}