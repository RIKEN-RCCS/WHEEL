"use strict";
var fs = require("fs");
var logger = require("./logger");
var serverUtility = require("./serverUtility");
var remote = require("./remote");
/**
 *
 */
var SshConnectionEvent = (function () {
    function SshConnectionEvent() {
    }
    /**
     * @param socket:
     * @return none
     */
    SshConnectionEvent.prototype.onEvent = function (socket) {
        var _this = this;
        socket.on(SshConnectionEvent.eventName, function (name, password) {
            serverUtility.getHostInfo(function (err, hostList) {
                if (err) {
                    logger.error(err);
                    socket.emit(SshConnectionEvent.eventName, false);
                    return;
                }
                if (!hostList) {
                    logger.error('host list does not exist');
                    socket.emit(SshConnectionEvent.eventName, false);
                    return;
                }
                var host = hostList.filter(function (host) { return host.name === name; })[0];
                if (!host) {
                    logger.error(name + " is not found at host list conf");
                    socket.emit(SshConnectionEvent.eventName, false);
                }
                if (serverUtility.isLocalHost(host.host)) {
                    socket.emit(SshConnectionEvent.eventName, true);
                    return;
                }
                _this.sshConnect(host, password, socket);
            });
        });
    };
    /**
     * execute ssh connect
     * @param hostInfo: host information
     * @param pass: input password
     * @param socket: socket io object
     */
    SshConnectionEvent.prototype.sshConnect = function (hostInfo, pass, socket) {
        var _this = this;
        var ssh = new remote.Ssh();
        var config = {
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
            ssh.connect(config, function () {
                _this.emitSucceed(socket);
            }, function () {
                _this.emitFailed(socket);
            });
        }
        catch (err) {
            logger.error(err);
            this.emitFailed(socket);
        }
    };
    /**
     * send connect is succeed
     * @param socket: socket io object
     */
    SshConnectionEvent.prototype.emitSucceed = function (socket) {
        socket.emit(SshConnectionEvent.eventName, true);
    };
    /**
     * send connect is failed
     * @param socket: socket io object
     */
    SshConnectionEvent.prototype.emitFailed = function (socket) {
        socket.emit(SshConnectionEvent.eventName, false);
    };
    return SshConnectionEvent;
}());
/**
 * event name
 */
SshConnectionEvent.eventName = 'onSshConnection';
module.exports = SshConnectionEvent;
//# sourceMappingURL=sshConnectionEvent.js.map