"use strict";
var fs = require("fs");
/**
 * log lever
 */
var LogLevel;
(function (LogLevel) {
    /**
     * debug level
     */
    LogLevel[LogLevel["debug"] = 0] = "debug";
    /**
     * info level
     */
    LogLevel[LogLevel["info"] = 1] = "info";
    /**
     * warn level
     */
    LogLevel[LogLevel["warn"] = 2] = "warn";
    /**
     * error level
     */
    LogLevel[LogLevel["error"] = 3] = "error";
    /**
     * fatal level
     */
    LogLevel[LogLevel["fatal"] = 4] = "fatal";
})(LogLevel || (LogLevel = {}));
;
/**
 * logger class
 */
var Logger = (function () {
    function Logger() {
    }
    /**
     * set log lovel
     * @param level log level
     */
    Logger.setLogLevel = function (level) {
        this.logLevel = level;
    };
    /**
     * recieve socket and enable log output with io.emit
     */
    Logger.setSocket = function (socket) {
        this.socket = socket;
    };
    /**
     * disable log output with io.emit
     */
    Logger.disableSocket = function () {
        this.socket = null;
    };
    /**
     * enable log output to file and create output stream
     */
    Logger.setLogfile = function (filename) {
        this.logfile = filename;
        this.info("log file " + this.logfile + " open");
    };
    /**
     * disable log output to file
     */
    Logger.disableLogfile = function () {
        this.info("log file " + this.logfile + " closed");
        this.logfile = null;
    };
    /**
     * output debug log
     * @param object display data
     */
    Logger.debug = function (object) {
        if (this.logLevel <= LogLevel.debug) {
            this.print(object, 'DBG   ');
        }
    };
    /**
     * output info log
     * @param object display data
     */
    Logger.info = function (object) {
        if (this.logLevel <= LogLevel.info) {
            this.print(object, 'INFO  ');
        }
    };
    /**
     * output warning log
     * @param object display data
     */
    Logger.warn = function (object) {
        if (this.logLevel <= LogLevel.warn) {
            this.print(object, 'WARN  ');
        }
    };
    /**
     * output error log
     * @param object display data
     */
    Logger.error = function (object) {
        if (this.logLevel <= LogLevel.error) {
            this.print(object, 'ERR   ');
        }
    };
    /**
     * output stdout from child_process
     * @param object display data
     */
    Logger.stdout = function (object) {
        this.print(object, 'Stdout');
    };
    /**
     * output stderr from child_process
     * @param object display data
     */
    Logger.stderr = function (object) {
        this.print(object, 'Stderr');
    };
    /**
     * output stdout from ssh
     * @param object display data
     */
    Logger.SSHout = function (object) {
        this.print(object, 'SSHout');
    };
    /**
     * output stderr from ssh
     * @param object display data
     */
    Logger.SSHerr = function (object) {
        this.print(object, 'SSHerr');
    };
    /**
     * get date string
     * @return date string
     */
    Logger.getDateString = function () {
        var date = new Date();
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    };
    /**
     * print actual log message
     *
     */
    Logger.print = function (object, level) {
        if (typeof object == 'object') {
            console.log(this.getDateString() + " [" + level + "] ", object);
        }
        else {
            console.log(this.getDateString() + " [" + level + "] " + object);
        }
        var line = this.getDateString();
        line += " [" + level + "] ";
        line += JSON.stringify(object);
        if (this.socket != null) {
            var eventName = 'log' + level;
            this.socket.emit(eventName.trim(), line);
        }
        if (this.logfile != null) {
            fs.appendFile(this.logfile, line + '\n', function () { return; });
        }
    };
    /**
     * log level
     */
    Logger.logLevel = LogLevel.debug;
    /**
     * socket.io server
     */
    Logger.socket = null;
    /**
     * log file
     */
    Logger.logfile = null;
    return Logger;
}());
module.exports = Logger;
//# sourceMappingURL=logger.js.map