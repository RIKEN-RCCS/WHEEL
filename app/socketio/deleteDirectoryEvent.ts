import fs = require('fs');
import path = require('path');
import logger = require('../logger');
import ServerUtility = require('../serverUtility');
import ServerSocketIO = require('./serverSocketIO');

/**
 * socket io communication class for delete directory from server
 */
class DeleteDirectoryEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static readonly eventName = 'onDeleteDirectory';

    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(DeleteDirectoryEvent.eventName, (directorys: string[]) => {
            (function loop() {
                const directory = directorys.shift();
                if (!directory) {
                    socket.emit(DeleteDirectoryEvent.eventName);
                    return;
                }
                ServerUtility.unlinkDirectoryAsync(directory, (err) => {
                    if (!err) {
                        logger.info(`delete  dir=${directory}`);
                    }
                    loop();
                });
            })();
        });
    }
}

export = DeleteDirectoryEvent;