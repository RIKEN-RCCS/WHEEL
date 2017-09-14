import fs=require('fs');
import util=require('util');
import path=require('path');
import logger = require('./logger');


// promise.thenの引数に渡す関数が、引数にvoidを持つことを期待しているようなので
// こっちの関数定義の引数に型を指定するとコンパイルエラーになる・・・
/*
 * Buffer.toJSONをPromise.then()に渡すためのAdaptor
 *
 */
function parseJSON(data): any{
  return JSON.parse(data.toString());
}

/*
 * JSON.stringifyをtab区切りで呼び出すためのラッパー
 *
 */
function stringifyJSON(json): string{
  return JSON.stringify(json, null, '\t');
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

    util.promisify(fs.mkdir)(directoryPath)
    .then(util.promisify(fs.readFile).bind(null,projectTemplateFilePath))
    .then(parseJSON)
    .then(modifyProjectJson.bind(null, projectName, projectJsonPath, projectJsonPathWorkflow))
    .then(stringifyJSON)
    .then(util.promisify(fs.writeFile).bind(null, projectFilePath))
    .then(util.promisify(fs.readFile).bind(null, workflowTemplateFilePath))
    .then(parseJSON)
    .then(modifyWorkflowJson.bind(null, directoryPath))
    .then(stringifyJSON)
    .then(util.promisify(fs.writeFile).bind(null, workflowFilePath))
    .then(resolve.bind(null, projectFilePath));
  });
}
