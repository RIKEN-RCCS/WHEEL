"use strict";
var ssh2 = require("ssh2");
var logger = require("./logger");
var Remote;
(function (Remote) {
    var Ssh = (function () {
        function Ssh() {
            this._isConnected = false;
        }
        Object.defineProperty(Ssh.prototype, "isConnected", {
            get: function () {
                return this._isConnected;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * ssh connection
         */
        Ssh.prototype.connect = function (config, ifSucceed, ifFailed) {
            logger.info("start ssh connect " + config.username + "@" + config.host);
            var client = new ssh2.Client();
            client
                .on('connect', function () {
                logger.debug("connected");
            })
                .on('ready', function () {
                client.sftp(function (err, sftp) {
                    if (err) {
                        logger.error(err);
                    }
                    else {
                        ifSucceed();
                    }
                    client.end();
                });
            })
                .on('error', function (err) {
                logger.error(err);
                ifFailed();
            })
                .on('close', function (had_error) {
                logger.debug('connection close');
            })
                .on('end', function () {
                logger.debug('end remote session.');
            })
                .connect(config);
        };
        return Ssh;
    }());
    Remote.Ssh = Ssh;
})(Remote || (Remote = {}));
module.exports = Remote;
//# sourceMappingURL=remote.js.map