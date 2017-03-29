import fs = require('fs');
import path = require('path');

import httpServer = require('./httpServer');
import serverConfig = require('./serverConfig');

import ServerSocketIO = require('./socketio/serverSocketIO');
import GetFileListEvent = require('./socketio/getFileListEvent');
import RunWorkflowEvent = require('./socketio/runProjectEvent');
import UploadFileEvent = require('./socketio/uploadFileEvent');
import GetFileStatEvent = require('./socketio/getFileStatEvent');
import ReadTreeJsonEvent = require('./socketio/readTreeJsonEvent');
import OpenProjectJsonEvent = require('./socketio/openProjectJsonEvent');
import GetRemoteHostListEvent = require('./socketio/getRemoteHostListEvent');
import SshConnectionEvent = require('./socketio/sshConnectionEvent');
import AddHostEvent = require('./socketio/addHostEvent');
import DeleteHostEvent = require('./socketio/deleteHostEvent');
import WriteTreeJsonEvent = require('./socketio/writeTreeJsonEvent');
import GetTemplateJsonFileEvent = require('./socketio/getTemplateJsonFileEvent');
import CreateNewProjectEvent = require('./socketio/createNewProjectEvent');
import ReadFileEvent = require('./socketio/readFileEvent');
import WriteFileEvent = require('./socketio/writeFileEvent');
import CleanProjectEvent = require('./socketio/cleanProjectEvent');

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
