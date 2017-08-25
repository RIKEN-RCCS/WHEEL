import fs = require('fs');
import path = require('path');
import socketio = require('socket.io');

import httpServer = require('./httpServer');
import serverConfig = require('./serverConfig');
import logger = require('./logger');

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
import DeleteDirectoryEvent = require('./socketio/deleteDirectoryEvent');

const config = serverConfig.getConfig();
const server = httpServer.start(config.port);
const sio = socketio(server);

var eventNspPairs=[];
var addEventListener = function (namespace: string, listeners) {
  eventNspPairs.push({
    io: sio.of(namespace),
    listeners: listeners
  });
}

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


eventNspPairs.forEach(pair => {
  pair.io.on('connect', (socket: SocketIO.Socket) => {
    logger.debug(`socket on connect ${pair.io.name}`);
    pair.listeners.forEach(listener => listener.onEvent(socket));
    socket.on('disconnect', () => {
      logger.debug(`socket on disconnect ${pair.io.name}`);
    });
  })
});
