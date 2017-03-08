import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import serverConfig = require('./serverConfig');
import ServerUtility = require('./serverUtility');

class ReadTreeJsonEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'readTreeJson';

    /**
     *
     */
    private roodDirectory: string;

    /**
     *
     * @param socket
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(ReadTreeJsonEvent.eventName, (workflowJsonFilePath: string) => {
            this.roodDirectory = path.dirname(workflowJsonFilePath);
            try {
                logger.debug(`tree json=${workflowJsonFilePath}`);
                const createJsonFile = ServerUtility.createTreeJson(workflowJsonFilePath);
                socket.json.emit(ReadTreeJsonEvent.eventName, createJsonFile);
            }
            catch (error) {
                logger.error(error);
                socket.emit(ReadTreeJsonEvent.eventName);
            }
        });
    }
}

export = ReadTreeJsonEvent;