"use strict";
var socketio = require("socket.io");
var logger = require("./logger");
/**
 * socket io class for server
 */
var ServerSocketIO;
(function (ServerSocketIO) {
    /**
     * socket io class for server
     */
    var SwfSocketIO = (function () {
        /**
         * construct new socket
         * @param server server instance
         */
        function SwfSocketIO(server) {
            /**
             * event name and listener pair list
             */
            this.eventNspPairs = [];
            this.server = socketio(server);
        }
        /**
         * adds event listeners
         * @param nsp socket namespace name
         * @param listeners event listener interface array
         */
        SwfSocketIO.prototype.addEventListener = function (namespace, listeners) {
            this.eventNspPairs.push({
                io: this.server.of(namespace),
                listeners: listeners
            });
        };
        /**
         * Connection event fired when we get a new connection
         */
        SwfSocketIO.prototype.onConnect = function () {
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
        return SwfSocketIO;
    }());
    ServerSocketIO.SwfSocketIO = SwfSocketIO;
})(ServerSocketIO || (ServerSocketIO = {}));
module.exports = ServerSocketIO;
//# sourceMappingURL=serverSocketIO.js.map