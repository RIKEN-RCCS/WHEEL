import fs = require('fs');
import path = require('path');
import logger = require('../logger');
import ServerConfig = require('../serverConfig');
import ServerUtility = require('../serverUtility');
import ServerSocketIO = require('./serverSocketIO');

/**
 * socket io communication class for create new project to server
 */
class CreateNewProjectEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static readonly eventName = 'onCreateNewProject';

    /**
     * config parameter
     */
    private config = ServerConfig.getConfig();

    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(CreateNewProjectEvent.eventName, (directoryPath: string) => {
            const projectFileName: string = this.config.system_name;
            const workflowFileName: string = this.config.default_filename;

            const projectJson = ServerUtility.readTemplateProjectJson();
            const workflowJson = ServerUtility.readTemplateWorkflowJson();

            projectJson.path = `./${projectFileName}${this.config.extension.project}`;
            projectJson.path_workflow = `./${workflowFileName}${this.config.extension.workflow}`;

            workflowJson.name = `${workflowJson.name}1`;
            workflowJson.path = path.basename(directoryPath);

            const projectFilePath = path.join(directoryPath, projectJson.path);
            const workflowFilePath = path.join(directoryPath, projectJson.path_workflow);

            fs.mkdir(directoryPath, (mkdirErr) => {
                if (mkdirErr) {
                    logger.error(mkdirErr);
                    socket.emit(CreateNewProjectEvent.eventName);
                    return;
                }
                ServerUtility.writeJson(projectFilePath, projectJson, (err) => {
                    if (err) {
                        logger.error(err);
                        socket.emit(CreateNewProjectEvent.eventName);
                        return;
                    }
                    ServerUtility.writeJson(workflowFilePath, workflowJson, (err) => {
                        if (err) {
                            logger.error(err);
                            socket.emit(CreateNewProjectEvent.eventName);
                            return;
                        }
                        socket.emit(CreateNewProjectEvent.eventName, projectFilePath);
                    });
                });
            });
        });
    }
}

export = CreateNewProjectEvent;