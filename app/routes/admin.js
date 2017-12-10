"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const util = require('util');

let express = require('express');

const config = require('../config/server.json')
const jsonArrayManager = require("./jsonArrayManager");

module.exports = function(io){
  const userAccountFilename= path.resolve('./app', config.useraccount);
  let userAccounts= new jsonArrayManager(userAccountFilename);

  let sio=io.of('/admin');
  let doAndEmit = function(func, msg){
    func(msg).then(()=>{
      sio.emit('accountList', userAccounts.getAll());
    });
  }
  sio.on('connect', (socket) => {
    socket.on('getAccountList', ()=>{
      userAccounts.getAllProject()
        .then((results)=>{
          socket.emit('accountList', results);
        });
    });
    socket.on('addAccount',    doAndEmit.bind(null, userAccounts.add.bind(remoteHost)));
    socket.on('removeAccount', doAndEmit.bind(null, userAccounts.remove.bind(remoteHost)));
    socket.on('updateAccount', doAndEmit.bind(null, userAccounts.update.bind(remoteHost)));
  });
  const router = express.Router();
  router.get('/', function (req, res, next) {
    res.sendFile(path.resolve('app/views/admin.html'));
  });
  return router;
}

