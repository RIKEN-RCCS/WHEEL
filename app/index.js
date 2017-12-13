'use strict';
const path = require('path');
const http = require('http');

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const siofu = require('socketio-file-upload');
const ejs = require('ejs');

const logger = require('./logger');
const config = require('./config/server');

/*
 * set up express, http and socket.io
 */
var app = express();
const server = http.createServer(app);
const sio = require('socket.io')(server);

// template engine
app.set('views', path.resolve('./app/views'));
app.set('view engine', 'ejs');

// middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));
app.use(cookieParser());
app.use(express.static(path.resolve('./app/public'), { index: false }));
app.use(siofu.router);

// routing
var routes = {
    "home":       require('./routes/home')(sio),
    "workflow":   require('./routes/workflow')(sio),
    "remotehost": require('./routes/remotehost')(sio),
    "login":      require('./routes/login')(sio),
    "admin":      require('./routes/admin')(sio),
    "rapid":      require('./routes/rapid')(sio)
};
app.use('/',           routes.home);
app.use('/home',       routes.home);
app.use('/login',      routes.login);
app.use('/admin',      routes.admin);
app.use('/workflow',   routes.workflow);
app.use('/editor',     routes.rapid);
app.use('/remotehost', routes.remotehost);

// port number
var defaultPort = 443;
var port = parseInt(process.env.PORT) || config.port || defaultPort;
if (port < 0) {
    port = defaultPort;
}
app.set('port', port);

// error handler
//TODO special error handler for 404 should be placed here
app.use(function (err, req, res, next) {
    logger.error(err);
    // render the error page
    res.status(err.status || 500);
    res.send('something broken!');
});

/**
 * set up logger
 */
// TODO independent socket.io instance and filename should be passed
// hand over socket.io to logger
logger.setSocket(sio.of('/workflow'));
logger.setLogfile("./TestLogFile.txt");


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
