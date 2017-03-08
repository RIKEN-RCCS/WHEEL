import fs = require('fs');
import logger = require('./logger');
import serverUtility = require('./serverUtility');

class DeleteHostEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'onDeleteHost';

    /**
     *
     * @param socket
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(DeleteHostEvent.eventName, (label: string) => {
            serverUtility.deleteHostInfo(label,
                (remoteHostList: SwfHostJson[]) => {
                    socket.emit(DeleteHostEvent.eventName, true);
                },
                () => {
                    socket.emit(DeleteHostEvent.eventName, false);
                })
        });
    }
}

export = DeleteHostEvent;