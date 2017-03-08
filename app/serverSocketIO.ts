import socketio = require('socket.io');
import http = require('http');
import fs = require('fs');
import url = require('url');
import path = require('path');
import logger = require('./logger');

/**
 * socket io class for server
 */
class ServerSocketIO {

    /**
     * socketio server side instance
     */
    private server: SocketIO.Server;

    /**
     * event name and listener pair list
     */
    private eventNspPairs: EventNamespacePair[] = [];

    /**
     * construct new socket
     */
    public constructor(server: http.Server) {
        this.server = socketio(server);
    }

    /**
     *
     * @param nsp: socket namespace
     * @param listeners: event listener interface array
     * @returns none
     */
    public addEventListener(nsp: string, listeners: SocketListener[]) {
        this.eventNspPairs.push({
            io: this.server.of(nsp),
            listeners: listeners
        });
    }

    /**
     * Connection event fired when we get a new connection
     * @returns none
     */
    public onConnect(): void {
        this.eventNspPairs.forEach(pair => {
            pair.io.on('connect', (socket: SocketIO.Socket) => {
                logger.debug(`socket on connect ${pair.io.name}`);
                pair.listeners.forEach(listener => listener.onEvent(socket));
                socket.on('disconnect', () => {
                    logger.debug(`socket on disconnect ${pair.io.name}`);
                });
            })
        });
    }
}


export = ServerSocketIO;