import logger = require('./logger');
/*
 * helper function for socketio.on()
 * @param sio       socket.io's namespace
 * @param eventName event name
 * @param callback  callback function
 *
 */
 export default function(sio: SocketIO.Namespace, eventName: string, callback: (msg: string)=>void) {
  sio.on('connect', (socket: SocketIO.Socket) => {
    logger.debug(`socket on connect ${sio.name}`);
    socket.on(eventName, callback);
    socket.on('disconnect', () => {
      logger.debug(`socket on disconnect ${sio.name}`);
    });
  })
}


