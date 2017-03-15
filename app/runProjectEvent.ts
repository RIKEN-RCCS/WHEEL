import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import ServerConfig = require('./serverConfig');
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
     *
     */
    private config = ServerConfig.getConfig();

    /**
     * @param socket
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(RunProjectEvent.eventName, (swfFilePath: string, host_passSet: { [name: string]: string }) => {

            // TODDO set password and passphrase
            this.updateProjectJson(swfFilePath, (err) => {
                if (err) {
                    logger.error(err);
                    socket.emit(RunProjectEvent.eventName, false);
                    return;
                }
                const projectOperator = new ProjectOperator(swfFilePath);
                projectOperator.run(host_passSet);
                socket.emit(RunProjectEvent.eventName, true);
            });
        });
    }

    /**
     *
     * @param filepath
     * @param callback
     */
    private updateProjectJson(filepath: string, callback: ((err?: Error) => void)) {
        fs.readFile(filepath, (err, data) => {
            if (err) {
                callback(err);
                return;
            }

            const projectJson: SwfProjectJson = JSON.parse(data.toString());
            projectJson.state = this.config.state.running;
            this.updateLogJson(projectJson.log);
            fs.writeFile(filepath, JSON.stringify(projectJson, null, '\t'), (err) => {
                if (err) {
                    callback(err);
                    return;
                }
                callback();
            });
        });
    }

    /**
     *
     * @param logJson
     */
    private updateLogJson(logJson: SwfLogJson) {
        for (let index = logJson.children.length - 1; index >= 0; index--) {

            const child = logJson.children[index];
            if (!ServerUtility.IsTypeLoop(child)) {
                this.updateLogJson(child);
                continue;
            }

            const loopFilename = ServerUtility.getDefaultName(child.type);
            const loopJsonFilepath = path.join(child.path, loopFilename);

            try {
                const data = fs.readFileSync(loopJsonFilepath);
                const loopJson: SwfLoopJson = JSON.parse(data.toString());
                const forParam: ForParam = loopJson.forParam;
                const newChildren: SwfLogJson[] = [];
                for (let loop = forParam.start; loop <= forParam.end; loop += forParam.step) {
                    const newLoop: SwfLogJson = {
                        name: `${child.name}[${loop}]`,
                        path: `${child.path}[${loop}]`,
                        description: child.description,
                        type: child.type,
                        state: child.state,
                        execution_start_date: '',
                        execution_end_date: '',
                        children: JSON.parse(JSON.stringify(child.children))
                    };
                    newChildren.push(newLoop);
                }
                logJson.children.splice(index, 1);
                newChildren.reverse().forEach(newChild => {
                    logJson.children.splice(index, 0, newChild);
                });
            }
            catch (err) {
                logger.error(err);
            }

            this.updateLogJson(child);
        }
    }
}

export = RunProjectEvent;