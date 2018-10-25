"use strict";

//eslint-disable-next-line no-console
const consoleLog = console.log.bind(console);

function consoleAppender(layout, timezoneOffset) {
  return (loggingEvent)=>{
    if (process.env.hasOwnProperty("WHEEL_DISABLE_CONSOLELOG")) {
      return;
    }
    consoleLog(layout(loggingEvent, timezoneOffset));
  };
}

function configure(config, layouts) {
  let layout = layouts.colouredLayout;
  if (config.layout) {
    layout = layouts.layout(config.layout.type, config.layout);
  }
  return consoleAppender(layout, config.timezoneOffset);
}

module.exports.configure = configure;
