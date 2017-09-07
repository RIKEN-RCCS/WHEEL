var express = require('express');
var router = express.Router();
var path = require('path');

router.post('/', function(req, res, next) {
  res.cookie('project', req.body.project);
  res.sendFile(path.resolve('dst/views/project_manager.html'));
});

module.exports = router;
