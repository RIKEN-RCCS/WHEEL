import path = require('path');
import logger = require('../logger');
import serverConfig = require('../serverConfig');
import ServerUtility = require('../serverUtility');
import ServerSocketIO = require('./serverSocketIO');

/**
 * socket io communication class for read tree json from server
 */
class ReadTreeJsonEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static readonly eventName = 'readTreeJson';

    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(ReadTreeJsonEvent.eventName, (workflowJsonFilePath: string) => {
            const roodDirectory = path.dirname(workflowJsonFilePath);
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