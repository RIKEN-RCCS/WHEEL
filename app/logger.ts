
enum LogLevel {
    debug,
    info,
    warn,
    error,
    fatal
};

class logger {

    private static logLevel = LogLevel.info;

    public static setLovLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    public static debug(object: string): void {
        if (this.logLevel <= LogLevel.debug) {
            console.log(`${this._getDateString()} [DBG.] ${object}`);
        }
    }

    public static info(object: string): void {
        if (this.logLevel <= LogLevel.info) {
            console.log(`${this._getDateString()} [INFO] ${object}`);
        }
    }

    public static warn(object: string): void {
        if (this.logLevel <= LogLevel.warn) {
            console.log(`${this._getDateString()} [WARN] ${object}`);
        }
    }

    public static error(object: any): void {
        if (this.logLevel <= LogLevel.error) {
            if (typeof object == 'object') {
                console.log(`${this._getDateString()} [ERR.] `, object);
            }
            else {
                console.log(`${this._getDateString()} [ERR.] ${object}`);
            }
        }
    }

    private static _getDateString() {
        const date = new Date();
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
}

export = logger;