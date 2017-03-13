interface SshConnectionParam {
    label: string;
    // cid: string,
    // type: string,
    // host: string,
    // passphrase?: string,
    // isPassword: boolean,
    isTest: boolean;
}

class SshConnectionSocket {

    /**
     * event name
     */
    private static eventName = 'onSshConnection';

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
    public onEvent(callback: ((isConnect: boolean) => void)): void {
        this.socket.once(SshConnectionSocket.eventName, callback);
    }

    /**
     *
     * @param label
     * @param password
     * @param callback
     */
    public emit(label: string, password: string, callback: ((isConnect: boolean) => void)): void {
        this.onEvent(callback);
        this.socket.json.emit(SshConnectionSocket.eventName, label, password);
    }
}