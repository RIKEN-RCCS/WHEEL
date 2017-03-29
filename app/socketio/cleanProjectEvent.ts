import http = require('http');
import fs = require('fs');
import path = require('path');
import logger = require('../logger');
import ServerSocketIO = require('./serverSocketIO');
import ProjectOperator = require('../projectOperator');
import ServerConfig = require('../serverConfig');
import SwfState = require('../swfState');

/**
 * socket io communication class for cleaning project request to server
 */
class CleanProjectvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static eventName = 'cleanProject';

    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket) {
        socket.on(CleanProjectvent.eventName, (projectFilePath: string) => {
            const operator = new ProjectOperator(projectFilePath);
            operator.cleanAsync(() => {
                this.cleanProject(projectFilePath, (err) => {
                    if (err) {
                        logger.error(err);
                        socket.emit(CleanProjectvent.eventName, false);
                        return
                    }
                    socket.emit(CleanProjectvent.eventName, true);
                });
            });
        });
    }

    /**
     * clean project json
     * @param projectFilePath project json file path
     * @param callback The function to call when we clean project
     */
    private cleanProject(projectFilePath, callback: ((err?: Error) => void)) {
        fs.readFile(projectFilePath, (err, data) => {
            if (err) {
                callback(err);
                return
            }
            const projectJson: SwfProjectJson = JSON.parse(data.toString());
            projectJson.state = SwfState.PLANNING;
            fs.writeFile(projectFilePath, JSON.stringify(projectJson, null, '\t'), (err) => {
                if (err) {
                    callback(err);
                    return;
                }
                callback();
            });
        });
    }
}

export = CleanProjectvent;