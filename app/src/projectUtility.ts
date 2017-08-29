import fs=require('fs');
import path = require('path');
import logger = require('./logger');
import ServerUtility = require('./serverUtility');
import SwfState = require('./swfState');
import SwfType = require('./swfType');

/**
 * clean project json
 * @param projectFilePath project json file path
 * @param callback The function to call when we clean project
 */
export function cleanProject(projectFilePath, callback: ((err?: Error) => void)) {
    fs.readFile(projectFilePath, (err, data) => {
        if (err) {
            callback(err);
            return
        }
        const projectJson: SwfProjectJson = JSON.parse(data.toString());
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

/**
 * rename log json path
 * @param logJson log json data
 * @param from string befor conversion
 * @param to string after conversion
 */
export function renameLogjsonPath(logJson: SwfLogJson, from: string, to: string) {
    logJson.path = logJson.path.replace(from, to);
    logJson.children.forEach(child => {
        renameLogjsonPath(child, from, to);
    });
};


/**
 * set queue scpecified log json data
 * @param queue set queue
 * @param logJson log json data
 */
export function setQueue(queue: SwfLogJson[], logJson: SwfLogJson) {
    queue.push(logJson);

    for (let index = logJson.children.length - 1; index >= 0; index--) {
        const child = logJson.children[index];
        if (child.type !== SwfType.FOR && child.type !== SwfType.PSTUDY) {
            setQueue(queue, child);
            continue;
        }
        const basename = path.basename(child.path);
        const files = fs.readdirSync(logJson.path);
        const newChildren: SwfLogJson[] = [];
        const regexp = new RegExp(`^${basename}_([0-9]+)$`);
        files.forEach(file => {
            if (file.match(regexp)) {
                const newLogJson: SwfLogJson = {
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

/**
 * update log json data
 * @param queue set queue
 * @param callback The function to call when we have updated log json
 */
export function updateLogJson(queue: SwfLogJson[], callback: (() => void)) {
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
            const readJson: SwfLogJson = JSON.parse(data.toString());
            logJson.state = readJson.state;
            logJson.execution_start_date = readJson.execution_start_date;
            logJson.execution_end_date = readJson.execution_end_date;
        }
        updateLogJson(queue, callback);
    });
}

/**
 * create project new project json
 * @param projectPath project json file path
 * @param projectJson project json data
 */
export function createProjectJson(projectPath: string, projectJson: SwfProjectJson) {
    const dir_project = path.dirname(projectPath);
    const path_workflow = path.resolve(dir_project, projectJson.path_workflow);
    projectJson.log = ServerUtility.createLogJson(path_workflow);
}

/**
 * open project json
 * #param projectFilepath project json file path
 *
 */
export function openProjectJson(projectFilepath){
  var data= fs.readFileSync(projectFilepath)
  const projectJson: SwfProjectJson = JSON.parse(data.toString());
  createProjectJson(projectFilepath, projectJson);
  if (! SwfState.isPlanning(projectJson)) {
    const queue: SwfLogJson[] = [];
    setQueue(queue, projectJson.log);
    updateLogJson(queue, () => {
      projectJson.state = projectJson.log.state;
    });
  }
  return projectJson;
}

