import fs = require('fs');
import path = require('path');
import os = require('os');
import socketio = require('socket.io');

import httpServer = require('./httpServer');
import serverConfig = require('./serverConfig');
import ServerUtility = require('./serverUtility');
import logger = require('./logger');

const config = serverConfig.getConfig();
const server = httpServer.start(config.port);
const sio = socketio(server);

import EventListeners=require('./eventListeners');

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


