/**
 * socket io communication class for read file data from server
 */
var ReadFileSocket = (function () {
    /**
     * create new instance
     * @param socket socket io instance
     */
    function ReadFileSocket(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for connect event that will be invoked a single time before being automatically removed
     * @param filepath read file path
     * @param callback The function to call when we get the event
     */
    ReadFileSocket.prototype.onConnect = function (filepath, callback) {
        var _this = this;
        this.callback = callback;
        this.socket
            .on('connect', function () {
            _this.emit(filepath);
        });
    };
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     */
    ReadFileSocket.prototype.onEvent = function () {
        var _this = this;
        this.socket.once(ReadFileSocket.eventName, function (data) {
            _this.callback(data);
        });
    };
    /**
     * emit to server for read file data
     * @param filepath read file path
     */
    ReadFileSocket.prototype.emit = function (filepath) {
        this.onEvent();
        this.socket.emit(ReadFileSocket.eventName, filepath);
    };
    /**
     * event name
     */
    ReadFileSocket.eventName = 'readFile';
    return ReadFileSocket;
}());
//# sourceMappingURL=readFileSocket.js.map