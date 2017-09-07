var express = require('express');
var router = express.Router();
var path = require('path');
var logger = require('../logger');

router.get('/', function(req, res, next) {
  console.log(req);
  res.sendFile(path.resolve('dst/views/home_beta.html'));
});

module.exports = router;
