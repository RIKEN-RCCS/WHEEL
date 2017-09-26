"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const logger = require("./logger");
const ServerUtility = require("./serverUtility");
const SwfType = require("./swfType");
/**
 * genereta submic script
 * @param data json data path
 * @param callback The function to call when we generate submit script
 */
function generateSubmitScript(data, callback) {
    if (data.json.type !== SwfType.JOB) {
        callback();
        return;
    }
    const config = require('../dst/config/server');
    const submitJobname = config.submit_script;
    const jobJson = data.json;
    const srcPath = path.join(__dirname, `../${config.scheduler[jobJson.remote.job_scheduler]}`);
    const dstPath = path.join(data.directory, data.json.path, submitJobname);
    fs.stat(dstPath, (err, stat) => {
        if (err && jobJson.job_script.path) {
            jobJson.script.path = submitJobname;
            const format = {
                '%%nodes%%': jobJson.script_param.nodes.toString(),
                '%%cores%%': jobJson.script_param.cores.toString(),
                '%%script%%': jobJson.job_script.path
            };
            ServerUtility.writeFileKeywordReplacedAsync(srcPath, dstPath, format, callback);
            logger.info(`create file=${dstPath}`);
            return;
        }
        callback();
    });
}
exports.generateSubmitScript = generateSubmitScript;
/**
 * save tree json
 * @param queue set queue
 * @param callback The function to call when we save tree json
 */
function saveTreeJson(queue, callback) {
    const data = queue.shift();
    if (!data) {
        callback();
        return;
    }
    const filename = ServerUtility.getTypeOfJson(data.json).getDefaultName();
    const oldDirectory = path.join(data.directory, data.json.oldPath);
    const newDirectory = path.join(data.directory, data.json.path);
    const filepath = path.join(newDirectory, filename);
    const error = (err) => {
        logger.error(err);
        saveTreeJson(queue, callback);
    };
    const update = () => {
        generateSubmitScript(data, (err) => {
            if (err) {
                error(err);
                return;
            }
            const copy = JSON.parse(JSON.stringify(data.json));
            delete copy.children;
            delete copy.oldPath;
            delete copy.script_param;
            fs.writeFile(filepath, JSON.stringify(copy, null, '\t'), (err) => {
                if (err) {
                    logger.error(err);
                }
                logger.info(`update file=${filepath}`);
                saveTreeJson(queue, callback);
            });
        });
    };
    const add = () => {
        fs.mkdir(newDirectory, (err) => {
            if (err) {
                error(err);
            }
            else {
                logger.info(`make    dir=${newDirectory}`);
                update();
            }
        });
    };
    const rename = () => {
        fs.rename(oldDirectory, newDirectory, (err) => {
            if (err) {
                error(err);
            }
            else {
                logger.info(`rename  dir=${oldDirectory} to ${newDirectory}`);
                update();
            }
        });
    };
    if (!data.json.oldPath) {
        add();
    }
    else if (data.json.path !== data.json.oldPath) {
        fs.stat(oldDirectory, (err, stat) => {
            if (err) {
                error(err);
            }
            else if (stat.isDirectory()) {
                rename();
            }
            else {
                add();
            }
        });
    }
    else {
        fs.stat(filepath, (err, stat) => {
            if (err) {
                add();
            }
            else if (stat.isFile()) {
                update();
            }
            else {
                add();
            }
        });
    }
}
exports.saveTreeJson = saveTreeJson;
/**
 * set data to queue
 * @param queue set queue
 * @param parentDirectory parent tree directory
 * @param json tree json data
 */
function setQueue(queue, parentDirectory, json) {
    queue.push({
        directory: parentDirectory,
        json: json
    });
    const childDirectory = path.join(parentDirectory, json.path);
    if (json.children) {
        json.children.forEach(child => {
            setQueue(queue, childDirectory, child);
        });
    }
}
exports.setQueue = setQueue;
//# sourceMappingURL=writeTreeJson.js.map