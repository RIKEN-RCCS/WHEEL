import http = require('http');
import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import ProjectOperator = require('./projectOperator');
import ServerUtility = require('./serverUtility');
import ServerConfig = require('./serverConfig');

/**
 *
 */
class CleanProjectvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'cleanProject';

    /**
     *
     */
    private state: string = ServerConfig.getConfig().state.planning;

    /**
     *
     * @param socket
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(CleanProjectvent.eventName, (projectFilePath: string) => {
            const operator = new ProjectOperator(projectFilePath);
            operator.clean();

            fs.readFile(projectFilePath, (err, data) => {
                if (err) {
                    logger.error(err);
                    socket.emit(CleanProjectvent.eventName, false);
                    return
                }
                const projectJson: SwfProjectJson = JSON.parse(data.toString());
                projectJson.state = this.state;
                this.cleanupLogJson(projectJson.log);
                fs.writeFile(projectFilePath, JSON.stringify(projectJson, null, '\t'), (err) => {
                    if (err) {
                        logger.error(err);
                        socket.emit(CleanProjectvent.eventName, false);
                        return;
                    }
                    socket.emit(CleanProjectvent.eventName, true);
                });
            });
        });
    }

    /**
     *
     * @param json
     */
    private cleanupLogJson(logJson: SwfLogJson) {
        logJson.state = this.state;
        logJson.execution_start_date = '';
        logJson.execution_end_date = '';
        logJson.children.forEach(child => {
            this.cleanupLogJson(child);
        });
    }
}

export = CleanProjectvent;