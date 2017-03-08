import http = require('http');
import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import ServerUtility = require('./serverUtility');
import serverConfig = require('./serverConfig');

class OpenProjectJsonEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'openProjectJson';

    /**
     * config parameter
     */
    private config = serverConfig.getConfig();

    /**
     *
     */
    private extension = this.config.extension;

    /**
     *
     * @param socket
     */
    public onEvent(socket: SocketIO.Socket): void {

        socket.on(OpenProjectJsonEvent.eventName, (path_project: string) => {
            fs.readFile(path_project, (err, data) => {
                try {
                    if (err) {
                        // logger.error(err);
                        // TODO TSURUTA create template project.
                        const createJson = ServerUtility.createProjectJson(path_project);
                        socket.json.emit(OpenProjectJsonEvent.eventName, createJson);
                        this.writeProjectJsonFile(path_project, createJson);
                    }
                    else {
                        const projectJson: SwfProjectJson = ServerUtility.readProjectJson(path_project);
                        if (projectJson.state === 'Planning') {
                            // update log
                            const dir_project = path.dirname(path_project);
                            const path_workflow = path.resolve(dir_project, projectJson.path_workflow);
                            projectJson.log = ServerUtility.createLogJson(path_workflow);
                            this.writeProjectJsonFile(path_project, projectJson);
                        }
                        socket.json.emit(OpenProjectJsonEvent.eventName, projectJson);
                    }
                }
                catch (error) {
                    logger.error(error);
                    socket.emit(OpenProjectJsonEvent.eventName);
                }
            });
        });
    }

    /**
     * create project json file
     * @param workflowJsonFile most parent json file name
     * @param json created json file
     */
    private writeProjectJsonFile(path_project: string, json: SwfProjectJson): void {
        if (json == null) {
            return;
        }

        fs.writeFile(path_project, JSON.stringify(json, null, '\t'), (err) => {
            if (err) {
                logger.error(err);
            }
        });
    }
}

export = OpenProjectJsonEvent;