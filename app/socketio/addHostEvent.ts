import fs = require('fs');
import logger = require('../logger');
import ServerUtility = require('../serverUtility');
import ServerSocketIO = require('./serverSocketIO');

/**
 * socket io communication class for addidg host informattion to server
 */
class AddHostEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static readonly eventName = 'onAddHost';

    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(AddHostEvent.eventName, (hostInfo: SwfHostJson) => {
            ServerUtility.addHostInfo(hostInfo, (err) => {
                if (err) {
                    logger.error(err);
                    socket.emit(AddHostEvent.eventName, false);
                }
                else {
                    socket.emit(AddHostEvent.eventName, true);
                }
            });
        });
    }
}

export = AddHostEvent;