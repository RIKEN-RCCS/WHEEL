import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import serverConfig = require('./serverConfig');
import ServerUtility = require('./serverUtility');

class ReadFileEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'readFile';

    /**
     *
     */
    private roodDirectory: string;

    /**
     *
     * @param socket
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(ReadFileEvent.eventName,  (editFilePath: string) => {
            fs.readFile(editFilePath, (err, data) => {
                if (err) {
                    logger.error(err);
                    socket.emit(ReadFileEvent.eventName);
                    return;
                }
                socket.emit(ReadFileEvent.eventName, data);
            });
        });
    }
}

export = ReadFileEvent;