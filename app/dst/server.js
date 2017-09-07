"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var express = require("express");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var http = require("http");
var logger = require("./logger");
var config = require('../dst/config/server');
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
var home = require('./routes/main');
app.use('/', home);
app.post('/swf/project_manager.html', function (req, res, next) {
    res.cookie('project', req.body.project);
    res.sendFile(path.resolve('dst/public/swf/project_manager.html'));
});
app.post('/swf/workflow_manager.html', function (req, res, next) {
    res.cookie('root', req.body.root);
    res.cookie('index', req.body.index);
    res.sendFile(path.resolve('dst/public/swf/workflow_manager.html'));
});
app.post('/swf/editor.html', function (req, res, next) {
    res.cookie('edit', req.body.edit);
    res.sendFile(path.resolve('dst/public/swf/editor.html'));
});
// port number
var defaultPort = 443;
var port = parseInt(process.env.PORT) || config.port || defaultPort;
if (port < 0) {
    port = defaultPort;
}
app.set('port', port);
//TODO special error handler for 404 should be placed here
// error handler
app.use(function (err, req, res, next) {
    logger.error(err);
    // render the error page
    res.status(err.status || 500);
    res.send('something broke!');
});
// set up http/socket server
var server = http.createServer(app);
var sio = require('socket.io')(server);
// TODO independent socket.io instance and filename should be passed
// hand over socket.io to logger
logger.setSocket(sio.of('/swf/project'));
logger.setLogfile("./TestLogFile.txt");
// register event listeners
var EventListeners = require("./eventListeners");
var home_beta = require("./home_beta");
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
//# sourceMappingURL=server.js.map