import http = require('http');
import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import ServerUtility = require('./serverUtility');
import ServerConfig = require('./serverConfig');

class OpenProjectJsonEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'openProjectJson';

    /**
     * config parameter
     */
    private config = ServerConfig.getConfig();

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
                        // const createJson = ServerUtility.createProjectJson(path_project);
                        // socket.json.emit(OpenProjectJsonEvent.eventName, createJson);
                        // this.write(path_project, createJson, socket);
                    }
                    else {
                        const projectJson: SwfProjectJson = ServerUtility.readProjectJson(path_project);
                        if (projectJson.state === 'Planning') {
                            this.createProjectJson(path_project, projectJson, socket);
                        }
                        else {
                            this.updateProjectJson(path_project, projectJson, socket);
                        }
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
     *
     * @param path_project
     * @param projectJson
     * @param socket
     */
    private createProjectJson(path_project: string, projectJson: SwfProjectJson, socket: SocketIO.Socket) {
        const dir_project = path.dirname(path_project);
        const path_workflow = path.resolve(dir_project, projectJson.path_workflow);
        projectJson.log = ServerUtility.createLogJson(path_workflow);
        ServerUtility.writeJson(path_project, projectJson,
            () => {
                socket.json.emit(OpenProjectJsonEvent.eventName, projectJson);
            },
            () => {
                socket.json.emit(OpenProjectJsonEvent.eventName);
            });
    }

    /**
     *
     * @param path_project
     * @param projectJson
     * @param socket
     */
    private updateProjectJson(path_project: string, projectJson: SwfProjectJson, socket: SocketIO.Socket) {
        projectJson.log = ServerUtility.readLogJson(projectJson.log);
        ServerUtility.writeJson(path_project, projectJson,
            () => {
                socket.json.emit(OpenProjectJsonEvent.eventName, projectJson);
            },
            () => {
                socket.json.emit(OpenProjectJsonEvent.eventName);
            });
    }
}

export = OpenProjectJsonEvent;