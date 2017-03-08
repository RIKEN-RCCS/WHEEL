"use strict";
var fs = require("fs");
var logger = require("./logger");
var serverUtility = require("./serverUtility");
/**
 *
 */
var getTemplateJsonFileEvent = (function () {
    function getTemplateJsonFileEvent() {
    }
    /**
     *
     * @param socket
     */
    getTemplateJsonFileEvent.prototype.onEvent = function (socket) {
        socket.on(getTemplateJsonFileEvent.eventName, function (filetype) {
            var filepath = serverUtility.getTemplateFilePath(filetype);
            fs.readFile(filepath, function (err, data) {
                if (err) {
                    logger.error(err);
                    socket.emit(getTemplateJsonFileEvent.eventName);
                }
                else {
                    socket.json.emit(getTemplateJsonFileEvent.eventName, JSON.parse(data.toString()));
                }
            });
        });
    };
    return getTemplateJsonFileEvent;
}());
/**
 * event name
 */
getTemplateJsonFileEvent.eventName = 'onGetJsonFile';
module.exports = getTemplateJsonFileEvent;
//# sourceMappingURL=getTemplateJsonFileEvent.js.map