"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var logger = require("./logger");
var sioHelper = require("./socketioHelper");
var onNew = function (msg) {
    logger.debug(msg);
};
var onImport = function (msg) {
    logger.debug(msg);
};
var onRemove = function (msg) {
    logger.debug(msg);
};
var onRename = function (msg) {
    logger.debug(msg);
};
var onReorder = function (msg) {
    logger.debug(msg);
};
var eventListeners = {
    'new': onNew,
    'import': onImport,
    'remove': onRemove,
    'rename': onRename,
    'reorder': onReorder
};
function setup(sio) {
    sioHelper.add(sio.of('/home'), eventListeners);
}
exports.setup = setup;
//# sourceMappingURL=home_beta.js.map