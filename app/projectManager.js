"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util = require("util");
const path = require("path");

const compo = require("./workflowComponent");
const logger = require("./logger");

function create(projectDirectory, projectName) {
    return new Promise(function (resolve, reject) {
        const config = require('./config/server.json');
        util.promisify(fs.mkdir)(projectDirectory)
          .then(function(){
            const rootWorkflowFilename = `${config.default_filename}${config.extension.workflow}`;
            var rootWorkflow = new compo.Workflow(null);
            rootWorkflow.name=projectName;
            rootWorkflow.path=`./${rootWorkflowFilename}`;
            logger.debug(rootWorkflow);
            util.promisify(fs.writeFile)(path.join(projectDirectory, rootWorkflowFilename), JSON.stringify(rootWorkflow,null,4)).catch(reject);
            return(rootWorkflowFilename);
        })
        .then(function(rootWorkflowFilename){
          const projectJsonFilename = `${config.system_name}${config.extension.project}`;
          const projectJson= {
            "name": `${projectName}`,
            "description": "This is new Project.",
            "state": "Planning",
            "path": `./${projectJsonFilename}`,
            "path_workflow": `./${rootWorkflowFilename}`
          };
          const projectJsonFileFullpath=path.join(projectDirectory, projectJsonFilename);
          logger.debug(projectJson);
          util.promisify(fs.writeFile)(projectJsonFileFullpath, JSON.stringify(projectJson,null,4))
          resolve(projectJsonFileFullpath);
        })
        .catch(function(err){
          reject(err);
        });
    });
}
function rename(projectJsonFilepath, newName){
  return util.promisify(fs.readFile)(projectJsonFilepath)
    .then(function(data){
      var projectJson=JSON.parse(data);
      projectJson.name=newName;
      return JSON.stringify(projectJson, null, 4);
    })
    .then(util.promisify(fs.writeFile).bind(null, projectJsonFilepath))
}
exports.create = create;
exports.rename= rename;
