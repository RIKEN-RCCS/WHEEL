/**
 * socket io communication class for getting project json from server
 */
var OpenProjectJsonSocket = (function () {
    /**
     * create new instance
     * @param socket socket socket io instance
     */
    function OpenProjectJsonSocket(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for connect event that will be invoked a single time before being automatically removed
     * @param projectFilepath project file path
     * @param callback The function to call when we get the event
     */
    OpenProjectJsonSocket.prototype.onConnect = function (projectFilepath, callback) {
        var _this = this;
        this.callback = callback;
        this.socket
            .on('connect', function () {
            _this.emit(projectFilepath);
        });
    };
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    OpenProjectJsonSocket.prototype.onEvent = function (callback) {
        if (callback == null) {
            callback = this.callback;
        }
        this.socket.once(OpenProjectJsonSocket.eventName, callback);
    };
    /**
     * emit to server for gettingproject json
     * @param projectFilepath project file path
     * @param callback The function to call when we get the event
     */
    OpenProjectJsonSocket.prototype.emit = function (projectFilepath, callback) {
        this.onEvent(callback);
        this.socket.emit(OpenProjectJsonSocket.eventName, projectFilepath);
    };
    return OpenProjectJsonSocket;
}());
/**
 * event name
 */
OpenProjectJsonSocket.eventName = 'openProjectJson';
//# sourceMappingURL=openProjectJsonSocket.js.map