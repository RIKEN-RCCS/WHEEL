"use strict";
const fs = require("fs");
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
class Logger {
    /**
     * set log lovel
     * @param level log level
     */
    static setLogLevel(level) {
        this.logLevel = level;
    }
    /**
     * recieve socket and enable log output with io.emit
     */
    static setSocket(socket) {
        this.socket = socket;
    }
    /**
     * disable log output with io.emit
     */
    static disableSocket() {
        this.socket = null;
    }
    /**
     * enable log output to file and create output stream
     */
    static setLogfile(filename) {
        this.logfile = filename;
        this.info(`log file ${this.logfile} open`);
    }
    /**
     * disable log output to file
     */
    static disableLogfile() {
        this.info(`log file ${this.logfile} closed`);
        this.logfile = null;
    }
    /**
     * output debug log
     * @param object display data
     */
    static debug(object) {
        if (this.logLevel <= LogLevel.debug) {
            this.print(object, 'DBG   ');
        }
    }
    /**
     * output info log
     * @param object display data
     */
    static info(object) {
        if (this.logLevel <= LogLevel.info) {
            this.print(object, 'INFO  ');
        }
    }
    /**
     * output warning log
     * @param object display data
     */
    static warn(object) {
        if (this.logLevel <= LogLevel.warn) {
            this.print(object, 'WARN  ');
        }
    }
    /**
     * output error log
     * @param object display data
     */
    static error(object) {
        if (this.logLevel <= LogLevel.error) {
            this.print(object, 'ERR   ');
        }
    }
    /**
     * output stdout from child_process
     * @param object display data
     */
    static stdout(object) {
        this.print(object, 'Stdout');
    }
    /**
     * output stderr from child_process
     * @param object display data
     */
    static stderr(object) {
        this.print(object, 'Stderr');
    }
    /**
     * output stdout from ssh
     * @param object display data
     */
    static SSHout(object) {
        this.print(object, 'SSHout');
    }
    /**
     * output stderr from ssh
     * @param object display data
     */
    static SSHerr(object) {
        this.print(object, 'SSHerr');
    }
    /**
     * get date string
     * @return date string
     */
    static getDateString() {
        const date = new Date();
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
    /**
     * print actual log message
     *
     */
    static print(object, level) {
        if (typeof object == 'object') {
            console.log(`${this.getDateString()} [${level}] `, object);
        }
        else {
            console.log(`${this.getDateString()} [${level}] ${object}`);
        }
        var line = this.getDateString();
        line += ` [${level}] `;
        line += JSON.stringify(object);
        if (this.socket != null) {
            var eventName = 'log' + level;
            this.socket.emit(eventName.trim(), line);
        }
        if (this.logfile != null) {
            fs.appendFile(this.logfile, line + '\n', function () { return; });
        }
    }
}
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
module.exports = Logger;
