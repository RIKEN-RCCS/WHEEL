import fs = require('fs');
import path = require('path');
import logger = require('../logger');
import ServerSocketIO = require('./serverSocketIO');

/**
 * socket io communication class for gettingfile status
 */
class GetFileStatEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static readonly eventName = 'onGetFileStat';

    /**
     * Adds a listener for this event
     * @param socket socket io instance
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