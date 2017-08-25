/**
 * socket io communication class for run project to server
 */
var RunProjectSocket = (function () {
    /**
     * construct new socket
     * @param socket socket io instance
     */
    function RunProjectSocket(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    RunProjectSocket.prototype.onEvent = function (callback) {
        this.socket.once(RunProjectSocket.eventName, callback);
    };
    /**
     * emit to server for run project
     * @param projectFilepath project file path
     * @param passInfo password information hash
     * @param callback The function to call when we get the event
     */
    RunProjectSocket.prototype.emit = function (projectFilepath, passInfo, callback) {
        this.onEvent(callback);
        this.socket.emit(RunProjectSocket.eventName, projectFilepath, passInfo);
    };
    /**
     * event name
     */
    RunProjectSocket.eventName = 'onRunProject';
    return RunProjectSocket;
}());
//# sourceMappingURL=runProjectSocket.js.map