var express = require('express');
var router = express.Router();
var path = require('path');
router.post('/', function (req, res, next) {
    res.cookie('project', req.body.project);
    res.cookie('root', req.body.root);
    res.sendFile(path.resolve('dst/views/workflow.html'));
});
module.exports = router;
//# sourceMappingURL=workflow.js.map