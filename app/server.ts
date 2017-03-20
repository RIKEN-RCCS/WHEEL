import fs = require('fs');
import path = require('path');

import httpServer = require('./httpServer');
import serverConfig = require('./serverConfig');

import ServerSocketIO = require('./serverSocketIO');
import GetFileListEvent = require('./getFileListEvent');
import RunWorkflowEvent = require('./runProjectEvent');
import UploadFileEvent = require('./uploadFileEvent');
import GetFileStatEvent = require('./getFileStatEvent');
import ReadTreeJsonEvent = require('./readTreeJsonEvent');
import OpenProjectJsonEvent = require('./openProjectJsonEvent');
import GetRemoteHostListEvent = require('./getRemoteHostListEvent');
import SshConnectionEvent = require('./sshConnectionEvent');
import AddHostEvent = require('./addHostEvent');
import DeleteHostEvent = require('./deleteHostEvent');
import WriteTreeJsonEvent = require('./writeTreeJsonEvent');
import GetTemplateJsonFileEvent = require('./getTemplateJsonFileEvent');
import CreateNewProjectEvent = require('./createNewProjectEvent');
import ReadFileEvent = require('./readFileEvent');
import WriteFileEvent = require('./writeFileEvent');
import CleanProjectEvent = require('./cleanProjectEvent');

const config = serverConfig.getConfig();
const server = httpServer.start(config.port);
const serverSocket = new ServerSocketIO.SwfSocketIO(server);

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
