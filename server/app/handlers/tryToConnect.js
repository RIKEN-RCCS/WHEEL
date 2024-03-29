"use strict";
const { createSshConfig } = require("../core/sshManager");
const ARsshClient = require("arssh2-client");
const { getLogger } = require("../logSettings");
const logger = getLogger();

/**
 * try to connect remote host via ssh
 * @param {Hostinfo} hostInfo - target host
 * @param {string} password - password or passphrase for private key
 * @param {Function} cb - call back function called with string "success" or "error"
 */
async function tryToConnect(hostInfo, password, cb) {
  const config = await createSshConfig(hostInfo, password);
  const arssh = new ARsshClient(config, { connectionRetry: 1, connectionRetryDelay: 2000 });
  logger.debug("try to connect", config.host, ":", config.port);
  arssh.canConnect()
    .then(()=>{
      cb("success");
    })
    .catch((err)=>{
      err.config = Object.assign({}, config);

      if (Object.prototype.hasOwnProperty.call(err.config, "privateKey")) {
        err.config.privateKey = "privateKey was defined but omitted";
      }

      if (Object.prototype.hasOwnProperty.call(err.config, "password")) {
        err.config.password = "password  was defined but omitted";
      }

      if (Object.prototype.hasOwnProperty.call(err.config, "passphrase")) {
        err.config.passphrase = "passphrase  was defined but omitted";
      }
      logger.error(err);
      cb("error");
    });
}
module.exports = tryToConnect;
