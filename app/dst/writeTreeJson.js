"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var logger = require("./logger");
var ServerUtility = require("./serverUtility");
var ServerConfig = require("./serverConfig");
var SwfType = require("./swfType");
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
    var config = ServerConfig.getConfig();
    var submitJobname = config.submit_script;
    var jobJson = data.json;
    var srcPath = path.join(__dirname, "../" + config.scheduler[jobJson.remote.job_scheduler]);
    var dstPath = path.join(data.directory, data.json.path, submitJobname);
    fs.stat(dstPath, function (err, stat) {
        if (err && jobJson.job_script.path) {
            jobJson.script.path = submitJobname;
            var format = {
                '%%nodes%%': jobJson.script_param.nodes.toString(),
                '%%cores%%': jobJson.script_param.cores.toString(),
                '%%script%%': jobJson.job_script.path
            };
            ServerUtility.writeFileKeywordReplacedAsync(srcPath, dstPath, format, callback);
            logger.info("create file=" + dstPath);
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
    var data = queue.shift();
    if (!data) {
        callback();
        return;
    }
    var filename = ServerUtility.getTypeOfJson(data.json).getDefaultName();
    var oldDirectory = path.join(data.directory, data.json.oldPath);
    var newDirectory = path.join(data.directory, data.json.path);
    var filepath = path.join(newDirectory, filename);
    var error = function (err) {
        logger.error(err);
        saveTreeJson(queue, callback);
    };
    var update = function () {
        generateSubmitScript(data, function (err) {
            if (err) {
                error(err);
                return;
            }
            var copy = JSON.parse(JSON.stringify(data.json));
            delete copy.children;
            delete copy.oldPath;
            delete copy.script_param;
            fs.writeFile(filepath, JSON.stringify(copy, null, '\t'), function (err) {
                if (err) {
                    logger.error(err);
                }
                logger.info("update file=" + filepath);
                saveTreeJson(queue, callback);
            });
        });
    };
    var add = function () {
        fs.mkdir(newDirectory, function (err) {
            if (err) {
                error(err);
            }
            else {
                logger.info("make    dir=" + newDirectory);
                update();
            }
        });
    };
    var rename = function () {
        fs.rename(oldDirectory, newDirectory, function (err) {
            if (err) {
                error(err);
            }
            else {
                logger.info("rename  dir=" + oldDirectory + " to " + newDirectory);
                update();
            }
        });
    };
    if (!data.json.oldPath) {
        add();
    }
    else if (data.json.path !== data.json.oldPath) {
        fs.stat(oldDirectory, function (err, stat) {
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
        fs.stat(filepath, function (err, stat) {
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
    var childDirectory = path.join(parentDirectory, json.path);
    if (json.children) {
        json.children.forEach(function (child) {
            setQueue(queue, childDirectory, child);
        });
    }
}
exports.setQueue = setQueue;
//# sourceMappingURL=writeTreeJson.js.map