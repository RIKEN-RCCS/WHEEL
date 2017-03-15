import fs = require('fs');
import path = require('path');
import logger = require('./logger');

/**
 *
 */
class GetFileStatEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'onGetFileStat';

    /**
     *
     * @param socket
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(GetFileStatEvent.eventName, (filepath: string) => {
            fs.stat(filepath, (err, stats: fs.Stats) => {
                if (err) {
                    // logger.error(err);
                    socket.emit(GetFileStatEvent.eventName);
                }
                else {
                    socket.json.emit(GetFileStatEvent.eventName, stats);
                }
            });
        });
    }
}

export = GetFileStatEvent;