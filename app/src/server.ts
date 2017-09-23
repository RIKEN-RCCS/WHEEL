import fs = require('fs');
import path = require('path');
import os = require('os');
import util = require('util');

import express = require('express');
import cookieParser = require('cookie-parser');
import bodyParser = require('body-parser');
import http = require('http');
import siofu = require('socketio-file-upload');
import del=require('del');

import fileBrowser from './fileBrowser';
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
app.use(siofu.router);

// routing
var routes={
  "home": require('./routes/main'),
  "home_beta": require('./routes/home_beta'),
  "workflow": require('./routes/workflow'),
  "PM": require('./routes/projectManager'),
  "WM": require('./routes/workflowManager'),
  "editor": require('./routes/editor'),
  "remoteHost": require('./routes/remoteHost')
}

app.use('/', routes.home);
app.use('/home_beta', routes.home_beta);
app.use('/workflow', routes.workflow);
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


/**
 * set up logger
 */
// TODO independent socket.io instance and filename should be passed
// hand over socket.io to logger
logger.setSocket(sio.of('/swf/project'));
logger.setLogfile("./TestLogFile.txt");

/**
 * register event listeners
 */
// home 
import home_beta=require('./home_beta');
home_beta.setup(sio);
// workflow
var sioNamespace='/swf/workflow';
sio.of(sioNamespace).on('connect',function(socket){
  var uploader=new siofu();
  uploader.listen(socket);
  uploader.dir=os.homedir();
  uploader.on("saved", function(event){
    logger.info(`upload completed ${event.file.pathName} [${event.file.size} Byte]`);
    fileBrowser(sio.of(sioNamespace), 'fileList', uploader.dir);
  });
  uploader.on("error", function(event){
    logger.error(`Error from uploader ${event}`);
  });
  socket.on('fileListRequest', function(target){
    logger.debug(`current dir = ${target}`)
    fileBrowser(sio.of(sioNamespace), 'fileList', target);
    uploader.dir=target;
  });
  socket.on('remove', function(target){
    console.log(target);
    var parentDir = path.dirname(target);
    del(target,{force: true})
    .then(function(){
      fileBrowser(sio.of(sioNamespace), 'fileList', parentDir);
    })
    .catch(function(err){
      logger.warn(`remove failed: ${err}`);
      logger.debug(`remove target: ${target}`);
    });
  });
  socket.on('rename', function(msg){
    var data=JSON.parse(msg.toString());
    if(! (data.hasOwnProperty('oldName') && data.hasOwnProperty('newName') && data.hasOwnProperty('path'))){
      logger.warn(`illegal request ${msg}`);
      return;
    }
    var oldName=path.resolve(data.path, data.oldName);
    var newName=path.resolve(data.path, data.newName);
    util.promisify(fs.rename)(oldName, newName)
    .then(function(){
      fileBrowser(sio.of(sioNamespace), 'fileList', data.path);
    })
    .catch(function(err){
      logger.warn(`rename failed: ${err}`);
      logger.debug(`path:    ${data.path}`);
      logger.debug(`oldName: ${data.oldName}`);
      logger.debug(`newName: ${data.newName}`);
    });
  });
  socket.on('download', function(msg){
    //TODO 
    logger.warn('download function is not implemented yet.');
  });
});

// others
import EventListeners=require('./eventListeners');

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
