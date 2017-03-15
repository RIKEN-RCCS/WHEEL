import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import serverUtility = require('./serverUtility');
import serverConfig = require('./serverConfig');

/**
 *
 */
class WriteFileEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'writeFile';

    /**
     * error is occurred flag
     */
    private error: boolean;

    /**
     *
     * @param socket
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