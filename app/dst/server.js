"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socketio = require("socket.io");
var httpServer = require("./httpServer");
var serverConfig = require("./serverConfig");
var logger = require("./logger");
var GetFileListEvent = require("./socketio/getFileListEvent");
var RunWorkflowEvent = require("./socketio/runProjectEvent");
var UploadFileEvent = require("./socketio/uploadFileEvent");
var GetFileStatEvent = require("./socketio/getFileStatEvent");
var ReadTreeJsonEvent = require("./socketio/readTreeJsonEvent");
var OpenProjectJsonEvent = require("./socketio/openProjectJsonEvent");
var GetRemoteHostListEvent = require("./socketio/getRemoteHostListEvent");
var SshConnectionEvent = require("./socketio/sshConnectionEvent");
var AddHostEvent = require("./socketio/addHostEvent");
var DeleteHostEvent = require("./socketio/deleteHostEvent");
var WriteTreeJsonEvent = require("./socketio/writeTreeJsonEvent");
var GetTemplateJsonFileEvent = require("./socketio/getTemplateJsonFileEvent");
var CreateNewProjectEvent = require("./socketio/createNewProjectEvent");
var ReadFileEvent = require("./socketio/readFileEvent");
var WriteFileEvent = require("./socketio/writeFileEvent");
var CleanProjectEvent = require("./socketio/cleanProjectEvent");
var DeleteDirectoryEvent = require("./socketio/deleteDirectoryEvent");
var config = serverConfig.getConfig();
var server = httpServer.start(config.port);
var sio = socketio(server);
var eventNspPairs = [];
var addEventListener = function (namespace, listeners) {
    eventNspPairs.push({
        io: sio.of(namespace),
        listeners: listeners
    });
};
addEventListener('/swf/home', [
    new GetFileListEvent(),
    new CreateNewProjectEvent()
]);
addEventListener('/swf/select', [
    new GetFileListEvent()
]);
addEventListener('/swf/project', [
    new OpenProjectJsonEvent(),
    new RunWorkflowEvent(),
    new SshConnectionEvent(),
    new GetFileStatEvent(),
    new CleanProjectEvent()
]);
addEventListener('/swf/remotehost', [
    new GetRemoteHostListEvent(),
    new SshConnectionEvent(),
    new AddHostEvent(),
    new DeleteHostEvent(),
    new GetFileListEvent()
]);
addEventListener('/swf/workflow', [
    new ReadTreeJsonEvent(),
    new GetFileStatEvent(),
    new WriteTreeJsonEvent(),
    new GetTemplateJsonFileEvent(),
    new GetRemoteHostListEvent(),
    new UploadFileEvent(),
    new DeleteDirectoryEvent()
]);
addEventListener('/swf/editor', [
    new ReadFileEvent(),
    new WriteFileEvent()
]);
eventNspPairs.forEach(function (pair) {
    pair.io.on('connect', function (socket) {
        logger.debug("socket on connect " + pair.io.name);
        pair.listeners.forEach(function (listener) { return listener.onEvent(socket); });
        socket.on('disconnect', function () {
            logger.debug("socket on disconnect " + pair.io.name);
        });
    });
});
//# sourceMappingURL=server.js.map