"use strict";
const eventNameTable = {
  DEBUG: "logDBG",
  INFO: "logINFO",
  WARN: "logWARN",
  ERROR: "logERR",
  STDOUT: "logStdout",
  STDERR: "logStderr",
  SSHOUT: "logSSHout",
  SSHERR: "logSSHerr"
};

function socketIOAppender(layout, timezoneOffset) {
  return (loggingEvent)=>{
    if (loggingEvent.level.level < 20000) {
      return;
    }
    const eventName = eventNameTable[loggingEvent.level.levelStr];
    const socket = loggingEvent.context.sio;

    if (eventName) {
      socket.emit(eventName, layout(loggingEvent, timezoneOffset));
    }
  };
}

function configure(config, layouts) {
  let layout = layouts.basicLayout;

  if (config.layout) {
    layout = layouts.layout(config.layout.type, config.layout);
  }
  return socketIOAppender(layout, config.timezoneOffset);
}
module.exports.configure = configure;
