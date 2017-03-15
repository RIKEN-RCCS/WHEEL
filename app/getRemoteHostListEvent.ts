import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import swfUtility = require('./serverUtility');

/**
 *
 */
class GetRemoteHostListEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'onGetRemoteHostList';

    /**
     *
     * @param socket
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(GetRemoteHostListEvent.eventName, () => {
            swfUtility.getHostInfo((err, hostList) => {
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