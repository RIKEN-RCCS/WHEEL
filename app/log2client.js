const eventNameTable={
  DEBUG: "logDBG",
  INFO: "logINFO",
  WARN: "logWARN",
  ERROR: "logERR",
  STDOUT: "logStdout",
  STDERR: "logStderr",
  SSHOUT: "logSSHout",
  SSHERR: "logSSHerr"
}
function socketIOAppender(layout, timezoneOffset, socket, namespace, argEventName){
  return (loggingEvent)=>{
    const eventName = argEventName || eventNameTable[loggingEvent.level.levelStr];
    if(eventName){
      socket.of(namespace).emit(eventName, layout(loggingEvent, timezoneOffset));
    }else{
      console.log('eventName not found in table');
      console.log('loglevel =',loggingEvent.level.levelStr);
    }
  };
}
function configure(config, layouts){
  let layout = layouts.basicLayout;
  if(config.layout){
    layout = layouts.layout(config.layout.type, config.layout);
  }
  return socketIOAppender(layout, config.timezoneOffset, config.socketIO, config.namespace, config.eventName);
}
module.exports.configure = configure;
