var express = require('express');
var router = express.Router();
var path = require('path');
router.post('/', function (req, res, next) {
    res.cookie('edit', req.body.edit);
    res.sendFile(path.resolve('dst/views/editor.html'));
});
module.exports = router;
//# sourceMappingURL=editor.js.map