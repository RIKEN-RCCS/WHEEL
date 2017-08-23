
/**
 * log lever
 */
enum LogLevel {
    /**
     * debug level
     */
    debug,
    /**
     * info level
     */
    info,
    /**
     * warn level
     */
    warn,
    /**
     * error level
     */
    error,
    /**
     * fatal level
     */
    fatal
};

/**
 * logger class
 */
class Logger {

    /**
     * log level
     */
    private static logLevel = LogLevel.info;

    /**
     * set log lovel
     * @param level log level
     */
    public static setLovLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    /**
     * output debug log
     * @param object display data
     */
    public static debug(object: any): void {
        if (this.logLevel <= LogLevel.debug) {
            if (typeof object == 'object') {
                console.log(`${this.getDateString()} [DBG.] `, object);
            }
            else {
                console.log(`${this.getDateString()} [DBG.] ${object}`);
            }
        }
    }

    /**
     * output info log
     * @param object display data
     */
    public static info(object: any): void {
        if (this.logLevel <= LogLevel.info) {
            if (typeof object == 'object') {
                console.log(`${this.getDateString()} [INFO] `, object);
            }
            else {
                console.log(`${this.getDateString()} [INFO] ${object}`);
            }
        }
    }

    /**
     * output warning log
     * @param object display data
     */
    public static warn(object: any): void {
        if (this.logLevel <= LogLevel.warn) {
            if (typeof object == 'object') {
                console.log(`${this.getDateString()} [WARN] `, object);
            }
            else {
                console.log(`${this.getDateString()} [WARN] ${object}`);
            }
        }
    }

    /**
     * output error log
     * @param object display data
     */
    public static error(object: any): void {
        if (this.logLevel <= LogLevel.error) {
            if (typeof object == 'object') {
                console.log(`${this.getDateString()} [ERR.] `, object);
            }
            else {
                console.log(`${this.getDateString()} [ERR.] ${object}`);
            }
        }
    }

    /**
     * get date string
     * @return date string
     */
    private static getDateString(): string {
        const date = new Date();
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
}

export = Logger;