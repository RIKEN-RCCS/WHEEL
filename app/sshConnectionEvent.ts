import fs = require('fs');
import path = require('path');
import ssh2 = require('ssh2');
import logger = require('./logger');
import serverUtility = require('./serverUtility');
import remote = require('./remote');

/**
 *
 */
class SshConnectionEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'onSshConnection';

    /**
     * @param socket:
     * @return none
     */
    public onEvent(socket: SocketIO.Socket): void {
        socket.on(SshConnectionEvent.eventName, (name: string, password: string) => {
            serverUtility.getHostInfo(
                (hostList: SwfHostJson[]): void => {
                    const host = hostList.filter(host => host.name === name)[0];
                    if (!host) {
                        this.emitFailed(socket);
                        logger.error(`${name} is not found at host list conf`);
                    }

                    if (serverUtility.isLocalHost(host.host)) {
                        this.emitSucceed(socket);
                        return;
                    }

                    this.sshConnect(host, password, socket);
                },
                (): void => {
                    this.emitFailed(socket);
                });
        });
    }

    /**
     * execute ssh connect
     * @param hostInfo: host information
     * @param pass: input password
     * @param socket: socket io object
     */
    private sshConnect(hostInfo: SwfHostJson, pass: string, socket: SocketIO.Socket) {

        const ssh = new remote.Ssh();
        const config: ssh2.ConnectConfig = {
            host: hostInfo.host,
            port: 22,
            username: hostInfo.username
        };

        try {
            if (hostInfo.privateKey) {
                config.privateKey = fs.readFileSync(hostInfo.privateKey);
                config.passphrase = pass;
            }
            else {
                config.password = pass;
            }

            ssh.connect(config,
                () => {
                    this.emitSucceed(socket);
                },
                () => {
                    this.emitFailed(socket);
                });
        }
        catch (err) {
            logger.error(err);
            this.emitFailed(socket);
        }
    }

    /**
     * send connect is succeed
     * @param socket: socket io object
     */
    private emitSucceed(socket: SocketIO.Socket) {
        socket.emit(SshConnectionEvent.eventName, true);
    }

    /**
     * send connect is failed
     * @param socket: socket io object
     */
    private emitFailed(socket: SocketIO.Socket) {
        socket.emit(SshConnectionEvent.eventName, false);
    }
}

export = SshConnectionEvent;