/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
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
