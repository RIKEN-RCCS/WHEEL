"use strict";
const fs = require("fs");
const {promisify}= require("util");
const path = require("path");

let nodegit = require("nodegit");

const compo = require("./workflowComponent");
const logger = require("../logger");
const {getDateString} = require('./utility');
const {extProject, extWF, systemName, defaultFilename} = require('../db/db');


async function create(projectDirectory, projectName) {
  await promisify(fs.mkdir)(projectDirectory)
  // write root workflow
  const rootWorkflowFilename = `${defaultFilename}${extWF}`;
  const rootWorkflowFileFullpath=path.join(projectDirectory, rootWorkflowFilename);
  let rootWorkflow = new compo.factory('workflow');
  rootWorkflow.name=projectName;
  rootWorkflow.path='./';
  rootWorkflow.jsonFile='./'+rootWorkflowFilename;
  logger.debug(rootWorkflow);
  await promisify(fs.writeFile)(rootWorkflowFileFullpath, JSON.stringify(rootWorkflow,null,4));

  // write project JSON
  const projectJsonFilename = `${systemName}${extProject}`;
  let timestamp=getDateString();
  const projectJson= {
    "name": `${projectName}`,
    "description": "This is new Project.",
    "state": "Planning",
    "path": `./${projectJsonFilename}`,
    "path_workflow": `./${rootWorkflowFilename}`,
    "ctime": timestamp,
    "mtime": timestamp
  };
  const projectJsonFileFullpath=path.join(projectDirectory, projectJsonFilename);
  logger.debug(projectJson);
  await promisify(fs.writeFile)(projectJsonFileFullpath, JSON.stringify(projectJson,null,4));

  let repo = await nodegit.Repository.init(projectDirectory, 0);
  const author = nodegit.Signature.now('wheel', "wheel@example.com"); //TODO replace user info
  const commiter= await author.dup();
  await repo.createCommitOnHead([projectJsonFilename, rootWorkflowFilename], author, commiter, "create new project");
  repo.free(); //TODO 本当に必要か要確認

  return projectJsonFileFullpath;
}

function rename(projectJsonFilepath, newName){
  return promisify(fs.readFile)(projectJsonFilepath)
    .then(function(data){
      var projectJson=JSON.parse(data);
      projectJson.name=newName;
      return JSON.stringify(projectJson, null, 4);
    })
    .then(promisify(fs.writeFile).bind(null, projectJsonFilepath))
}
exports.create = create;
exports.rename= rename;
