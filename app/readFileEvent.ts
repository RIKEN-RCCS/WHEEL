import fs = require('fs');
import logger = require('./logger');
import ServerSocketIO = require('./serverSocketIO');

/**
 * socket io communication class for read file data from server
 */
class ReadFileEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static eventName = 'readFile';

    /**
     * Adds a listener for this event
     * @param socket socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(ReadFileEvent.eventName, (readFilePath: string) => {
            fs.readFile(readFilePath, (err, data) => {
                if (err) {
                    logger.error(err);
                    socket.emit(ReadFileEvent.eventName);
                    return;
                }
                socket.emit(ReadFileEvent.eventName, data.toString());
            });
        });
    }
}

export = ReadFileEvent;