import fs = require('fs');
import ssh2 = require('ssh2');
import logger = require('../logger');
import ServerUtility = require('../serverUtility');
import ServerSocketIO = require('./serverSocketIO');

/**
 * socket io communication class for remote ssh connection test to server
 */
class SshConnectionEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static readonly eventName = 'onSshConnection';

    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket): void {

        const succeed = () => {
            socket.emit(SshConnectionEvent.eventName, true);
        };

        const failed = () => {
            socket.emit(SshConnectionEvent.eventName, false);
        };

        socket.on(SshConnectionEvent.eventName, (name: string, password: string) => {
            ServerUtility.getHostInfo((err, hostList) => {
                if (err) {
                    logger.error(err);
                    failed();
                    return;
                }
                if (!hostList) {
                    logger.error('host list does not exist');
                    failed();
                    return;
                }

                const host = hostList.filter(host => host.name === name)[0];

                if (!host) {
                    logger.error(`${name} is not found at host list conf`);
                    failed();
                }

                if (ServerUtility.isLocalHost(host.host)) {
                    succeed();
                    return;
                }

                this.sshConnectTest(host, password, (err: Error) => {
                    if (err) {
                        logger.error(err);
                        failed();
                    }
                    else {
                        succeed();
                    }
                });
            });
        });
    }

    /**
     * execute ssh connect
     * @param hostInfo host information
     * @param pass input password string
     * @param callback The function to call when we end ssh connection test
     */
    private sshConnectTest(hostInfo: SwfHostJson, pass: string, callback: ((err?: Error) => void)) {

        const config: ssh2.ConnectConfig = {
            host: hostInfo.host,
            port: 22,
            username: hostInfo.username
        };

        if (hostInfo.privateKey) {
            config.passphrase = pass;
            config.privateKey = fs.readFileSync(hostInfo.privateKey);
        }
        else {
            config.password = pass;
        }

        const client = new ssh2.Client();
        client
            .on('connect', () => {
                logger.debug(`connected`);
            })
            .on('ready', () => {
                client.sftp((err: Error, sftp: ssh2.SFTPWrapper) => {
                    if (err) {
                        callback(err);
                    }
                    else {
                        callback();
                    }
                    client.end();
                });
            })
            .on('error', (err) => {
                logger.error(err);
                callback(err);
            })
            .on('close', (had_error) => {
                logger.debug('connection close');
            })
            .on('end', () => {
                logger.debug('end remote session.');
            })
            .connect(config);
    }
}

export = SshConnectionEvent;