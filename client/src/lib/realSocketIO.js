"use strict"
import { io } from "socket.io-client"
const SocketIOFileUpload = require("socketio-file-upload")

let socket = null
let uploader = null
function init () {
  socket = io("/workflow", { transposrts: ["websocket"] })
  uploader = new SocketIOFileUpload(socket)
  uploader.chunkSize = 1024 * 100
}

export default {
  close: ()=>{
    if (socket === null) {
      return
    }
    socket.close()
    socket = null
  },
  on: (event, callback)=>{
    if (socket === null) {
      init()
    }
    socket.on(event, callback)
  },
  once: (event, callback)=>{
    if (socket === null) {
      init()
    }
    socket.once(event, callback)
  },
  off: (event, callback)=>{
    if (socket === null) {
      init()
    }
    socket.off(event, callback)
  },
  emit: (event, ...args)=>{
    if (socket === null) {
      init()
    }
    socket.emit(event, ...args)
  },
  listenOnDrop: (...args)=>{
    if (socket === null) {
      init()
    }
    uploader.listenOnDrop(...args)
  },
  prompt: ()=>{
    if (socket === null) {
      init()
    }
    uploader.prompt()
  },
  onUploaderEvent: (event, callback)=>{
    if (socket === null) {
      init()
    }
    uploader.addEventListener(event, callback)
  },
  removeUploaderEvent: (event, callback)=>{
    if (socket === null) {
      return
    }
    uploader.removeEventListener(event, callback)
  },
}
