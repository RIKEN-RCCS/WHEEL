import fs = require('fs');
import path = require('path');
import logger = require('../logger');
import ServerUtility = require('../serverUtility');
import ServerConfig = require('../serverConfig');
import ServerSocketIO = require('./serverSocketIO');

/**
 * json data path
 */
interface JsonDataPath {
    /**
     * directory name
     */
    directory: string;
    /**
     * tree json data
     */
    json: SwfTreeJson;
}

/**
 * socket io communication class for write SwfTreeJson information to server
 */
class WriteTreeJsonEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static eventName = 'writeTreeJson';

    /**
     * error flag
     */
    private error: boolean;

    /**
     * queue of json data path
     */
    private queue: JsonDataPath[] = [];

    /**
     * Adds a listener for this event
     * @param socket socket io instance
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
     * save tree json
     * @param callback The function to call when we save tree json
     */
    private saveTreeJson(callback: (() => void)) {
        const data = this.queue.shift();
        if (!data) {
            callback();
            return;
        }

        const filename = ServerUtility.getDefaultName(data.json.type);
        const oldDirectory = path.join(data.directory, data.json.oldPath);
        const newDirectory = path.join(data.directory, data.json.path);
        const filepath = path.join(newDirectory, filename);

        const error = (err) => {
            logger.error(err);
            this.error = true;
            this.saveTreeJson(callback);
        };

        const update = () => {
            this.generateSubmitScript(data, (err: Error) => {
                if (err) {
                    error(err);
                    return;
                }
                const copy = JSON.parse(JSON.stringify(data.json));
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
     * set data to queue
     * @param parentDirectory parent tree directory
     * @param json tree json data
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
     * genereta submic script
     * @param data json data path
     * @param callback The function to call when we generate submit script
     */
    private generateSubmitScript(data: JsonDataPath, callback: ((err?: Error) => void)) {
        if (!ServerUtility.isTypeJob(data.json)) {
            callback();
            return;
        }

        const config = ServerConfig.getConfig();
        const submitJobname = config.submit_script;
        const jobJson = <SwfJobJson><any>data.json;
        const srcPath = path.join(__dirname, config.scheduler[jobJson.remote.job_scheduler]);
        const dstPath = path.join(data.directory, data.json.path, submitJobname);

        fs.stat(dstPath, (err, stat) => {
            if (err && jobJson.job_script.path) {
                jobJson.script.path = submitJobname;
                const format: { [key: string]: string } = {
                    '%%nodes%%': jobJson.script_param.nodes.toString(),
                    '%%cores%%': jobJson.script_param.cores.toString(),
                    '%%script%%': jobJson.job_script.path
                };
                ServerUtility.writeFileKeywordReplacedAsync(srcPath, dstPath, format, callback);
                logger.info(`create file=${dstPath}`);
                return;
            }
            callback();
        });
    }
}

export = WriteTreeJsonEvent;