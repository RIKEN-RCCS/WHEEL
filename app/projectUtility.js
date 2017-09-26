"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const ServerUtility = require("./serverUtility");
const SwfState = require("./swfState");
const SwfType = require("./swfType");
/**
 * clean project json
 * @param projectFilePath project json file path
 * @param callback The function to call when we clean project
 */
function cleanProject(projectFilePath, callback) {
    fs.readFile(projectFilePath, (err, data) => {
        if (err) {
            callback(err);
            return;
        }
        const projectJson = JSON.parse(data.toString());
        projectJson.state = SwfState.PLANNING;
        fs.writeFile(projectFilePath, JSON.stringify(projectJson, null, '\t'), (err) => {
            if (err) {
                callback(err);
                return;
            }
            callback();
        });
    });
}
exports.cleanProject = cleanProject;
/**
 * rename log json path
 * @param logJson log json data
 * @param from string befor conversion
 * @param to string after conversion
 */
function renameLogjsonPath(logJson, from, to) {
    logJson.path = logJson.path.replace(from, to);
    logJson.children.forEach(child => {
        renameLogjsonPath(child, from, to);
    });
}
exports.renameLogjsonPath = renameLogjsonPath;
;
/**
 * set queue scpecified log json data
 * @param queue set queue
 * @param logJson log json data
 */
function setQueue(queue, logJson) {
    queue.push(logJson);
    for (let index = logJson.children.length - 1; index >= 0; index--) {
        const child = logJson.children[index];
        if (child.type !== SwfType.FOR && child.type !== SwfType.PSTUDY) {
            setQueue(queue, child);
            continue;
        }
        const basename = path.basename(child.path);
        const files = fs.readdirSync(logJson.path);
        const newChildren = [];
        const regexp = new RegExp(`^${basename}_([0-9]+)$`);
        files.forEach(file => {
            if (file.match(regexp)) {
                const newLogJson = {
                    name: `${child.name}_${RegExp.$1}`,
                    path: `${child.path}_${RegExp.$1}`,
                    description: child.description,
                    type: child.type,
                    state: child.state,
                    execution_start_date: '',
                    execution_end_date: '',
                    order: child.order,
                    children: JSON.parse(JSON.stringify(child.children))
                };
                newLogJson.children.forEach(newChild => {
                    renameLogjsonPath(newChild, child.path, newLogJson.path);
                });
                newChildren.push(newLogJson);
            }
        });
        logJson.children.splice(index, 1);
        newChildren
            .sort((a, b) => {
            const aIndex = parseInt(a.path.match(/([0-9]+)$/)[1]);
            const bIndex = parseInt(b.path.match(/([0-9]+)$/)[1]);
            if (aIndex < bIndex) {
                return 1;
            }
            else {
                return -1;
            }
        })
            .forEach(newChild => {
            logJson.children.splice(index, 0, newChild);
            setQueue(queue, newChild);
        });
    }
}
exports.setQueue = setQueue;
/**
 * update log json data
 * @param queue set queue
 * @param callback The function to call when we have updated log json
 */
function updateLogJson(queue, callback) {
    const logJson = queue.shift();
    if (!logJson) {
        callback();
        return;
    }
    if (SwfState.isFinished(logJson)) {
        updateLogJson(queue, callback);
        return;
    }
    const config = require('../dst/config/server');
    const logFilePath = path.join(logJson.path, `${config.system_name}.log`);
    fs.readFile(logFilePath, (err, data) => {
        if (!err) {
            const readJson = JSON.parse(data.toString());
            logJson.state = readJson.state;
            logJson.execution_start_date = readJson.execution_start_date;
            logJson.execution_end_date = readJson.execution_end_date;
        }
        updateLogJson(queue, callback);
    });
}
exports.updateLogJson = updateLogJson;
/**
 * create project new project json
 * @param projectPath project json file path
 * @param projectJson project json data
 */
function createProjectJson(projectPath, projectJson) {
    const dir_project = path.dirname(projectPath);
    const path_workflow = path.resolve(dir_project, projectJson.path_workflow);
    projectJson.log = ServerUtility.createLogJson(path_workflow);
}
exports.createProjectJson = createProjectJson;
/**
 * open project json
 * #param projectFilepath project json file path
 *
 */
function openProjectJson(projectFilepath) {
    var data = fs.readFileSync(projectFilepath);
    const projectJson = JSON.parse(data.toString());
    createProjectJson(projectFilepath, projectJson);
    if (!SwfState.isPlanning(projectJson)) {
        const queue = [];
        setQueue(queue, projectJson.log);
        updateLogJson(queue, () => {
            projectJson.state = projectJson.log.state;
        });
    }
    return projectJson;
}
exports.openProjectJson = openProjectJson;
//# sourceMappingURL=projectUtility.js.map