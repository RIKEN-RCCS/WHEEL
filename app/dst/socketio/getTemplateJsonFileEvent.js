"use strict";
var fs = require("fs");
var logger = require("../logger");
var ServerUtility = require("../serverUtility");
/**
 * socket io communication class for template json file from server
 */
var GetTemplateJsonFileEvent = (function () {
    function GetTemplateJsonFileEvent() {
    }
    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    GetTemplateJsonFileEvent.prototype.onEvent = function (socket) {
        socket.on(GetTemplateJsonFileEvent.eventName, function (filetype) {
            var filepath = ServerUtility.getTypeOfJson(filetype).getTemplateFilePath();
            fs.readFile(filepath, function (err, data) {
                if (err) {
                    logger.error(err);
                    socket.emit(GetTemplateJsonFileEvent.eventName);
                }
                else {
                    socket.json.emit(GetTemplateJsonFileEvent.eventName, JSON.parse(data.toString()));
                }
            });
        });
    };
    /**
     * event name
     */
    GetTemplateJsonFileEvent.eventName = 'onGetJsonFile';
    return GetTemplateJsonFileEvent;
}());
module.exports = GetTemplateJsonFileEvent;
//# sourceMappingURL=getTemplateJsonFileEvent.js.map