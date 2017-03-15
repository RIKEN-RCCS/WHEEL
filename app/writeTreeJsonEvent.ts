import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import serverUtility = require('./serverUtility');
import serverConfig = require('./serverConfig');

interface QueueDataType {
    directory: string;
    json: SwfTreeJson;
}

/**
 *
 */
class WriteTreeJsonEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'writeTreeJson';

    /**
     * error is occurred flag
     */
    private error: boolean;

    /**
     *
     */
    private queue: QueueDataType[] = [];

    /**
     *
     * @param socket
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(WriteTreeJsonEvent.eventName, (projectDirectory: string, json: SwfTreeJson) => {
            this.error = false;
            this.queue.length = 0;
            this.setQueue(projectDirectory, json);
            this.saveTreeJson(() => {
                socket.emit(WriteTreeJsonEvent.eventName, this.error);
            })
        });
    }

    /**
     *
     * @param callback
     */
    private saveTreeJson(callback: Function) {
        const data = this.queue.shift();
        if (!data) {
            callback();
            return;
        }

        const filename = serverUtility.getDefaultName(data.json.type);
        const oldDirectory = path.join(data.directory, data.json.oldPath);
        const newDirectory = path.join(data.directory, data.json.path);
        const filepath = path.join(newDirectory, filename);

        const error = (err) => {
            logger.error(err);
            this.error = true;
            this.saveTreeJson(callback);
        };

        const update = () => {
            this.generateJobScript(data, () => {
                const copy: SwfTreeJson = JSON.parse(JSON.stringify(data.json));
                delete copy.children;
                delete copy.oldPath;
                delete copy.script_param;
                fs.writeFile(filepath, JSON.stringify(copy, null, '\t'), (err) => {
                    if (err) {
                        logger.error(err);
                        this.error = true;
                    }
                    logger.info(`update file=${filepath}`);
                    this.saveTreeJson(callback);
                });
            });
        }

        const add = () => {
            fs.mkdir(newDirectory, (err) => {
                if (err) {
                    error(err);
                }
                else {
                    logger.info(`make    dir=${newDirectory}`);
                    update();
                }
            });
        };

        const rename = () => {
            fs.rename(oldDirectory, newDirectory, (err) => {
                if (err) {
                    error(err);
                }
                else {
                    logger.info(`rename  dir=${oldDirectory} to ${newDirectory}`);
                    update();
                }
            });
        };

        if (data.json.path === undefined) {
            // delete
        }
        else if (!data.json.oldPath) {
            add();
        }
        else if (data.json.path !== data.json.oldPath) {
            fs.stat(oldDirectory, (err, stat) => {
                if (err) {
                    error(err);
                }
                else if (stat.isDirectory()) {
                    rename();
                }
                else {
                    add();
                }
            });
        }
        else {
            fs.stat(filepath, (err, stat) => {
                if (err) {
                    add();
                }
                else if (stat.isFile()) {
                    update();
                }
                else {
                    add();
                }
            });
        }
    }

    /**
     *
     * @param parentDirectory
     * @param json
     */
    private setQueue(parentDirectory: string, json: SwfTreeJson): void {

        this.queue.push({
            directory: parentDirectory,
            json: json
        });

        const childDirectory = path.join(parentDirectory, json.path);
        if (json.children) {
            json.children.forEach(child => {
                this.setQueue(childDirectory, child);
            });
        }
    }

    /**
     *
     * @param json
     * @param callback
     */
    private generateJobScript(data: QueueDataType, callback: Function) {
        if (!serverUtility.IsTypeJob(data.json)) {
            callback();
            return;
        }

        const config = serverConfig.getConfig();
        const submitJobname = config.submit_script;
        const srcPath = path.join(__dirname, config.scheduler[data.json.host.job_scheduler]);
        const dstPath = path.join(data.directory, data.json.path, submitJobname);

        fs.stat(dstPath, (err, stat) => {
            if (err && data.json.job_script.path) {
                data.json.script.path = submitJobname;
                const format: { [key: string]: string } = {
                    '%%nodes%%': data.json.script_param.nodes.toString(),
                    '%%cores%%': data.json.script_param.cores.toString(),
                    '%%script%%': data.json.job_script.path
                };
                serverUtility.writeFileKeywordReplacedAsync(srcPath, dstPath, format, callback);
                logger.info(`create file=${dstPath}`);
            }
            callback();
        });
    }
}

export = WriteTreeJsonEvent;