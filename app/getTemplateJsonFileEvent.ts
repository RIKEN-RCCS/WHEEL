import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import serverUtility = require('./serverUtility');

/**
 *
 */
class getTemplateJsonFileEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'onGetJsonFile';

    /**
     *
     * @param socket
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(getTemplateJsonFileEvent.eventName, (filetype: JsonFileType) => {
            const filepath = serverUtility.getTemplateFilePath(filetype);
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