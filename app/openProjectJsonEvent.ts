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
    private queue: SwfLogJson[] = [];

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
                        if (projectJson.state === this.config.state.planning) {
                            this.createProjectJson(path_project, projectJson, socket);
                        }
                        else {
                            this.queue.length = 0;
                            this.setQueue(projectJson.log);
                            this.updateLogJson(() => {
                                projectJson.state = projectJson.log.state;
                                ServerUtility.writeJson(path_project, projectJson,
                                    () => {
                                        socket.json.emit(OpenProjectJsonEvent.eventName, projectJson);
                                    },
                                    () => {
                                        socket.json.emit(OpenProjectJsonEvent.eventName);
                                    });
                            });
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
     * @param json
     */
    private setQueue(json: SwfLogJson): void {
        this.queue.push(json);
        if (json.children) {
            json.children.forEach(child => {
                this.setQueue(child);
            });
        }
    }

    /**
     *
     * @param callback
     */
    private updateLogJson(callback: Function) {
        const json = this.queue.shift();
        if (!json) {
            callback();
            return;
        }

        const logFilePath = path.join(json.path, `${this.config.system_name}.log`);
        fs.readFile(logFilePath, (err, data) => {
            if (!err) {
                const readJson: SwfLogJson = JSON.parse(data.toString());
                json.state = readJson.state;
                json.execution_start_date = readJson.execution_start_date;
                json.execution_end_date = readJson.execution_end_date;
            }
            this.updateLogJson(callback);
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
}

export = OpenProjectJsonEvent;