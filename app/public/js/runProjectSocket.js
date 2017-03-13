/**
 *
 */
var RunProjectSocket = (function () {
    /**
     * construct new socket
     */
    function RunProjectSocket(socket) {
        this.socket = socket;
    }
    /**
     *
     * @param callback
     */
    RunProjectSocket.prototype.onEvent = function (callback) {
        this.socket.once(RunProjectSocket.eventName, callback);
    };
    /**
     *
     * @param swfFilePath
     * @param passInfo
     * @param callback
     */
    RunProjectSocket.prototype.emit = function (swfFilePath, passInfo, callback) {
        this.onEvent(callback);
        this.socket.emit(RunProjectSocket.eventName, swfFilePath, passInfo);
    };
    return RunProjectSocket;
}());
/**
 * event name
 */
RunProjectSocket.eventName = 'onRunProject';
//# sourceMappingURL=runProjectSocket.js.map