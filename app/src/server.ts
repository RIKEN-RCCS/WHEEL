import fs = require('fs');
import path = require('path');
import os = require('os');
import socketio = require('socket.io');

import express = require('express');
import cookieParser = require('cookie-parser');
import bodyParser = require('body-parser');
import http = require('http');

import logger = require('./logger');
const config = require('../dst/config/server');

/*
 * set up express
 */
var app = express();

// middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.resolve('dst/public')));

// routing
import main=require('./routes/main.js');
app.use('/', main);

// port number
var defaultPort=443;
var port = parseInt(process.env.PORT) || config.port || defaultPort;
if (port < 0 ){
  port = defaultPort;
}
app.set('port', port);


//TODO special error handler for 404 should be placed here

// error handler
app.use(function(err, req, res, next) {
  logger.error(err)
  // render the error page
  res.status(err.status || 500);
  res.send('something broke!');
}); 


// set up http/socket server
const server = http.createServer(app);
const sio = require('socket.io')(server);

// register event listeners
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

// Listen on provided port, on all network interfaces.
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  logger.info('Listening on ' + bind);
}
