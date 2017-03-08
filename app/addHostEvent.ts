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
            serverUtility.addHostInfo(hostInfo,
                (remoteHostList: SwfHostJson[]) => {
                    socket.emit(AddHostEvent.eventName, true);
                },
                () => {
                    socket.emit(AddHostEvent.eventName, false);
                });
        });
    }
}

export = AddHostEvent;