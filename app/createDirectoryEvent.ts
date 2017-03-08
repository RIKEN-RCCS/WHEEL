import fs = require('fs');
import logger = require('./logger');

class CreateDirectoryEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'onCreateDirectory';

    /**
     *
     * @param socket
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(CreateDirectoryEvent.eventName, (directoryPath: string) => {
            logger.info(`create directory=${directoryPath}`);

            fs.mkdir(directoryPath, (err) => {
                if (err) {
                    logger.error(err);
                    socket.emit(CreateDirectoryEvent.eventName, false);
                }
                else {
                    socket.emit(CreateDirectoryEvent.eventName, true);
                }
            });
        });
    }
}

export = CreateDirectoryEvent;