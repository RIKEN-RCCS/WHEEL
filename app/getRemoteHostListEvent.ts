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
            swfUtility.getHostInfo(
                (hostList: SwfHostJson[]): void => {
                    socket.json.emit(GetRemoteHostListEvent.eventName, hostList);
                },
                (): void => {
                    socket.emit(GetRemoteHostListEvent.eventName);
                });
        });
    }
}

export = GetRemoteHostListEvent;