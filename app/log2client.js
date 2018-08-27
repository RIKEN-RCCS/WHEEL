const eventNameTable={
  DEBUG: "logDBG",
  INFO: "logINFO",
  WARN: "logWARN",
  ERROR: "logERR",
  STDOUT: "logStdout",
  STDERR: "logStderr",
  SSHOUT: "logSSHout",
  SSHERR: "logSSHerr"
};
function socketIOAppender(layout, timezoneOffset, socket, namespace){
  return (loggingEvent)=>{
    const eventName = eventNameTable[loggingEvent.level.levelStr];
    if(eventName){
      socket.of(namespace).emit(eventName, layout(loggingEvent, timezoneOffset));
    }else{
      //eslint-disable-next-line no-console
      console.log("eventName for",loggingEvent.level.levelStr,"can not found");
    }
  };
}
function configure(config, layouts){
  let layout = layouts.basicLayout;
  if(config.layout){
    layout = layouts.layout(config.layout.type, config.layout);
  }
  return socketIOAppender(layout, config.timezoneOffset, config.socketIO, config.namespace);
}
module.exports.configure = configure;
