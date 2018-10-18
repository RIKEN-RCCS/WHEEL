"use strict";
const path = require("path");
const log4js = require("log4js");
log4js.addLayout("errorlog", ()=>{
  return function(logEvent) {
    const tmp = logEvent.data.reduce((a, p)=>{
      if (p instanceof Error) {
        return `${a}<br>${p.message}`;
      }

      if (typeof p === "string") {
        return `${a} ${p}`;
      }
      return a;
    }, "");
    return tmp;
  };
});

const defaultSettings = {
  appenders: {
    console: {
      type: path.resolve(__dirname, "flexibleConsoleLog")
    },
    file: {
      type: "file",
      filename: path.resolve(__dirname, "../wheel.log"),
      maxLogSize: 8388608,
      backups: 5,
      compress: true
    },
    multi: {
      type: "multiFile",
      property: "logFilename",
      base: "",
      extension: ""
    },
    workflow: {
      type: path.resolve(__dirname, "log2client"),
      namespace: "workflow"
    },
    errorlog: {
      type: path.resolve(__dirname, "errorlog"),
      layout: { type: "errorlog" }
    }
  },
  categories: {
    default: {
      appenders: [
        "console",
        "file"
      ],
      level: "debug"
    },
    workflow: {
      appenders: [
        "console",
        "multi",
        "workflow",
        "errorlog"
      ],
      level: "debug"
    },
    home: {
      appenders: [
        "console",
        "file",
        "errorlog"
      ],
      level: "debug"
    },
    remotehost: {
      appenders: [
        "console",
        "file",
        "errorlog"
      ],
      level: "debug"
    },
    login: {
      appenders: [
        "console",
        "file",
        "errorlog"
      ],
      level: "debug"
    },
    admin: {
      appenders: [
        "console",
        "file",
        "errorlog"
      ],
      level: "debug"
    },
    rapid: {
      appenders: [
        "console",
        "file",
        "errorlog"
      ],
      level: "debug"
    }
  },
  levels: {
    stdout: {
      value: 20000,
      colour: "green"
    },
    stderr: {
      value: 20000,
      colour: "green"
    },
    sshout: {
      value: 20000,
      colour: "green"
    },
    ssherr: {
      value: 20000,
      colour: "green"
    }
  }
};

let firstCall = true;
let logSettings = Object.assign({}, defaultSettings);

function reset() {
  return new Promise((resolve, reject)=>{
    logSettings = Object.assign({}, defaultSettings);

    if (firstCall) {
      resolve();
      return;
    }
    log4js.shutdown((err)=>{
      if (err) {
        reject(err);
      }
      firstCall = true;
      resolve();
    });
  });
}

function shutdown() {
  return new Promise((resolve, reject)=>{
    log4js.shutdown((err)=>{
      if (err) {
        reject(err);
      }
      firstCall = true;
      resolve();
    });
  });
}

function setFilename(filename) {
  logSettings.appenders.file.filename = filename;
}

function setMaxLogSize(size) {
  logSettings.appenders.file.maxLogSize = size;
}

function setNumBackup(num) {
  logSettings.appenders.file.backups = num;
}

function setCompress(TF) {
  logSettings.appenders.file.compress = TF === true;
}

function setSocketIO(sio) {
  logSettings.appenders.workflow.socketIO = sio;
  logSettings.appenders.errorlog.socketIO = sio;
}

/**
 * setup log4js
 * @param {Object} sio - SocketIO instance
 * @param {string} filename - general log file name
 * @param {number} size - max size of log file
 * @param {number} num - max back up files to keep
 * @param {boolean} compress - backup files to be compressed or not
 */
function setup(sio, filename, size, num, compress) {
  setSocketIO(sio);
  setFilename(filename);
  setMaxLogSize(size);
  setNumBackup(num);
  setCompress(compress);
}

function getCurrentSettings() {
  return logSettings;
}

function getLogger(cat, verbose) {
  if (firstCall) {
    if (verbose) {
      //eslint-disable-next-line no-console
      console.log("getLogger called. current setting is as follows\n", logSettings);
    }
    log4js.configure(logSettings);
    firstCall = false;
  }
  const logger = log4js.getLogger(cat);
  if (process.env.hasOwnProperty("WHEEL_DISABLE_LOG")) {
    if (verbose) {
      //eslint-disable-next-line no-console
      console.log("logging is disabled because WHEEL_DISABLE_LOG is set to ", process.env.WHEEL_DISABLE_LOG);
    }
    logger.level = "off";
  }
  return logger;
}

module.exports = {
  getCurrentSettings,
  getLogger,
  setSocketIO,
  setFilename,
  setMaxLogSize,
  setNumBackup,
  setCompress,
  setup,
  shutdown,
  reset
};
