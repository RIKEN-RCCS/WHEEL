"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var httpServer = require("./httpServer");
var serverConfig = require("./serverConfig");
var ServerSocketIO = require("./socketio/serverSocketIO");
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
var serverSocket = new ServerSocketIO.SwfSocketIO(server);
serverSocket.addEventListener('/swf/home', [
    new GetFileListEvent(),
    new CreateNewProjectEvent()
]);
serverSocket.addEventListener('/swf/select', [
    new GetFileListEvent()
]);
serverSocket.addEventListener('/swf/project', [
    new OpenProjectJsonEvent(),
    new RunWorkflowEvent(),
    new SshConnectionEvent(),
    new GetFileStatEvent(),
    new CleanProjectEvent()
]);
serverSocket.addEventListener('/swf/remotehost', [
    new GetRemoteHostListEvent(),
    new SshConnectionEvent(),
    new AddHostEvent(),
    new DeleteHostEvent(),
    new GetFileListEvent()
]);
serverSocket.addEventListener('/swf/workflow', [
    new ReadTreeJsonEvent(),
    new GetFileStatEvent(),
    new WriteTreeJsonEvent(),
    new GetTemplateJsonFileEvent(),
    new GetRemoteHostListEvent(),
    new UploadFileEvent(),
    new DeleteDirectoryEvent()
]);
serverSocket.addEventListener('/swf/editor', [
    new ReadFileEvent(),
    new WriteFileEvent()
]);
serverSocket.onConnect();
//# sourceMappingURL=server.js.map