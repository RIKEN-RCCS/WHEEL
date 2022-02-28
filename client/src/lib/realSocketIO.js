"use strict";
import { io } from "socket.io-client";
const SocketIOFileUpload = require("socketio-file-upload");

let socket = null;
// following 2 socket will be removed after room integration
let socketGlobal = null;
let socketHome = null;
let socketRemoteHost = null;
let uploader = null;
function init () {
  socketGlobal = io("/", { transposrts: ["websocket"] });
  socket = io("/workflow", { transposrts: ["websocket"] });
  socketHome = io("/home", { transposrts: ["websocket"] });
  socketRemoteHost = io("/remotehost", { transposrts: ["websocket"] });
  uploader = new SocketIOFileUpload(socket);
  uploader.chunkSize = 1024 * 100;
}

export default {
  onHome: (event, callback)=>{
    if (socket === null) {
      init();
    }
    socketHome.on(event, callback);
  },
  onRemotehost: (event, callback)=>{
    if (socket === null) {
      init();
    }
    socketRemoteHost.on(event, callback);
  },
  onGlobal: (event, callback)=>{
    if (socket === null) {
      init();
    }
    socketGlobal.on(event, callback);
  },
  emitGlobal: (event, ...args)=>{
    if (socket === null) {
      init();
    }
    socketGlobal.emit(event, ...args);
  },
  emitHome: (event, ...args)=>{
    if (socket === null) {
      init();
    }
    socketHome.emit(event, ...args);
  },
  emitRemotehost: (event, ...args)=>{
    if (socket === null) {
      init();
    }
    socketRemoteHost.emit(event, ...args);
  },
  close: ()=>{
    if (socket === null) {
      return;
    }
    socket.close();
    socket = null;
  },
  on: (event, callback)=>{
    if (socket === null) {
      init();
    }
    socket.on(event, callback);
  },
  once: (event, callback)=>{
    if (socket === null) {
      init();
    }
    socket.once(event, callback);
  },
  off: (event, callback)=>{
    if (socket === null) {
      init();
    }
    socket.off(event, callback);
  },
  emit: (event, ...args)=>{
    if (socket === null) {
      init();
    }
    socket.emit(event, ...args);
  },
  listenOnDrop: (...args)=>{
    if (socket === null) {
      init();
    }
    uploader.listenOnDrop(...args);
  },
  prompt: ()=>{
    if (socket === null) {
      init();
    }
    uploader.prompt();
  },
  onUploaderEvent: (event, callback)=>{
    if (socket === null) {
      init();
    }
    uploader.addEventListener(event, callback);
  },
  removeUploaderEvent: (event, callback)=>{
    if (socket === null) {
      return;
    }
    uploader.removeEventListener(event, callback);
  },
};
