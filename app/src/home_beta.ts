import logger = require('./logger');
import sioHelper=require('./socketioHelper');

var onNew=function(msg){
  logger.debug(msg);
}
var onImport=function(msg){
  logger.debug(msg);
}
var onRemove=function(msg){
  logger.debug(msg);
}
var onRename=function(msg){
  logger.debug(msg);
}
var onReorder=function(msg){
  logger.debug(msg);
}

var eventListeners= {
'new': onNew,
'import': onImport,
'remove': onRemove,
'rename': onRename,
'reorder': onReorder
}

export function setup(sio: SocketIO.Server) {
  sioHelper.add(sio.of('/home'), eventListeners);
}
