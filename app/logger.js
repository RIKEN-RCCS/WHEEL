"use strict";
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
var logger = (function () {
    function logger() {
    }
    /**
     * set log lovel
     * @param level log level
     */
    logger.setLovLevel = function (level) {
        this.logLevel = level;
    };
    /**
     * output debug log
     * @param object display data
     */
    logger.debug = function (object) {
        if (this.logLevel <= LogLevel.debug) {
            if (typeof object == 'object') {
                console.log(this.getDateString() + " [DBG.] ", object);
            }
            else {
                console.log(this.getDateString() + " [DBG.] " + object);
            }
        }
    };
    /**
     * output info log
     * @param object display data
     */
    logger.info = function (object) {
        if (this.logLevel <= LogLevel.info) {
            if (typeof object == 'object') {
                console.log(this.getDateString() + " [INFO] ", object);
            }
            else {
                console.log(this.getDateString() + " [INFO] " + object);
            }
        }
    };
    /**
     * output warning log
     * @param object display data
     */
    logger.warn = function (object) {
        if (this.logLevel <= LogLevel.warn) {
            if (typeof object == 'object') {
                console.log(this.getDateString() + " [WARN] ", object);
            }
            else {
                console.log(this.getDateString() + " [WARN] " + object);
            }
        }
    };
    /**
     * output error log
     * @param object display data
     */
    logger.error = function (object) {
        if (this.logLevel <= LogLevel.error) {
            if (typeof object == 'object') {
                console.log(this.getDateString() + " [ERR.] ", object);
            }
            else {
                console.log(this.getDateString() + " [ERR.] " + object);
            }
        }
    };
    /**
     * get date string
     * @return date string
     */
    logger.getDateString = function () {
        var date = new Date();
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    };
    return logger;
}());
/**
 * log level
 */
logger.logLevel = LogLevel.info;
module.exports = logger;
//# sourceMappingURL=logger.js.map