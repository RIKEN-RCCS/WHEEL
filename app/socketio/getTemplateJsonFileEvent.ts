import fs = require('fs');
import path = require('path');
import logger = require('../logger');
import ServerUtility = require('../serverUtility');
import ServerSocketIO = require('./serverSocketIO');

/**
 * socket io communication class for template json file from server
 */
class getTemplateJsonFileEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static eventName = 'onGetJsonFile';

    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(getTemplateJsonFileEvent.eventName, (filetype: SwfType) => {
            const filepath = ServerUtility.getTemplateFilePath(filetype);
            fs.readFile(filepath, (err, data) => {
                if (err) {
                    logger.error(err);
                    socket.emit(getTemplateJsonFileEvent.eventName);
                }
                else {
                    socket.json.emit(getTemplateJsonFileEvent.eventName, JSON.parse(data.toString()));
                }
            });
        });
    }
}

export = getTemplateJsonFileEvent;