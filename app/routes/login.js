const path = require('path');
"use strict";
let express = require('express');
module.exports = function(io){
  const router = express.Router();
  router.get('/', function (req, res, next) {
    res.sendFile(path.resolve(__dirname, '../views/login.html'));
  });
  return router;
}

