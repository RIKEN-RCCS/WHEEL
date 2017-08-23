/**
 * socket io communication class for getting host information from server
 */
var GetRemoteHostListSocket = (function () {
    /**
     * create new instance
     * @param socket socket io instance
     */
    function GetRemoteHostListSocket(socket) {
        this.socket = socket;
    }
    /**
     * Adds a listener for connect event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    GetRemoteHostListSocket.prototype.onConnect = function (callback) {
        var _this = this;
        this.callback = callback;
        this.socket
            .on('connect', function () {
            _this.emit(callback);
        });
    };
    /**
     * Adds a listener for this event that will be invoked a single time before being automatically removed
     * @param callback The function to call when we get the event
     */
    GetRemoteHostListSocket.prototype.onEvent = function (callback) {
        if (callback == null) {
            callback = this.callback;
        }
        this.socket.once(GetRemoteHostListSocket.eventName, function (hostInfos) {
            callback(hostInfos);
        });
    };
    /**
     * emit to server for getting host information
     * @param callback The function to call when we get the event
     */
    GetRemoteHostListSocket.prototype.emit = function (callback) {
        this.onEvent(callback);
        this.socket.emit(GetRemoteHostListSocket.eventName);
    };
    return GetRemoteHostListSocket;
}());
/**
 * event name
 */
GetRemoteHostListSocket.eventName = 'onGetRemoteHostList';
//# sourceMappingURL=getRemoteHostListSocket.js.map