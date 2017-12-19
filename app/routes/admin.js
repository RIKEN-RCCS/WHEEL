"use strict";
const path = require("path");

let express = require('express');

const config = require('../config/server.json')
const jsonArrayManager = require("./jsonArrayManager");
//const doAndEmit = require('./utility').doAndEmit;

module.exports = function(io){
  const userAccountFilename= path.resolve(__dirname, '../', config.useraccount);
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
    socket.on('addAccount',    doAndEmit.bind(null, userAccounts.add.bind(userAccounts)));
    socket.on('removeAccount', doAndEmit.bind(null, userAccounts.remove.bind(userAccounts)));
    socket.on('updateAccount', doAndEmit.bind(null, userAccounts.update.bind(userAccounts)));
  });
  const router = express.Router();
  router.get('/', function (req, res, next) {
    res.sendFile(path.resolve(__dirname,'../views/admin.html'));
  });
  return router;
}

