/**
 *
 */
var GetTemplateJsonFileSocket = (function () {
    /**
     * create new instance
     * @param socket
     */
    function GetTemplateJsonFileSocket(socket) {
        this.socket = socket;
    }
    /**
     *
     * @param callback
     */
    GetTemplateJsonFileSocket.prototype.onEvent = function (callback) {
        this.socket.once(GetTemplateJsonFileSocket.eventName, callback);
    };
    /**
     *
     * @param filetype
     * @param callback
     */
    GetTemplateJsonFileSocket.prototype.emit = function (filetype, callback) {
        this.onEvent(callback);
        this.socket.emit(GetTemplateJsonFileSocket.eventName, filetype);
    };
    return GetTemplateJsonFileSocket;
}());
/**
 * event name
 */
GetTemplateJsonFileSocket.eventName = 'onGetJsonFile';
//# sourceMappingURL=getTemplateJsonFileSocket.js.map