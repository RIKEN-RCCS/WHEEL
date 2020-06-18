"use strict";
const express = require("express");
const path = require("path");
const os = require("os");
const ARsshClient = require("arssh2-client");
const { getLogger } = require("../logSettings");
const logger = getLogger("remotehost");
const fileBrowser = require("../core/fileBrowser");
const { remoteHost, rootDir } = require("../db/db");
const { createSshConfig } = require("../core/sshManager");
const { convertPathSep } = require("../core/pathUtils");

async function sendFileList(sio, request) {
  logger.debug(`current dir = ${request}`);
  const target = request ? path.normalize(convertPathSep(request)) : rootDir || os.homedir() || "/";
  const result = await fileBrowser(target, {
    request,
    withParentDir: true
  });
  sio.emit("fileList", result);
}

async function trySshConnectionWrapper(hostInfo, password, cb) {
  const config = await createSshConfig(hostInfo, password);
  const arssh = new ARsshClient(config, { connectionRetry: 1, connectionRetryDelay: 2000 });
  logger.debug("try to connect", config.host, ":", config.port);
  arssh.canConnect()
    .then(()=>{
      cb(true);
    })
    .catch((err)=>{
      err.config = Object.assign({}, config);

      if (err.config.hasOwnProperty("privateKey")) {
        err.config.privateKey = "privateKey was defined but omitted";
      }

      if (err.config.hasOwnProperty("password")) {
        err.config.password = "password  was defined but omitted";
      }

      if (err.config.hasOwnProperty("passphrase")) {
        err.config.passphrase = "passphrase  was defined but omitted";
      }
      logger.error(err);
      cb(false);
    });
}

module.exports = function(io) {
  const sio = io.of("/remotehost");

  const doAndEmit = (func, msg)=>{
    func(msg).then(()=>{
      sio.emit("hostList", remoteHost.getAll());
    });
  };
  sio.on("connect", (socket)=>{
    logger.addContext("sio", socket);
    socket.on("getHostList", ()=>{
      socket.emit("hostList", remoteHost.getAll());
    });
    socket.on("addHost", doAndEmit.bind(null, remoteHost.add.bind(remoteHost)));
    socket.on("removeHost", doAndEmit.bind(null, remoteHost.remove.bind(remoteHost)));
    socket.on("updateHost", doAndEmit.bind(null, remoteHost.update.bind(remoteHost)));
    socket.on("copyHost", doAndEmit.bind(null, remoteHost.copy.bind(remoteHost)));
    socket.on("getFileList", sendFileList.bind(null, socket));
    socket.on("tryConnectHost", trySshConnectionWrapper.bind(null));
    socket.on("tryConnectHostById", async(id, password, cb)=>{
      const hostInfo = remoteHost.get(id);
      await trySshConnectionWrapper(hostInfo, password, cb);
    });
  });

  //eslint-disable-next-line new-cap
  const router = express.Router();
  router.get("/", (req, res)=>{
    res.sendFile(path.resolve(__dirname, "../views/remotehost.html"));
  });
  return router;
};
