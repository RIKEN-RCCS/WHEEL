import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import serverConfig = require('./serverConfig');
import serverUtility = require('./serverUtility');

/**
 *
 */
class CreateFileEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'onCreateFile';

    /**
     *
     * @param socket
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(CreateFileEvent.eventName, (filepath: string, data: (string | Buffer)) => {

            // filepath = serverUtility.getTemplateFile(filepath, fileType);
            logger.info(`create file=${filepath}`);
            // const templateFilePath = serverUtility.getTemplateFilePath(fileType);
            // fs.readFile(templateFilePath, (readErr, data) => {
            //     if (readErr) {
            //         logger.error(readErr);
            //         socket.emit(CreateFileEvent.eventName);
            //         return;
            //     }

            // let writeData: string;
            // if (fileType == CreateFileType.NewProject) {
            //     const json: SwfLogJson = JSON.parse(data.toString());
            //     const dirname = path.dirname(filepath);
            //     json.path = path.normalize(`${dirname}/${this.config.default_filename}${this.config.extension.workflow}`);
            //     writeData = JSON.stringify(json, null, '\t');
            // }
            // else {
            //     writeData = data.toString();
            // }

            // fs.writeFile(filepath, data, (writeErr) => {
            //     if (writeErr) {
            //         logger.error(writeErr);
            //         socket.emit(CreateFileEvent.eventName);
            //         return;
            //     }
            //     socket.emit(CreateFileEvent.eventName, filepath);
            // });
            // try {
            //     const rs = fs.createReadStream(this.selectReadFile(fileType))
            //         .on('error', function (err) {
            //             socket.emit(CreateFileEvent.eventName, false);
            //         });
            //     const ws = fs.createWriteStream(filename)
            //         .on('finish', (err) => {
            //             socket.emit(CreateFileEvent.eventName, true);
            //         })
            //         .on('error', (err) => {
            //             logger.error(err);
            //             socket.emit(CreateFileEvent.eventName, false);
            //         });
            //     rs.pipe(ws);
            // }
            // catch (err) {
            //     logger.error(err);
            //     socket.emit(CreateFileEvent.eventName, false);
            // }
            // });
        });
    }


}

export = CreateFileEvent;