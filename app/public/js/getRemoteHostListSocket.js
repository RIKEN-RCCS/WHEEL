/**
 *
 */
var GetRemoteHostListSocket = (function () {
    /**
     * create new instance
     * @param socket
     */
    function GetRemoteHostListSocket(socket) {
        this.socket = socket;
    }
    /**
     *
     * @param callback
     */
    GetRemoteHostListSocket.prototype.onConnect = function (callback) {
        var _this = this;
        this.socket
            .on('connect', function () {
            _this.emit(callback);
        });
    };
    /**
     *
     * @param callback
     */
    GetRemoteHostListSocket.prototype.onEvent = function (callback) {
        this.socket.once(GetRemoteHostListSocket.eventName, function (hostInfos) {
            callback(hostInfos);
        });
    };
    /**
     *
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