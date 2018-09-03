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
      type: "console"
    },
    file: {
      type: "file",
      filename: path.resolve(__dirname, "../wheel.log"),
      maxLogSize: 8388608,
      backups: 5,
      compress: true
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
        "file",
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
let ready = false;
let firstCall = true;
let logSettings = Object.assign({}, defaultSettings);

function reset() {
  return new Promise((resolve, reject)=>{
    if (firstCall) {
      logSettings = Object.assign({}, defaultSettings);
      ready = false;
      resolve();
      return;
    }
    log4js.shutdown((err)=>{
      if (err) {
        reject(err);
      }
      logSettings = Object.assign({}, defaultSettings);
      ready = false;
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
  ready = true;
}

function getLogger(cat, verbose) {
  if (!ready) {
    return null;
  }

  if (firstCall) {
    if (verbose) {
      //eslint-disable-next-line no-console
      console.log("getLogger called. current setting is as follows\n", logSettings);
    }
    log4js.configure(logSettings);
    firstCall = false;
  }
  return log4js.getLogger(cat);
}

module.exports.getLogger = getLogger;
module.exports.setSocketIO = setSocketIO;
module.exports.setFilename = setFilename;
module.exports.setMaxLogSize = setMaxLogSize;
module.exports.setNumBackup = setNumBackup;
module.exports.setCompress = setCompress;
module.exports.reset = reset;
