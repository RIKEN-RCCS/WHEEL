var RunProjectSocket = (function () {
    /**
     * construct new socket
     * @param nsp: namespace of socket
     */
    function RunProjectSocket(socket) {
        this.socket = socket;
    }
    RunProjectSocket.prototype.onEvent = function (callback) {
        this.socket.once(RunProjectSocket.eventName, callback);
    };
    RunProjectSocket.prototype.emit = function (swfFilePath, callback) {
        this.onEvent(callback);
        this.socket.emit(RunProjectSocket.eventName, swfFilePath);
    };
    return RunProjectSocket;
}());
/**
 * event name
 */
RunProjectSocket.eventName = 'onRunProject';
//# sourceMappingURL=runProjectSocket.js.map