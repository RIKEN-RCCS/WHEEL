import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import serverUtility = require('./serverUtility');

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
    private queue: { dir: string, tree: SwfTreeJson }[] = [];

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

        const copy: SwfTreeJson = JSON.parse(JSON.stringify(data.tree));

        const filename = serverUtility.getDefaultName(data.tree.type);
        const oldDirectory = path.join(data.dir, copy.oldPath);
        const newDirectory = path.join(data.dir, copy.path);
        const filepath = path.join(newDirectory, filename);

        delete copy.children;
        delete copy.oldPath;

        const error = (err) => {
            logger.error(err);
            this.error = true;
            this.saveTreeJson(callback);
        };

        const update = () => {
            fs.writeFile(filepath, JSON.stringify(copy, null, '\t'), (err) => {
                if (err) {
                    logger.error(err);
                    this.error = true;
                }
                logger.info(`update file=${filepath}`);
                this.saveTreeJson(callback);
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

        if (data.tree.path === undefined) {
            // delete
        }
        else if (!data.tree.oldPath) {
            add();
        }
        else if (data.tree.path !== data.tree.oldPath) {
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
            dir: parentDirectory,
            tree: json
        });

        const childDirectory = path.join(parentDirectory, json.path);
        if (json.children) {
            json.children.forEach(child => {
                this.setQueue(childDirectory, child);
            });
        }
    }
}

export = WriteTreeJsonEvent;