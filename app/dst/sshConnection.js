"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var ssh2 = require("ssh2");
var logger = require("./logger");
/**
 * execute ssh connect
 * @param hostInfo host information
 * @param pass input password string
 * @param callback The function to call when we end ssh connection test
 */
function sshConnectTest(hostInfo, pass, callback) {
    var config = {
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
    var client = new ssh2.Client();
    client
        .on('connect', function () {
        logger.debug("connected");
    })
        .on('ready', function () {
        client.sftp(function (err, sftp) {
            if (err) {
                callback(err);
            }
            else {
                callback();
            }
            client.end();
        });
    })
        .on('error', function (err) {
        logger.error(err);
        callback(err);
    })
        .on('close', function (had_error) {
        logger.debug('connection close');
    })
        .on('end', function () {
        logger.debug('end remote session.');
    })
        .connect(config);
}
exports.sshConnectTest = sshConnectTest;
//# sourceMappingURL=sshConnection.js.map