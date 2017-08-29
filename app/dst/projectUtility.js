"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var ServerUtility = require("./serverUtility");
var SwfState = require("./swfState");
var SwfType = require("./swfType");
/**
 * clean project json
 * @param projectFilePath project json file path
 * @param callback The function to call when we clean project
 */
function cleanProject(projectFilePath, callback) {
    fs.readFile(projectFilePath, function (err, data) {
        if (err) {
            callback(err);
            return;
        }
        var projectJson = JSON.parse(data.toString());
        projectJson.state = SwfState.PLANNING;
        fs.writeFile(projectFilePath, JSON.stringify(projectJson, null, '\t'), function (err) {
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
    logJson.children.forEach(function (child) {
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
    var _loop_1 = function (index) {
        var child = logJson.children[index];
        if (child.type !== SwfType.FOR && child.type !== SwfType.PSTUDY) {
            setQueue(queue, child);
            return "continue";
        }
        var basename = path.basename(child.path);
        var files = fs.readdirSync(logJson.path);
        var newChildren = [];
        var regexp = new RegExp("^" + basename + "_([0-9]+)$");
        files.forEach(function (file) {
            if (file.match(regexp)) {
                var newLogJson_1 = {
                    name: child.name + "_" + RegExp.$1,
                    path: child.path + "_" + RegExp.$1,
                    description: child.description,
                    type: child.type,
                    state: child.state,
                    execution_start_date: '',
                    execution_end_date: '',
                    order: child.order,
                    children: JSON.parse(JSON.stringify(child.children))
                };
                newLogJson_1.children.forEach(function (newChild) {
                    renameLogjsonPath(newChild, child.path, newLogJson_1.path);
                });
                newChildren.push(newLogJson_1);
            }
        });
        logJson.children.splice(index, 1);
        newChildren
            .sort(function (a, b) {
            var aIndex = parseInt(a.path.match(/([0-9]+)$/)[1]);
            var bIndex = parseInt(b.path.match(/([0-9]+)$/)[1]);
            if (aIndex < bIndex) {
                return 1;
            }
            else {
                return -1;
            }
        })
            .forEach(function (newChild) {
            logJson.children.splice(index, 0, newChild);
            setQueue(queue, newChild);
        });
    };
    for (var index = logJson.children.length - 1; index >= 0; index--) {
        _loop_1(index);
    }
}
exports.setQueue = setQueue;
/**
 * update log json data
 * @param queue set queue
 * @param callback The function to call when we have updated log json
 */
function updateLogJson(queue, callback) {
    var logJson = queue.shift();
    if (!logJson) {
        callback();
        return;
    }
    if (SwfState.isFinished(logJson)) {
        updateLogJson(queue, callback);
        return;
    }
    var config = require('../dst/config/server');
    var logFilePath = path.join(logJson.path, config.system_name + ".log");
    fs.readFile(logFilePath, function (err, data) {
        if (!err) {
            var readJson = JSON.parse(data.toString());
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
    var dir_project = path.dirname(projectPath);
    var path_workflow = path.resolve(dir_project, projectJson.path_workflow);
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
    var projectJson = JSON.parse(data.toString());
    createProjectJson(projectFilepath, projectJson);
    if (!SwfState.isPlanning(projectJson)) {
        var queue = [];
        setQueue(queue, projectJson.log);
        updateLogJson(queue, function () {
            projectJson.state = projectJson.log.state;
        });
    }
    return projectJson;
}
exports.openProjectJson = openProjectJson;
//# sourceMappingURL=projectUtility.js.map