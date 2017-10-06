const path = require('path');
const fs = require('fs');
const util = require('util');
var express = require('express');
var router = express.Router();

router.post('/', function (req, res, next) {
    var projectJSON=req.body.project;
    var projectDir=path.dirname(projectJSON);
    util.promisify(fs.readFile)(projectJSON)
    .then(function(data){
      var tmp = JSON.parse(data);
      var rootWorkflow=path.resolve(projectDir,tmp.path_workflow);
      res.cookie('root', rootWorkflow);
      res.cookie('project', projectJSON);
      res.sendFile(path.resolve('app/views/workflow.html'));
    })
});
module.exports = router;
