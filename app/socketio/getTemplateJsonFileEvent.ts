import fs = require('fs');
import path = require('path');
import logger = require('../logger');
import ServerUtility = require('../serverUtility');
import ServerSocketIO = require('./serverSocketIO');

/**
 * socket io communication class for template json file from server
 */
class GetTemplateJsonFileEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static readonly eventName = 'onGetJsonFile';

    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(GetTemplateJsonFileEvent.eventName, (filetype: SwfType) => {
            const filepath = ServerUtility.getTypeOfJson(filetype).getTemplateFilePath();
            fs.readFile(filepath, (err, data) => {
                if (err) {
                    logger.error(err);
                    socket.emit(GetTemplateJsonFileEvent.eventName);
                }
                else {
                    socket.json.emit(GetTemplateJsonFileEvent.eventName, JSON.parse(data.toString()));
                }
            });
        });
    }
}

export = GetTemplateJsonFileEvent;