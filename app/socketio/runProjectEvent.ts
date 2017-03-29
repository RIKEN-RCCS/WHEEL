import fs = require('fs');
import path = require('path');
import logger = require('../logger');
import ServerConfig = require('../serverConfig');
import ServerUtility = require('../serverUtility');
import ServerSocketIO = require('./serverSocketIO');
import ProjectOperator = require('../projectOperator');

/**
 * socket io communication class for run project to server
 */
class RunProjectEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static eventName = 'onRunProject';

    /**
     * running state
     */
    private runningState: string = ServerConfig.getConfig().state.running;

    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(RunProjectEvent.eventName, (projectFilepath: string, host_passSet: { [name: string]: string }) => {
            this.updateProjectJson(projectFilepath, (err) => {
                if (err) {
                    logger.error(err);
                    socket.emit(RunProjectEvent.eventName, false);
                    return;
                }
                const projectOperator = new ProjectOperator(projectFilepath);
                projectOperator.run(host_passSet);
                socket.emit(RunProjectEvent.eventName, true);
            });
        });
    }

    /**
     * update project json data
     * @param projectFilepath project json file path
     * @param callback The function to call when we have finished update
     */
    private updateProjectJson(projectFilepath: string, callback: ((err?: Error) => void)) {
        fs.readFile(projectFilepath, (err, data) => {
            if (err) {
                callback(err);
                return;
            }

            const projectJson: SwfProjectJson = JSON.parse(data.toString());
            projectJson.state = this.runningState;
            fs.writeFile(projectFilepath, JSON.stringify(projectJson, null, '\t'), (err) => {
                if (err) {
                    callback(err);
                    return;
                }
                callback();
            });
        });
    }
}

export = RunProjectEvent;