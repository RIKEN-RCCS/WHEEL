import http = require('http');
import fs = require('fs');
import path = require('path');
import logger = require('../logger');
import ServerUtility = require('../serverUtility');
import ServerConfig = require('../serverConfig');
import ServerSocketIO = require('./serverSocketIO');
import SwfState = require('../swfState');
import SwfType = require('../swfType');

/**
 * socket io communication class for getting project json from server
 */
class OpenProjectJsonEvent implements ServerSocketIO.SocketListener {

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
     * Adds a listener for connect event
     * @param socket socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(OpenProjectJsonEvent.eventName, (projectFilepath: string) => {
            fs.readFile(projectFilepath, (err, data) => {
                try {
                    if (err) {
                        logger.error(err);
                        socket.emit(OpenProjectJsonEvent.eventName);
                        return;
                    }
                    const projectJson: SwfProjectJson = JSON.parse(data.toString());
                    this.createProjectJson(projectFilepath, projectJson);

                    if (projectJson.state === SwfState.PLANNING) {
                        socket.json.emit(OpenProjectJsonEvent.eventName, projectJson);
                    }
                    else {
                        this.queue.length = 0;
                        this.setQueue(projectJson.log);
                        this.updateLogJson(() => {
                            projectJson.state = projectJson.log.state;
                            socket.json.emit(OpenProjectJsonEvent.eventName, projectJson);
                        });
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
     * rename log json path
     * @param logJson log json data
     * @param from string befor conversion
     * @param to string after conversion
     */
    private renameLogjsonPath(logJson: SwfLogJson, from: string, to: string) {
        logJson.path = logJson.path.replace(from, to);
        logJson.children.forEach(child => {
            this.renameLogjsonPath(child, from, to);
        });
    };


    /**
     * set queue scpecified log json data
     * @param logJson log json data
     */
    private setQueue(logJson: SwfLogJson) {
        this.queue.push(logJson);

        for (let index = logJson.children.length - 1; index >= 0; index--) {
            const child = logJson.children[index];
            if (child.type !== SwfType.FOR && child.type !== SwfType.PSTUDY) {
                this.setQueue(child);
                continue;
            }
            const basename = path.basename(child.path);
            const files = fs.readdirSync(logJson.path);
            const newChildren: SwfLogJson[] = [];
            const regexp = new RegExp(`^${basename}_([0-9]+)$`);
            files.forEach(file => {
                if (file.match(regexp)) {
                    const newLogJson: SwfLogJson = {
                        name: `${child.name}_${RegExp.$1}`,
                        path: `${child.path}_${RegExp.$1}`,
                        description: child.description,
                        type: child.type,
                        state: child.state,
                        execution_start_date: '',
                        execution_end_date: '',
                        order: child.order,
                        children: JSON.parse(JSON.stringify(child.children))
                    };
                    newLogJson.children.forEach(newChild => {
                        this.renameLogjsonPath(newChild, child.path, newLogJson.path);
                    });
                    newChildren.push(newLogJson);
                }
            });
            logJson.children.splice(index, 1);
            newChildren
                .sort((a, b) => {
                    const aIndex = parseInt(a.path.match(/([0-9]+)$/)[1]);
                    const bIndex = parseInt(b.path.match(/([0-9]+)$/)[1]);
                    if (aIndex < bIndex) {
                        return 1;
                    }
                    else {
                        return -1;
                    }
                })
                .forEach(newChild => {
                    logJson.children.splice(index, 0, newChild);
                    this.setQueue(newChild);
                });
        }
    }

    /**
     * update log json data
     * @param callback The function to call when we have updated log json
     */
    private updateLogJson(callback: (() => void)) {
        const logJson = this.queue.shift();
        if (!logJson) {
            callback();
            return;
        }

        if (ServerUtility.isProjectFinished(logJson)) {
            this.updateLogJson(callback);
            return;
        }

        const logFilePath = path.join(logJson.path, `${this.config.system_name}.log`);
        fs.readFile(logFilePath, (err, data) => {
            if (!err) {
                const readJson: SwfLogJson = JSON.parse(data.toString());
                logJson.state = readJson.state;
                logJson.execution_start_date = readJson.execution_start_date;
                logJson.execution_end_date = readJson.execution_end_date;
            }
            this.updateLogJson(callback);
        });
    }

    /**
     * create project new project json
     * @param projectPath project json file path
     * @param projectJson project json data
     */
    private createProjectJson(projectPath: string, projectJson: SwfProjectJson) {
        const dir_project = path.dirname(projectPath);
        const path_workflow = path.resolve(dir_project, projectJson.path_workflow);
        projectJson.log = ServerUtility.createLogJson(path_workflow);
    }
}

export = OpenProjectJsonEvent;