import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import serverConfig = require('./serverConfig');

class OpenTaskJsonEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'openTaskJson';

    /**
     * config parameter
     */
    private config = serverConfig.getConfig();

    /**
     *
     */
    private swfExtension = this.config.extension.workflow;

    /**
     *
     */
    private taskExtension = this.config.extension.task;

    /**
     * @param socket:
     * @return none
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(OpenTaskJsonEvent.eventName, (taskJsonFilePath: string) => {
            if (!taskJsonFilePath.match(new RegExp(`(?:${this.swfExtension}|${this.taskExtension})$`))) {
                socket.emit(OpenTaskJsonEvent.eventName);
            }
            fs.readFile(taskJsonFilePath, (err, data) => {
                if (err) {
                    logger.error(err);
                    socket.emit(OpenTaskJsonEvent.eventName);
                    return;
                }

                socket.json.emit(OpenTaskJsonEvent.eventName, JSON.parse(data.toString()));
            });
        });
    }
}

export = OpenTaskJsonEvent;