import fs = require('fs');
import logger = require('../logger');
import ServerUtility = require('../serverUtility');
import ServerSocketIO = require('./serverSocketIO');

/**
 * socket io communication class for delete host information from server
 */
class DeleteHostEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static eventName = 'onDeleteHost';

    /**
     * Adds a listener for this event
     * @param socket socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(DeleteHostEvent.eventName, (name: string) => {
            ServerUtility.deleteHostInfo(name, (err) => {
                if (err) {
                    logger.error(err);
                    socket.emit(DeleteHostEvent.eventName, false);
                }
                else {
                    socket.emit(DeleteHostEvent.eventName, true);
                }
            });
        });
    }
}
export = DeleteHostEvent;