import fs = require('fs');
import logger = require('./logger');

class UploadFileEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'onUploadFile';

    /**
     *
     * @param socket
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(UploadFileEvent.eventName, (path: string, data: Buffer) => {
            const writeStream = fs.createWriteStream(path);
            writeStream
                .on('error', (err) => {
                    logger.error(err);
                    socket.emit(UploadFileEvent.eventName, false);
                })
                .on('close', (err) => {
                    logger.info(`upload file=${path}`);
                    socket.emit(UploadFileEvent.eventName, true);
                });

            writeStream.write(data, 'binary');
            writeStream.end();
        });
    }
}

export = UploadFileEvent;