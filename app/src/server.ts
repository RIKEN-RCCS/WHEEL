import fs = require('fs');
import path = require('path');
import os = require('os');

import express = require('express');
import cookieParser = require('cookie-parser');
import bodyParser = require('body-parser');
import http = require('http');

import logger = require('./logger');
const config = require('../dst/config/server');

/*
 * set up express, http and socket.io
 */
var app = express();
const server = http.createServer(app);
const sio = require('socket.io')(server);


// middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.resolve('dst/public'), {index: false}));

// routing
var routes={
  "home": require('./routes/main'),
  "home_beta": require('./routes/home_beta'),
  "PM": require('./routes/projectManager'),
  "WM": require('./routes/workflowManager'),
  "editor": require('./routes/editor'),
  "remoteHost": require('./routes/remoteHost')
}

app.use('/', routes.home);
app.use('/home_beta', routes.home_beta);
app.use('/swf/project_manager.html', routes.PM);
app.use('/swf/workflow_manager.html', routes.WM);
app.use('/swf/editor.html', routes.editor);
app.use('/swf/remotehost.html', routes.remoteHost);


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
  res.send('something broken!');
}); 


// TODO independent socket.io instance and filename should be passed
// hand over socket.io to logger
logger.setSocket(sio.of('/swf/project'));
logger.setLogfile("./TestLogFile.txt");

// register event listeners
import EventListeners=require('./eventListeners');

import home_beta=require('./home_beta');
home_beta.setup(sio);

EventListeners.add(sio.of('/swf/home'), [
    'onGetFileList',
    'onCreateNewProject' 
]);
EventListeners.add(sio.of('/swf/select'), [
   'onGetFileList'
]);
EventListeners.add(sio.of('/swf/project'), [
    'openProjectJson',
    'onRunProject',
    'onSshConnection',
    'onGetFileStat',
    'cleanProject'
]);
EventListeners.add(sio.of('/swf/remotehost'), [
    'onGetRemoteHostList',
    'onSshConnection',
    'onAddHost',
    'onDeleteHost',
    'onGetFileList' 
]);
EventListeners.add(sio.of('/swf/workflow'), [
    'readTreeJson',
    'onGetFileStat',
    'writeTreeJson',
    'onGetJsonFile',
    'onGetRemoteHostList',
    'UploadFileEvent',
    'onDeleteDirectory'
]);
EventListeners.add(sio.of('/swf/editor'), [
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
