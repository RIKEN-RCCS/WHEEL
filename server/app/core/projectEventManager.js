/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
"use strict";
const EventEmitter = require("events");

/**
 * @fileoverview manage events which is fired during running project.
 *
 * @event projectStateChanged
 * @type {Object} - updated projectJson
 *
 * @event componentPathChanged
 * @trype {Object} - updated componentID-path map
 *
 * @event taskStateChanged
 * @type {Object} - updated task object
 *
 * @event componentStateChanged
 * @type {Object} - updated component Json
 *
 * @event resultFilesReady
 * @type {Object[]] - array of result file's url
 * @property {string} componentID - component.ID
 * @property {string} filename    - relative path from projectRoot
 * @property {string} url         - URL to view result file
 *
 */
const projects = new Map();

function getEventEmitter(projectRootDir) {
  if (!projects.has(projectRootDir)) {
    projects.set(projectRootDir, new EventEmitter());
  }
  return projects.get(projectRootDir);
}

function on(projectRootDir, event, cb) {
  getEventEmitter(projectRootDir).on(event, cb);
}
function once(projectRootDir, event, cb) {
  getEventEmitter(projectRootDir).once(event, cb);
}
function off(projectRootDir, event, cb) {
  getEventEmitter(projectRootDir).off(event, cb);
}
function emitProjectEvent(projectRootDir, event, ...args) {
  getEventEmitter(projectRootDir).emit(event, ...args);
}

module.exports = {
  on,
  once,
  off,
  emitProjectEvent
};
