import socketio = require('socket.io');
import http = require('http');
import fs = require('fs');
import url = require('url');
import path = require('path');
import logger = require('./logger');

/**
 * socket io class for server
 */
module ServerSocketIO {
    /**
     * socket io listener function interface
     */
    export interface SocketListener {
        /**
         * Adds a listener function
         */
        onEvent: ((socket: SocketIO.Socket) => void);
    }

    /**
     * socket io namespace and listeners pair
     */
    export interface EventNamespacePair {
        /**
         * socket io namespace
         */
        io: SocketIO.Namespace;
        /**
         * socket io listeners
         */
        listeners: SocketListener[];
    }

    /**
     * socket io class for server
     */
    export class SwfSocketIO {
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
         * @param server server instance
         */
        public constructor(server: http.Server) {
            this.server = socketio(server);
        }

        /**
         * adds event listeners
         * @param nsp socket namespace name
         * @param listeners event listener interface array
         */
        public addEventListener(namespace: string, listeners: SocketListener[]) {
            this.eventNspPairs.push({
                io: this.server.of(namespace),
                listeners: listeners
            });
        }

        /**
         * Connection event fired when we get a new connection
         */
        public onConnect() {
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
}

export = ServerSocketIO;