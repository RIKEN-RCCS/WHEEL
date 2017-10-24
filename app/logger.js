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
    static debug(...args) {
        if (this.logLevel <= LogLevel.debug) {
            this.print('DBG   ', ...args);
        }
    }
    /**
     * output info log
     * @param object display data
     */
    static info(...args) {
        if (this.logLevel <= LogLevel.info) {
            this.print('INFO  ', ...args);
        }
    }
    /**
     * output warning log
     * @param object display data
     */
    static warn(...args) {
        if (this.logLevel <= LogLevel.warn) {
            this.print('WARN  ', ...args);
        }
    }
    /**
     * output error log
     * @param object display data
     */
    static error(...args) {
        if (this.logLevel <= LogLevel.error) {
            this.print('ERR   ', ...args);
        }
    }
    /**
     * output stdout from child_process
     * @param object display data
     */
    static stdout(...args) {
        this.print('Stdout', ...args);
    }
    /**
     * output stderr from child_process
     * @param object display data
     */
    static stderr(...args) {
        this.print('Stderr', ...args);
    }
    /**
     * output stdout from ssh
     * @param object display data
     */
    static SSHout(...args) {
        this.print('SSHout', ...args);
    }
    /**
     * output stderr from ssh
     * @param object display data
     */
    static SSHerr(...args) {
        this.print('SSHerr', ...args);
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
    static print(label, ...args) {
      var argments=
        console.log(`${this.getDateString()} [${label}] `, ...args);

        var line = this.getDateString();
        line += ` [${label}] `;
        args.forEach(function(arg){
          line += JSON.stringify(arg);
        });
        if (this.socket != null) {
            var eventName = 'log' + label;
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
