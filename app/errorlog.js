/**
 * send log message to client vi socketIO if level is higher than 40000(ERROR)
 */
function socketIOAppender(layout, timezoneOffset, socket, eventName){
  return (loggingEvent)=>{
    const namespace = loggingEvent.categoryName;
    if(loggingEvent.level.level >= 40000){
      socket.of(namespace).emit(eventName, layout(loggingEvent, timezoneOffset));
    }
  };
}

function configure(config, layouts){
  let layout = layouts.messagePassThroughLayout;
  if(config.layout){
    layout = layouts.layout(config.layout.type, config.layout);
  }
  const eventName = config.eventName || "showMessage";
  return socketIOAppender(layout, config.timezoneOffset, config.socketIO, eventName);
}
module.exports.configure = configure;
