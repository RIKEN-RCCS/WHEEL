import fs=require('fs');
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
    static logLevel = LogLevel.debug;

    /**
     * socket.io server
     */
     static socket=null;

    /**
     * log file
     */
     static logfile=null;

    /**
     * set log lovel
     * @param level log level
     */
    static setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    /**
     * recieve socket and enable log output with io.emit
     */
     static setSocket(socket: SocketIO.Socket):void {
         this.socket=socket;
     }

    /**
     * disable log output with io.emit
     */
     static disableSocket():void {
         this.socket=null;
     }

    /**
     * enable log output to file and create output stream
     */
     static setLogfile(filename: string):void {
         this.logfile=filename;
         this.info(`log file ${this.logfile} open`)
     }

    /**
     * disable log output to file
     */
     static disableLogfile():void {
     this.info(`log file ${this.logfile} closed`)
         this.logfile=null;
     }

    /**
     * output debug log
     * @param object display data
     */
    static debug(object: any): void {
        if (this.logLevel <= LogLevel.debug) {
            this.print(object, 'DBG   ');
        }
    }

    /**
     * output info log
     * @param object display data
     */
    static info(object: any): void {
        if (this.logLevel <= LogLevel.info) {
            this.print(object, 'INFO  ');
        }
    }

    /**
     * output warning log
     * @param object display data
     */
    static warn(object: any): void {
        if (this.logLevel <= LogLevel.warn) {
            this.print(object, 'WARN  ');
        }
    }

    /**
     * output error log
     * @param object display data
     */
    static error(object: any): void {
        if (this.logLevel <= LogLevel.error) {
          this.print(object, 'ERR   ');
        }
    }

    /**
     * output stdout from child_process
     * @param object display data
     */
    static stdout(object: any): void {
        this.print(object, 'Stdout');
    }

    /**
     * output stderr from child_process
     * @param object display data
     */
    static stderr(object: any): void {
        this.print(object, 'Stderr');
    }

    /**
     * output stdout from ssh
     * @param object display data
     */
    static SSHout(object: any): void {
        this.print(object, 'SSHout');
    }

    /**
     * output stderr from ssh
     * @param object display data
     */
    static SSHerr(object: any): void {
        this.print(object, 'SSHerr');
    }

    /**
     * get date string
     * @return date string
     */
    static getDateString(): string {
        const date = new Date();
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }

    /**
     * print actual log message
     *
     */
     static print(object: any, level: string): void {
       if (typeof object == 'object') {
         console.log(`${this.getDateString()} [${level}] `, object);
       } else {
         console.log(`${this.getDateString()} [${level}] ${object}`);
       }
       var line: string = this.getDateString();
       line += ` [${level}] `;
       line += JSON.stringify(object);
       if(this.socket != null){
         var eventName='log'+level;
         this.socket.emit(eventName.trim(), line);
       }
       if(this.logfile != null){
         fs.appendFile(this.logfile, line+'\n', function(){return;});
       }
     }
}

export = Logger;
