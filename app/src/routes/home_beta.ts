var express = require('express');
var router = express.Router();
var path = require('path');

router.get('/', function(req, res, next) {
  res.sendFile(path.resolve('dst/views/home_beta.html'));
});

module.exports = router;
