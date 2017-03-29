/**
 * file status interface
 */
interface FileStat {
    /**
     * device id
     */
    readonly dev: number;
    /**
     * inode number
     */
    readonly ino: number;
    /**
     * access mode
     */
    readonly mode: number;
    /**
     * hard link number
     */
    readonly nlink: number;
    /**
     * user id
     */
    readonly uid: number;
    /**
     * group id
     */
    readonly gid: number;
    /**
     * special device id
     */
    readonly rdev: number;
    /**
     * file size (byte)
     */
    readonly size: number;
    /**
     * block size
     */
    readonly blksize: number;
    /**
     * block number
     */
    readonly blocks: number;
    /**
     * last access time
     */
    readonly atime: string;
    /**
     * last modify time
     */
    readonly mtime: string;
    /**
     * last change time
     */
    readonly ctime: string;
    /**
     * file birth time
     */
    readonly birthtime: string;
}

/**
 * socket io communication class for gettingfile status
 */
class GetFileStatSocket {

    /**
     * event name
     */
    private static eventName = 'onGetFileStat';

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
     * Adds a listener for connect event that will be invoked a single time before being automatically removed
     * @param filename
     * @param callback The function to call when we get this event
     */
    public onConnect(filename: string, callback: ((stat: FileStat) => void)): void {
        this.socket
            .on('connect', () => {
                this.emit(filename, callback);
            });
    }

    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get this event
     */
    public onEvent(callback: ((stat: FileStat) => void)): void {
        this.socket.once(GetFileStatSocket.eventName, callback);
    }

    /**
     * emit to server for gettingfile status
     * @param filepath
     * @param callback The function to call when we get this event
     */
    public emit(filepath: string, callback: ((stat: FileStat) => void)): void {
        this.onEvent(callback);
        this.socket.emit(GetFileStatSocket.eventName, filepath);
    }
}