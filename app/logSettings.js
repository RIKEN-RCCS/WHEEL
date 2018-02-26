const path = require('path');
const log4js = require('log4js');

const defaultSettings = {
  "appenders": {
    "console": {
      "type": "console"
    },
    "file": {
      "type": "file",
      "filename" : path.resolve(__dirname, "../wheel.log"),
      "maxLogSize" : 8388608,
      "backups": 5,
      "compress" : true
    },
    "socketWF": {
      "type": "./log2client",
      "namespace": "workflow"
    },
    "socketHome": {
      "type": "./log2client",
      "namespace": "home",
      "eventName": "showMessage"
    },
    "socketRemotehost": {
      "type": "./log2client",
      "namespace": "remotehost",
      "eventName": "showMessage"
    },
    "socketLogin": {
      "type": "./log2client",
      "namespace": "login",
      "eventName": "showMessage"
    },
    "socketAdmin": {
      "type": "./log2client",
      "namespace": "admin",
      "eventName": "showMessage"
    },
    "socketRapid": {
      "type": "./log2client",
      "namespace": "rapid",
      "eventName": "showMessage"
    },
    "errorHome": {
      "type": "logLevelFilter",
      "appender": "socketHome",
      "level": "error"
    },
    "errorRemotehost": {
      "type": "logLevelFilter",
      "appender": "socketRemotehost",
      "level": "error"
    },
    "errorLogin": {
      "type": "logLevelFilter",
      "appender": "socketLogin",
      "level": "error"
    },
    "errorAdmin": {
      "type": "logLevelFilter",
      "appender": "socketAdmin",
      "level": "error"
    },
    "errorRapid": {
      "type": "logLevelFilter",
      "appender": "socketRapid",
      "level": "error"
    }
  },
  "categories": {
    "default": {
      "appenders": [
        "console",
        "file"
      ],
      "level": "debug"
    },
    "workflow": {
      "appenders": [
        "console",
        "file",
        "socketWF"
      ],
      "level": "debug"
    },
    "home": {
      "appenders": [
        "console",
        "file",
        "errorHome"
      ],
      "level": "debug"
    },
    "remotehost": {
      "appenders": [
        "console",
        "file",
        "errorRemotehost"
      ],
      "level": "debug"
    },
    "login": {
      "appenders": [
        "console",
        "file",
        "errorLogin"
      ],
      "level": "debug"
    },
    "admin": {
      "appenders": [
        "console",
        "file",
        "errorAdmin"
      ],
      "level": "debug"
    },
    "rapid": {
      "appenders": [
        "console",
        "file",
        "errorRapid"
      ],
      "level": "debug"
    }
  },
  "levels": {
    "stdout": {
      "value": 20000,
      "colour": "green"
    },
    "stderr": {
      "value": 20000,
      "colour": "green"
    },
    "sshout": {
      "value": 20000,
      "colour": "green"
    },
    "ssherr": {
      "value": 20000,
      "colour": "green"
    }
  }
}

let ready=false;
const logSettings = Object.assign({}, defaultSettings);

function setLogConfig(key, value){
  logSettings[key]=value;
}
function setFilename(filename){
  logSettings.appenders.file.filename=filename;
}
function setMaxLogSize(size){
  logSettings.appenders.file.maxLogSize=size;
}
function setNumBackup(num){
  logSettings.appenders.file.backups=num;
}
function setCompress(TF){
  logSettings.appenders.file.compress = TF == true;
}

function setSocketIO(sio){
  logSettings.appenders.socketWF.socketIO=sio;
  logSettings.appenders.socketHome.socketIO=sio;
  logSettings.appenders.socketRemotehost.socketIO=sio;
  logSettings.appenders.socketLogin.socketIO=sio;
  logSettings.appenders.socketAdmin.socketIO=sio;
  logSettings.appenders.socketRapid.socketIO=sio;
  ready=true;
}

function getLogger(cat){
  if(! ready) return null;
  console.log("getLogger called. current setting is as follows\n", logSettings);
  log4js.configure(logSettings);
  return log4js.getLogger(cat);
}

module.exports.setLogConfig=setLogConfig;
module.exports.setSocketIO=setSocketIO;
module.exports.getLogger=getLogger;
module.exports.setFilename=setFilename;
module.exports.setMaxLogSize=setMaxLogSize;
module.exports.setNumBackup=setNumBackup;
module.exports.setCompress=setCompress;
