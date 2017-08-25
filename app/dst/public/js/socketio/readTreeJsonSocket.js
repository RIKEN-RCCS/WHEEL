/**
 * socket io communication class for read tree json from server
 */
var ReadTreeJsonSocket = (function () {
    /**
     * create new instance
     * @param socket socket io instance
     */
    function ReadTreeJsonSocket(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for connect event that will be invoked a single time before being automatically removed
     * @param treeJsonFilepath tree json file path
     * @param callback The function to call when we get the event
     */
    ReadTreeJsonSocket.prototype.onConnect = function (treeJsonFilepath, callback) {
        var _this = this;
        this.callback = callback;
        this.socket
            .on('connect', function () {
            _this.emit(treeJsonFilepath);
        });
    };
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     */
    ReadTreeJsonSocket.prototype.onEvent = function () {
        var _this = this;
        this.socket.once(ReadTreeJsonSocket.eventName, function (treeJson) {
            _this.callback(treeJson);
        });
    };
    /**
     * emit to server for read tree json
     * @param treeJsonFilepath tree json file path
     */
    ReadTreeJsonSocket.prototype.emit = function (treeJsonFilepath) {
        this.onEvent();
        this.socket.emit(ReadTreeJsonSocket.eventName, treeJsonFilepath);
    };
    /**
     * event name
     */
    ReadTreeJsonSocket.eventName = 'readTreeJson';
    return ReadTreeJsonSocket;
}());
//# sourceMappingURL=readTreeJsonSocket.js.map