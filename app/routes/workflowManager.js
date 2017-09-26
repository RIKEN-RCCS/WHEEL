var express = require('express');
var router = express.Router();
var path = require('path');
router.post('/', function (req, res, next) {
    res.cookie('root', req.body.root);
    res.cookie('index', req.body.index);
    res.sendFile(path.resolve('dst/views/workflow_manager.html'));
});
module.exports = router;
//# sourceMappingURL=workflowManager.js.map