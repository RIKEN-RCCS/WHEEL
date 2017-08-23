import fs = require('fs');
import path = require('path');
import logger = require('../logger');
import ServerSocketIO = require('./serverSocketIO');

/**
 * uplodad file data
 */
interface UploadedFileData {
    /**
     * uplodad file size
     */
    uploaded: number;
    /**
     * uploaded data
     */
    data: any;
    /**
     * total size
     */
    readonly size: number;
    /**
     * file handler
     */
    readonly handler: number;
}

/**
 * socket io communication class for upload file to server
 */
class UploadFileEvent implements ServerSocketIO.SocketListener {

    /**
     * upload file data
     */
    private upload: { [filepath: string]: UploadedFileData } = {};

    /**
     * write threshold size (kb)
     */
    private readonly writeThreshold = 32 * 1024 * 1024;

    /**
     * upload ready event
     */
    private readonly readyEventName = 'onUploadReady';

    /**
     * upload start event
     */
    private readonly startEventName = 'onUploadStart';

    /**
     * upload done event
     */
    private readonly doneEventName = 'onUploadDone';

    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket): void {

        const openFile = (filepath: string, size: number) => {
            fs.open(filepath, 'a', 755, (err: NodeJS.ErrnoException, fd: number) => {
                if (err) {
                    logger.error(err);
                    socket.emit(this.doneEventName, false, filepath);
                    return;
                }
                this.upload[filepath] = {
                    uploaded: 0,
                    size: size,
                    data: '',
                    handler: fd
                };
                socket.emit(this.startEventName, this.upload[filepath].uploaded, filepath);
            });
        };

        const closeFile = (filepath: string, isSucceed: boolean) => {
            const file = this.upload[filepath];
            fs.close(file.handler, (err) => {
                if (err) {
                    logger.error(err);
                    socket.emit(this.doneEventName, isSucceed, filepath);
                    delete this.upload.filepath;
                }
                else {
                    fs.chmod(filepath, '664', (err) => {
                        if (err) {
                            logger.error(err);
                        }
                        socket.emit(this.doneEventName, isSucceed, filepath);
                        delete this.upload.filepath;
                    });
                }
            });
        };

        const appendFile = (filepath: string, callback?: (() => void)) => {
            const file = this.upload[filepath];
            fs.write(file.handler, file.data, null, 'Binary', (err, witten, str) => {
                logger.info(`progress:${path.basename(filepath)}:${file.uploaded}/${file.size}`);
                if (err) {
                    logger.error(err);
                    closeFile(filepath, false);
                    return;
                }
                file.data = '';
                if (callback) {
                    callback();
                }
            });
        };

        socket
            .on(this.startEventName, (filepath: string, data: any) => {
                const file = this.upload[filepath];
                file.uploaded += data.length;
                file.data += data;

                if (file.uploaded !== file.size) {
                    if (file.data.length >= this.writeThreshold) {
                        appendFile(filepath);
                    }
                    socket.emit(this.startEventName, file.uploaded, filepath);
                }
                else {
                    appendFile(filepath, () => {
                        closeFile(filepath, true);
                        logger.info(`upload file=${filepath}`);
                    });
                }
            })
            .on(this.readyEventName, (filepath: string, size: number) => {
                fs.unlink(filepath, (err) => {
                    openFile(filepath, size);
                });
            });
    }
}

export = UploadFileEvent;