import logger = require('./logger');
import ServerUtility = require('./serverUtility');
import ProjectOperator = require('./projectOperator');

/**
 *
 */
class RunProjectEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'onRunProject';

    /**
     * @param socket
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(RunProjectEvent.eventName, (swfFilePath: string, host_passSet: { [name: string]: string }) => {
            const projectOperator = new ProjectOperator(swfFilePath);

            // TODDO set password and passphrase
            projectOperator.run(host_passSet);
            ServerUtility.updateProjectJsonState(swfFilePath, 'Running',
                () => {
                    socket.emit(RunProjectEvent.eventName, true);
                },
                () => {
                    socket.emit(RunProjectEvent.eventName, false);
                });
        });
    }
}

export = RunProjectEvent;