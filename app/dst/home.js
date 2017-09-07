"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var logger = require("./logger");
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
exports.eventListeners = {
    'new': onNew,
    'import': onImport,
    'remove': onRemove,
    'rename': onRename,
    'reorder': onReorder
};
//# sourceMappingURL=home.js.map