"use strict";
var fs = require("fs");
var ssh2 = require("ssh2");
var logger = require("../logger");
var ServerUtility = require("../serverUtility");
/**
 * socket io communication class for remote ssh connection test to server
 */
var SshConnectionEvent = (function () {
    function SshConnectionEvent() {
    }
    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    SshConnectionEvent.prototype.onEvent = function (socket) {
        var _this = this;
        var succeed = function () {
            socket.emit(SshConnectionEvent.eventName, true);
        };
        var failed = function () {
            socket.emit(SshConnectionEvent.eventName, false);
        };
        socket.on(SshConnectionEvent.eventName, function (name, password) {
            ServerUtility.getHostInfo(function (err, hostList) {
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
                var host = hostList.filter(function (host) { return host.name === name; })[0];
                if (!host) {
                    logger.error(name + " is not found at host list conf");
                    failed();
                }
                if (ServerUtility.isLocalHost(host.host)) {
                    succeed();
                    return;
                }
                _this.sshConnectTest(host, password, function (err) {
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
    };
    /**
     * execute ssh connect
     * @param hostInfo host information
     * @param pass input password string
     * @param callback The function to call when we end ssh connection test
     */
    SshConnectionEvent.prototype.sshConnectTest = function (hostInfo, pass, callback) {
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
    };
    return SshConnectionEvent;
}());
/**
 * event name
 */
SshConnectionEvent.eventName = 'onSshConnection';
module.exports = SshConnectionEvent;
//# sourceMappingURL=sshConnectionEvent.js.map