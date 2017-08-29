"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socketio = require("socket.io");
var httpServer = require("./httpServer");
var serverConfig = require("./serverConfig");
var config = serverConfig.getConfig();
var server = httpServer.start(config.port);
var sio = socketio(server);
var EventListeners = require("./eventListeners");
EventListeners.add(sio, '/swf/home', [
    'onGetFileList',
    'onCreateNewProject'
]);
EventListeners.add(sio, '/swf/select', [
    'onGetFileList'
]);
EventListeners.add(sio, '/swf/project', [
    'openProjectJson',
    'onRunProject',
    'onSshConnection',
    'onGetFileStat',
    'cleanProject'
]);
EventListeners.add(sio, '/swf/remotehost', [
    'onGetRemoteHostList',
    'onSshConnection',
    'onAddHost',
    'onDeleteHost',
    'onGetFileList'
]);
EventListeners.add(sio, '/swf/workflow', [
    'readTreeJson',
    'onGetFileStat',
    'writeTreeJson',
    'onGetJsonFile',
    'onGetRemoteHostList',
    'UploadFileEvent',
    'onDeleteDirectory'
]);
EventListeners.add(sio, '/swf/editor', [
    'readFile',
    'writeFile'
]);
//# sourceMappingURL=server.js.map