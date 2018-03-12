"use strict";
const path = require("path");
const express = require('express');
const {getLogger} = require('../logSettings');
const logger = getLogger('login');
const {userAccount} = require('../db/db')

module.exports = function(io){
  const sio=io.of('/admin');
  sio.on('connect', (socket) => {
    const doAndEmit = async function(eventName, func, msg){
      logger.debug(eventName,"request recieved", msg);
      await func(msg);
      sio.emit('accountList', userAccount.getAll());
    }

    socket.on('getAccountList', ()=>{
      sio.emit('accountList', userAccount.getAll());
    });
    socket.on('addAccount',    doAndEmit.bind(null, 'addAccount', userAccount.add.bind(userAccount)));
    socket.on('removeAccount', doAndEmit.bind(null, 'removeAccount', userAccount.remove.bind(userAccount)));
    socket.on('updateAccount', doAndEmit.bind(null, 'updateAccount', userAccount.update.bind(userAccount)));
  });
  const router = express.Router();
  router.get('/', function (req, res, next) {
    //TODO 認証情報の確認とadminじゃなければ/homeにリダイレクト
    res.sendFile(path.resolve(__dirname,'../views/admin.html'));
  });
  return router;
}

