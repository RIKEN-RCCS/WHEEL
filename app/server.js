"use strict";
var httpServer = require("./httpServer");
var serverConfig = require("./serverConfig");
var ServerSocketIO = require("./serverSocketIO");
var GetFileListEvent = require("./getFileListEvent");
var RunWorkflowEvent = require("./runProjectEvent");
var UploadFileEvent = require("./uploadFileEvent");
var GetFileStatEvent = require("./getFileStatEvent");
var ReadTreeJsonEvent = require("./readTreeJsonEvent");
var OpenProjectJsonEvent = require("./openProjectJsonEvent");
var GetRemoteHostListEvent = require("./getRemoteHostListEvent");
var SshConnectionEvent = require("./sshConnectionEvent");
var AddHostEvent = require("./addHostEvent");
var DeleteHostEvent = require("./deleteHostEvent");
var WriteTreeJsonEvent = require("./writeTreeJsonEvent");
var GetTemplateJsonFileEvent = require("./getTemplateJsonFileEvent");
var CreateNewProjectEvent = require("./createNewProjectEvent");
var ReadFileEvent = require("./readFileEvent");
var WriteFileEvent = require("./writeFileEvent");
var CleanProjectEvent = require("./cleanProjectEvent");
var config = serverConfig.getConfig();
var server = httpServer.start(config.port);
var serverSocket = new ServerSocketIO(server);
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
    new UploadFileEvent()
]);
serverSocket.addEventListener('/swf/editor', [
    new ReadFileEvent(),
    new WriteFileEvent()
]);
serverSocket.onConnect();
//# sourceMappingURL=server.js.map