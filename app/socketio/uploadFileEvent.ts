import fs = require('fs');
import path = require('path');
import logger = require('../logger');
import ServerSocketIO = require('./serverSocketIO');

/**
 * socket io communication class for upload file to server
 */
class UploadFileEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static eventName = 'onUploadFile';

    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(UploadFileEvent.eventName, (filepath: string, data: Buffer) => {
            const writeStream = fs.createWriteStream(filepath);
            writeStream
                .on('error', (err) => {
                    logger.error(err);
                    socket.emit(UploadFileEvent.eventName, false);
                })
                .on('close', (err) => {
                    logger.info(`upload file=${filepath}`);
                    socket.emit(UploadFileEvent.eventName, true, path.basename(filepath));
                });

            writeStream.write(data, 'binary');
            writeStream.end();
        });
    }
}

export = UploadFileEvent;