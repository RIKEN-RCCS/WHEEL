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
    "errorlog": {
      "type": "./errorlog"
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
        "errorlog"
      ],
      "level": "debug"
    },
    "remotehost": {
      "appenders": [
        "console",
        "file",
        "errorlog"
      ],
      "level": "debug"
    },
    "login": {
      "appenders": [
        "console",
        "file",
        "errorlog"
      ],
      "level": "debug"
    },
    "admin": {
      "appenders": [
        "console",
        "file",
        "errorlog"
      ],
      "level": "debug"
    },
    "rapid": {
      "appenders": [
        "console",
        "file",
        "errorlog"
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
let firstCall = true;
let logSettings = Object.assign({}, defaultSettings);

function reset(){
  return new Promise((resolve, reject)=>{
    log4js.shutdown((err)=>{
      if(err) reject();
      logSettings = Object.assign({}, defaultSettings);
      ready = false;
      firstCall = true;
      resolve();
    });
  });
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
  logSettings.appenders.errorlog.socketIO=sio;
  ready=true;
}

function getLogger(cat, verbose){
  if(! ready) return null;
  if(firstCall){
    if(verbose){
      console.log("getLogger called. current setting is as follows\n", logSettings);
    }
    log4js.configure(logSettings);
    firstCall=false;
  }
  return log4js.getLogger(cat);
}

module.exports.getLogger=getLogger;
module.exports.setSocketIO=setSocketIO;
module.exports.setFilename=setFilename;
module.exports.setMaxLogSize=setMaxLogSize;
module.exports.setNumBackup=setNumBackup;
module.exports.setCompress=setCompress;
