"use strict";
const path = require("path");
const express = require("express");
const bcrypt = require("bcrypt");
const { getLogger } = require("../logSettings");
const logger = getLogger("login");
const { userAccount, saltRound } = require("../db/db");

module.exports = function(io) {
  const sio = io.of("/admin");

  function sendAccountList() {
    const coppiedAccounts = JSON.parse(JSON.stringify(userAccount.getAll()));
    coppiedAccounts.forEach((account)=>{
      account.password = null;
    });
    sio.emit("accountList", coppiedAccounts);
  }

  sio.on("connect", (socket)=>{
    logger.addContext("sio", socket);
    socket.on("addAccount", async(account)=>{
      logger.debug("addAccount request recieved", JSON.stringify(account, ["name", "description", "gid", "uid"], 4));
      account.password = await bcrypt.hash(account.password, saltRound);
      userAccount.add(account);
      sendAccountList();
    });
    socket.on("updateAccount", async(account)=>{
      logger.debug("updateAccount request recieved", JSON.stringify(account, ["name", "description", "gid", "uid"], 4));

      if (!account.hasOwnProperty("password") || account.password === null || typeof account.password === "undefined") {
        const id = userAccount.getID("name", account.name);
        const oldPassword = userAccount.get(id).password;
        account.password = oldPassword;
      } else {
        logger.debug("password changed", account.name);
        account.password = await bcrypt.hash(account.password, saltRound);
      }
      userAccount.update(account);
      sendAccountList();
    });
    socket.on("removeAccount", async(account)=>{
      logger.debug("removeAccount request recieved", JSON.stringify(account, ["name", "description", "gid", "uid"], 4));
      await userAccount.remove(account);
      sendAccountList();
    });
    socket.on("getAccountList", sendAccountList);
  });

  //eslint-disable-next-line new-cap
  const router = express.Router();
  router.get("/", (req, res)=>{
    res.sendFile(path.resolve(__dirname, "../views/admin.html"));
  });
  return router;
};
