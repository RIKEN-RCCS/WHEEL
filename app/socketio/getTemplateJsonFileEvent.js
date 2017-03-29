"use strict";
var fs = require("fs");
var logger = require("../logger");
var ServerUtility = require("../serverUtility");
/**
 * socket io communication class for template json file from server
 */
var getTemplateJsonFileEvent = (function () {
    function getTemplateJsonFileEvent() {
    }
    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    getTemplateJsonFileEvent.prototype.onEvent = function (socket) {
        socket.on(getTemplateJsonFileEvent.eventName, function (filetype) {
            var filepath = ServerUtility.getTemplateFilePath(filetype);
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