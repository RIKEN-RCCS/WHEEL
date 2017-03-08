"use strict";
var logger = require("./logger");
/**
 *
 */
var CreateFileEvent = (function () {
    function CreateFileEvent() {
    }
    /**
     *
     * @param socket
     */
    CreateFileEvent.prototype.onEvent = function (socket) {
        socket.on(CreateFileEvent.eventName, function (filepath, data) {
            // filepath = serverUtility.getTemplateFile(filepath, fileType);
            logger.info("create file=" + filepath);
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
    };
    return CreateFileEvent;
}());
/**
 * event name
 */
CreateFileEvent.eventName = 'onCreateFile';
module.exports = CreateFileEvent;
//# sourceMappingURL=createFileEvent.js.map