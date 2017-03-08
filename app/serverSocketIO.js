"use strict";
var socketio = require("socket.io");
var logger = require("./logger");
/**
 * socket io class for server
 */
var ServerSocketIO = (function () {
    /**
     * construct new socket
     */
    function ServerSocketIO(server) {
        /**
         * event name and listener pair list
         */
        this.eventNspPairs = [];
        this.server = socketio(server);
    }
    /**
     *
     * @param nsp: socket namespace
     * @param listeners: event listener interface array
     * @returns none
     */
    ServerSocketIO.prototype.addEventListener = function (nsp, listeners) {
        this.eventNspPairs.push({
            io: this.server.of(nsp),
            listeners: listeners
        });
    };
    /**
     * Connection event fired when we get a new connection
     * @returns none
     */
    ServerSocketIO.prototype.onConnect = function () {
        this.eventNspPairs.forEach(function (pair) {
            pair.io.on('connect', function (socket) {
                logger.debug("socket on connect " + pair.io.name);
                pair.listeners.forEach(function (listener) { return listener.onEvent(socket); });
                socket.on('disconnect', function () {
                    logger.debug("socket on disconnect " + pair.io.name);
                });
            });
        });
    };
    return ServerSocketIO;
}());
module.exports = ServerSocketIO;
//# sourceMappingURL=serverSocketIO.js.map