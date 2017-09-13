import fs=require('fs');
import path=require('path');
import logger = require('./logger');


function readJson(filepath: string){
  return new Promise(function(resolve, reject){
    fs.readFile(filepath, function(err, data){
      if (err) {
        reject(err)
      }else{
        resolve(JSON.parse(data.toString()));
      }
    });
  });
}

function writeJson(filepath: string, json: any){
  return new Promise(function(resolve, reject){
    fs.writeFile(filepath, JSON.stringify(json, null, '\t'), (err) => {
      if (err) {
          reject(err);
      }else{
        resolve(filepath);
      }
    });
  });
}

function mkdir(directoryPath){
 return new Promise(function(resolve, reject){
   fs.mkdir(directoryPath, function(err){
    if (err) {
      reject(err)
    }else{
      resolve(directoryPath);
    }
   });
 });
}

function modifyProjectJson(projectName, projectJsonPath, projectJsonPathWorkflow, projectJson){
  projectJson.name=projectName;
  projectJson.path=projectJsonPath;
  projectJson.path_workflow=projectJsonPathWorkflow;
  return projectJson;
}

function modifyWorkflowJson(directoryPath, workflowJson){
  workflowJson.name = `${workflowJson.name}1`;
  workflowJson.path = path.basename(directoryPath);
  return workflowJson;
}

export function create(directoryPath: string, projectName: string) {
  return new Promise(function(resolve, reject){
    const config=require('./config/server.json');

    const projectFileName: string = config.system_name;
    const workflowFileName: string = config.default_filename;

    const projectTemplateFilePath=path.normalize(`${__dirname}/${config.template['project']}`);
    const workflowTemplateFilePath=path.normalize(`${__dirname}/${config.template['workflow']}`);
    const projectJsonPath= `./${projectFileName}${config.extension.project}`;
    const projectJsonPathWorkflow = `./${workflowFileName}${config.extension.workflow}`;
    const projectFilePath = path.join(directoryPath, projectJsonPath);
    const workflowFilePath = path.join(directoryPath, projectJsonPathWorkflow);

    mkdir(directoryPath)
    .then(readJson.bind(null, projectTemplateFilePath))
    .then(modifyProjectJson.bind(null, projectName, projectJsonPath, projectJsonPathWorkflow))
    .then(writeJson.bind(null, projectFilePath))
    .then(readJson.bind(null, workflowTemplateFilePath))
    .then(modifyWorkflowJson.bind(null, directoryPath))
    .then(writeJson.bind(null,workflowFilePath))
    .then(resolve.bind(null, projectFilePath));
  });
}
