"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var logger = require("./logger");
/*
 * helper function for socketio.on()
 * @param sio      socket.io's namespace
 * @param listners dict which contains eventName and callback function pair
 *
 */
function add(sio, listeners) {
    sio.on('connect', function (socket) {
        logger.debug("socket on connect " + sio.name);
        for (var eventName in listeners) {
            sio.on(eventName, listeners[eventName]);
        }
        socket.on('disconnect', function () {
            logger.debug("socket on disconnect " + sio.name);
        });
    });
}
exports.add = add;
//# sourceMappingURL=socketioHelper.js.map