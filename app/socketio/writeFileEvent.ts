import fs = require('fs');
import logger = require('../logger');
import ServerSocketIO = require('./serverSocketIO');

/**
 * socket io communication class for write file to server
 */
class WriteFileEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static eventName = 'writeFile';

    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(WriteFileEvent.eventName, (filepath: string, data) => {
            fs.writeFile(filepath, data, (err) => {
                if (err) {
                    logger.error(err);
                    socket.emit(WriteFileEvent.eventName, false);
                    return;
                }
                socket.emit(WriteFileEvent.eventName, true);
            });
        });
    }

}

export = WriteFileEvent;