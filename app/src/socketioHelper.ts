import logger = require('./logger');
/*
 * helper function for socketio.on()
 * @param sio      socket.io's namespace
 * @param listners dict which contains eventName and callback function pair
 *
 */
export function add(sio: SocketIO.Namespace, listeners) {
  sio.on('connect', (socket: SocketIO.Socket) => {
    logger.debug(`socket on connect ${sio.name}`);
    for(var eventName in  listeners){
      sio.on(eventName, listeners[eventName]);
    }
    socket.on('disconnect', () => {
      logger.debug(`socket on disconnect ${sio.name}`);
    });
  })
}


