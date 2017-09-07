import logger = require('./logger');

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

export var eventListeners= {
'new': onNew,
'import': onImport,
'remove': onRemove,
'rename': onRename,
'reorder': onReorder
}

