"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const ssh2 = require("ssh2");
const logger = require("./logger");
/**
 * execute ssh connect
 * @param hostInfo host information
 * @param pass input password string
 * @param callback The function to call when we end ssh connection test
 */
function sshConnectTest(hostInfo, pass, callback) {
    const config = {
        host: hostInfo.host,
        port: hostInfo.port,
        username: hostInfo.username
    };
    if (hostInfo.keyFile) {
        config.passphrase = pass;
        config.privateKey = fs.readFileSync(hostInfo.keyFile);
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
        client.sftp((err, sftp) => {
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
exports.sshConnectTest = sshConnectTest;
//# sourceMappingURL=sshConnection.js.map
