interface FileStat {
    dev: number;
    ino: number;
    mode: number;
    nlink: number;
    uid: number;
    gid: number;
    rdev: number;
    size: number;
    blksize: number;
    blocks: number;
    /**
     * last access time
     */
    atime: string;
    /**
     * last modify time
     */
    mtime: string;
    /**
     * last change time
     */
    ctime: string;
    /**
     * file birth time
     */
    birthtime: string;
}

/**
 *
 */
interface GetFileStatCallback {
    /**
     *
     */
    (stat: FileStat): void;
}


/**
 *
 */
class GetFileStatSocket {

    /**
     * event name
     */
    private static eventName = 'onGetFileStat';

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
    public onConnect(filename: string, callback: GetFileStatCallback): void {
        this.socket
            .on('connect', () => {
                this.emit(filename, callback);
            });
    }

    /**
     *
     * @param callback
     */
    public onEvent(callback: GetFileStatCallback): void {
        this.socket.once(GetFileStatSocket.eventName, callback);
    }

    /**
     *
     * @param filepath
     * @param callback
     */
    public emit(filepath: string, callback: GetFileStatCallback): void {
        this.onEvent(callback);
        this.socket.emit(GetFileStatSocket.eventName, filepath);
    }
}