"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger = require("./logger");
/*
 * helper function for socketio.on()
 * @param sio       socket.io's namespace
 * @param eventName event name
 * @param callback  callback function
 *
 */
function default_1(sio, eventName, callback) {
    sio.on('connect', (socket) => {
        logger.debug(`socket on connect ${sio.name}`);
        socket.on(eventName, callback);
        socket.on('disconnect', () => {
            logger.debug(`socket on disconnect ${sio.name}`);
        });
    });
}
exports.default = default_1;
//# sourceMappingURL=socketioHelper.js.map