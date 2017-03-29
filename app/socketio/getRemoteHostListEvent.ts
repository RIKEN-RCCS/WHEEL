import fs = require('fs');
import path = require('path');
import logger = require('../logger');
import ServerUtility = require('../serverUtility');
import ServerSocketIO = require('./serverSocketIO');

/**
 * socket io communication class for getting host information from server
 */
class GetRemoteHostListEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static eventName = 'onGetRemoteHostList';

    /**
     * Adds a listener for connect event
     * @param socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(GetRemoteHostListEvent.eventName, () => {
            ServerUtility.getHostInfo((err, hostList) => {
                if (err) {
                    logger.error(err);
                    socket.emit(GetRemoteHostListEvent.eventName);
                }
                else if (!hostList) {
                    logger.error('host list does not exist');
                    socket.emit(GetRemoteHostListEvent.eventName);
                }
                else {
                    socket.json.emit(GetRemoteHostListEvent.eventName, hostList);
                }
            });
        });
    }
}

export = GetRemoteHostListEvent;