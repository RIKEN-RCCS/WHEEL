"use strict"
import { io } from "socket.io-client"

let socket = null
function init () {
  socket = io("/workflow", { transposrts: ["websocket"] })
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
}
