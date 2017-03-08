
/**
 *
 */
class GetTemplateJsonFileSocket {

    /**
     * event name
     */
    private static eventName = 'onGetJsonFile';

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
    public onEvent(callback: ((json: any) => void)): void {
        this.socket.once(GetTemplateJsonFileSocket.eventName, callback);
    }

    /**
     *
     * @param filetype
     * @param callback
     */
    public emit(filetype: JsonFileType, callback: ((json: any) => void)): void {
        this.onEvent(callback);
        this.socket.emit(GetTemplateJsonFileSocket.eventName, filetype);
    }
}