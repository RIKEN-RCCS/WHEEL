"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const util = require('util');

let express = require('express');

const config = require('../config/server.json')
const jsonArrayManager = require("./jsonArrayManager");
//const doAndEmit = require('./utility').doAndEmit;

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
    console.log(userAccounts.getAll());
    socket.on('getAccountList', ()=>{
      socket.emit('accountList', userAccounts.getAll());
    });
    socket.on('addAccount',    doAndEmit.bind(null, userAccounts.add.bind(userAccounts)));
    socket.on('removeAccount', doAndEmit.bind(null, userAccounts.remove.bind(userAccounts)));
    socket.on('updateAccount', doAndEmit.bind(null, userAccounts.update.bind(userAccounts)));
  });
  const router = express.Router();
  router.get('/', function (req, res, next) {
    res.sendFile(path.resolve('app/views/admin.html'));
  });
  return router;
}

