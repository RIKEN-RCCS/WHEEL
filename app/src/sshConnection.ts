import fs = require('fs');
import ssh2 = require('ssh2');
import logger = require('./logger');

/**
 * execute ssh connect
 * @param hostInfo host information
 * @param pass input password string
 * @param callback The function to call when we end ssh connection test
 */
export function sshConnectTest(hostInfo: SwfHostJson, pass: string, callback: ((err?: Error) => void)) {

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

