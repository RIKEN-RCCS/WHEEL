"use strict";
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["debug"] = 0] = "debug";
    LogLevel[LogLevel["info"] = 1] = "info";
    LogLevel[LogLevel["warn"] = 2] = "warn";
    LogLevel[LogLevel["error"] = 3] = "error";
    LogLevel[LogLevel["fatal"] = 4] = "fatal";
})(LogLevel || (LogLevel = {}));
;
var logger = (function () {
    function logger() {
    }
    logger.setLovLevel = function (level) {
        this.logLevel = level;
    };
    logger.debug = function (object) {
        if (this.logLevel <= LogLevel.debug) {
            console.log(this._getDateString() + " [DBG.] " + object);
        }
    };
    logger.info = function (object) {
        if (this.logLevel <= LogLevel.info) {
            console.log(this._getDateString() + " [INFO] " + object);
        }
    };
    logger.warn = function (object) {
        if (this.logLevel <= LogLevel.warn) {
            console.log(this._getDateString() + " [WARN] " + object);
        }
    };
    logger.error = function (object) {
        if (this.logLevel <= LogLevel.error) {
            if (typeof object == 'object') {
                console.log(this._getDateString() + " [ERR.] ", object);
            }
            else {
                console.log(this._getDateString() + " [ERR.] " + object);
            }
        }
    };
    logger._getDateString = function () {
        var date = new Date();
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    };
    return logger;
}());
logger.logLevel = LogLevel.info;
module.exports = logger;
//# sourceMappingURL=logger.js.map