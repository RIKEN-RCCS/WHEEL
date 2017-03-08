import logger = require('./logger');
import ProjectOperator = require('./projectOperator')

class RunProjectEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'onRunProject';

    /**
     * @param socket:
     * @return none
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(RunProjectEvent.eventName, (swfFilePath: string) => {
            const projectOperator = new ProjectOperator(swfFilePath);
            projectOperator.run();
            socket.emit(RunProjectEvent.eventName, "Running");
        });
    }
}

export = RunProjectEvent;