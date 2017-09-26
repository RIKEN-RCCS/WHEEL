"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util = require("util");
const path = require("path");
// promise.thenの引数に渡す関数が、引数にvoidを持つことを期待しているようなので
// こっちの関数定義の引数に型を指定するとコンパイルエラーになる・・・
/*
 * Buffer.toJSONをPromise.then()に渡すためのAdaptor
 *
 */
function parseJSON(data) {
    return JSON.parse(data.toString());
}
/*
 * JSON.stringifyをtab区切りで呼び出すためのラッパー
 *
 */
function stringifyJSON(json) {
    return JSON.stringify(json, null, '\t');
}
function modifyProjectJson(projectName, projectJsonPath, projectJsonPathWorkflow, projectJson) {
    projectJson.name = projectName;
    projectJson.path = projectJsonPath;
    projectJson.path_workflow = projectJsonPathWorkflow;
    return projectJson;
}
function modifyWorkflowJson(directoryPath, workflowJson) {
    workflowJson.name = `${workflowJson.name}1`;
    workflowJson.path = path.basename(directoryPath);
    return workflowJson;
}
function create(directoryPath, projectName) {
    return new Promise(function (resolve, reject) {
        const config = require('./config/server.json');
        const projectFileName = config.system_name;
        const workflowFileName = config.default_filename;
        const projectTemplateFilePath = path.normalize(`${__dirname}/${config.template['project']}`);
        const workflowTemplateFilePath = path.normalize(`${__dirname}/${config.template['workflow']}`);
        const projectJsonPath = `./${projectFileName}${config.extension.project}`;
        const projectJsonPathWorkflow = `./${workflowFileName}${config.extension.workflow}`;
        const projectFilePath = path.join(directoryPath, projectJsonPath);
        const workflowFilePath = path.join(directoryPath, projectJsonPathWorkflow);
        util.promisify(fs.mkdir)(directoryPath)
            .then(util.promisify(fs.readFile).bind(null, projectTemplateFilePath))
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
exports.create = create;
//# sourceMappingURL=projectManager.js.map