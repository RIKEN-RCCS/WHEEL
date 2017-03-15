import fs = require('fs');
import logger = require('./logger');
import serverUtility = require('./serverUtility');

/**
 *
 */
class AddHostEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'onAddHost';

    /**
     *
     * @param socket
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(AddHostEvent.eventName, (hostInfo: SwfHostJson) => {
            serverUtility.addHostInfo(hostInfo, (err) => {
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