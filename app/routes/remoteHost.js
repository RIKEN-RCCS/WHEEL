var express = require('express');
var router = express.Router();
var path = require('path');
router.get('/', function (req, res, next) {
    res.sendFile(path.resolve('app/views/remoteHost.html'));
});
module.exports = router;
