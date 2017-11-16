"use strict";
let express = require('express');
module.exports = function(io){
  const router = express.Router();
  router.get('/', function (req, res, next) {
    res.sendFile(path.resolve('app/views/login.html'));
  });
  return router;
}

