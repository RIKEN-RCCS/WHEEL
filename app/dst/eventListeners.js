"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var ServerUtility = require("./serverUtility");
var path = require("path");
var os = require("os");
var logger = require("./logger");
var fileUtility = require("./fileUtility");
var sshConnection = require("./sshConnection");
var ProjectOperator = require("./projectOperator");
var writeTreeJson = require("./writeTreeJson");
var projectUtility = require("./projectUtility");
var eventListeners = {
    'onAddHost': function (socket) {
        var eventName = 'onAddHost';
        socket.on(eventName, function (hostInfo) {
            ServerUtility.addHostInfo(hostInfo, function (err) {
                if (err) {
                    logger.error(err);
                    socket.emit(eventName, false);
                }
                else {
                    socket.emit(eventName, true);
                }
            });
        });
    },
    'onDeleteHost': function (socket) {
        var eventName = 'onDeleteHost';
        socket.on(eventName, function (name) {
            ServerUtility.deleteHostInfo(name, function (err) {
                if (err) {
                    logger.error(err);
                    socket.emit(eventName, false);
                }
                else {
                    socket.emit(eventName, true);
                }
            });
        });
    },
    'onGetRemoteHostList': function (socket) {
        var eventName = 'onGetRemoteHostList';
        socket.on(eventName, function () {
            ServerUtility.getHostInfo(function (err, hostList) {
                if (err) {
                    logger.error(err);
                    socket.emit(eventName);
                }
                else if (!hostList) {
                    logger.error('host list does not exist');
                    socket.emit(eventName);
                }
                else {
                    socket.json.emit(eventName, hostList);
                }
            });
        });
    },
    'onGetFileList': function (socket) {
        var eventName = 'onGetFileList';
        socket.on(eventName, function (directoryPath, extension) {
            directoryPath = directoryPath || os.homedir();
            if (!path.isAbsolute(directoryPath) || !fileUtility.isDir(directoryPath)) {
                socket.emit(eventName);
                return;
            }
            var regex = extension == null ? null : new RegExp(extension.replace(/\./, '\\.') + "$");
            try {
                var getFiles = fileUtility.getFiles(directoryPath, regex);
                logger.debug("send file list " + JSON.stringify(getFiles));
                var fileList = {
                    directory: directoryPath.replace(/[\\/]/g, '/') + "/",
                    files: getFiles
                };
                socket.json.emit(eventName, fileList);
            }
            catch (err) {
                logger.error(err);
                socket.emit(eventName);
            }
        });
    },
    'readFile': function (socket) {
        var eventName = 'readFile';
        socket.on(eventName, function (readFilePath) {
            fs.readFile(readFilePath, function (err, data) {
                if (err) {
                    logger.error(err);
                    socket.emit(eventName);
                    return;
                }
                socket.emit(eventName, data.toString());
            });
        });
    },
    'writeFile': function (socket) {
        var eventName = 'writeFile';
        socket.on(eventName, function (filepath, data) {
            fs.writeFile(filepath, data, function (err) {
                if (err) {
                    logger.error(err);
                    socket.emit(eventName, false);
                    return;
                }
                socket.emit(eventName, true);
            });
        });
    },
    'onCreateNewProject': function (socket) {
        var eventName = 'onCreateNewProject';
        socket.on(eventName, function (directoryPath) {
            var projectFileName = config.system_name;
            var workflowFileName = config.default_filename;
            var projectJson = ServerUtility.readTemplateProjectJson();
            var workflowJson = ServerUtility.readTemplateWorkflowJson();
            projectJson.path = "./" + projectFileName + config.extension.project;
            projectJson.path_workflow = "./" + workflowFileName + config.extension.workflow;
            workflowJson.name = workflowJson.name + "1";
            workflowJson.path = path.basename(directoryPath);
            var projectFilePath = path.join(directoryPath, projectJson.path);
            var workflowFilePath = path.join(directoryPath, projectJson.path_workflow);
            fs.mkdir(directoryPath, function (mkdirErr) {
                if (mkdirErr) {
                    logger.error(mkdirErr);
                    socket.emit(eventName);
                    return;
                }
                ServerUtility.writeJson(projectFilePath, projectJson, function (err) {
                    if (err) {
                        logger.error(err);
                        socket.emit(eventName);
                        return;
                    }
                    ServerUtility.writeJson(workflowFilePath, workflowJson, function (err) {
                        if (err) {
                            logger.error(err);
                            socket.emit(eventName);
                            return;
                        }
                        socket.emit(eventName, projectFilePath);
                    });
                });
            });
        });
    },
    'onSshConnection': function (socket) {
        var eventName = 'onSshConnection';
        var succeed = function () {
            socket.emit(eventName, true);
        };
        var failed = function () {
            socket.emit(eventName, false);
        };
        socket.on(eventName, function (name, password) {
            ServerUtility.getHostInfo(function (err, hostList) {
                if (err) {
                    logger.error(err);
                    failed();
                    return;
                }
                if (!hostList) {
                    logger.error('host list does not exist');
                    failed();
                    return;
                }
                var host = hostList.filter(function (host) { return host.name === name; })[0];
                if (!host) {
                    logger.error(name + " is not found at host list conf");
                    failed();
                }
                if (ServerUtility.isLocalHost(host.host)) {
                    succeed();
                    return;
                }
                sshConnection.sshConnectTest(host, password, function (err) {
                    if (err) {
                        logger.error(err);
                        failed();
                    }
                    else {
                        succeed();
                    }
                });
            });
        });
    },
    'onRunProject': function (socket) {
        var eventName = 'onRunProject';
        socket.on(eventName, function (projectFilepath, host_passSet) {
            var projectOperator = new ProjectOperator(projectFilepath);
            projectOperator.updateProjectJson(projectFilepath, function (err) {
                if (err) {
                    logger.error(err);
                    socket.emit(eventName, false);
                    return;
                }
                projectOperator.run(host_passSet);
                socket.emit(eventName, true);
            });
        });
    },
    'onGetFileStat': function (socket) {
        var eventName = 'onGetFileStat';
        socket.on(eventName, function (filepath) {
            fs.stat(filepath, function (err, stats) {
                if (err) {
                    socket.emit(eventName);
                }
                else {
                    socket.json.emit(eventName, stats);
                }
            });
        });
    },
    'readTreeJson': function (socket) {
        var eventName = 'readTreeJson';
        socket.on(eventName, function (workflowJsonFilePath) {
            var roodDirectory = path.dirname(workflowJsonFilePath);
            try {
                logger.debug("tree json=" + workflowJsonFilePath);
                var createJsonFile = ServerUtility.createTreeJson(workflowJsonFilePath);
                socket.json.emit(eventName, createJsonFile);
            }
            catch (error) {
                logger.error(error);
                socket.emit(eventName);
            }
        });
    },
    'writeTreeJson': function (socket) {
        var eventName = 'writeTreeJson';
        socket.on(eventName, function (projectDirectory, json) {
            var queue = [];
            writeTreeJson.setQueue(queue, projectDirectory, json);
            writeTreeJson.saveTreeJson(queue, function () {
                socket.emit(eventName);
            });
        });
    },
    'onGetJsonFile': function (socket) {
        var eventName = 'onGetJsonFile';
        socket.on(eventName, function (filetype) {
            var filepath = ServerUtility.getTypeOfJson(filetype).getTemplateFilePath();
            fs.readFile(filepath, function (err, data) {
                if (err) {
                    logger.error(err);
                    socket.emit(eventName);
                }
                else {
                    socket.json.emit(eventName, JSON.parse(data.toString()));
                }
            });
        });
    },
    'onDeleteDirectory': function (socket) {
        var eventName = 'onDeleteDirectory';
        socket.on(eventName, function (directorys) {
            (function loop() {
                var directory = directorys.shift();
                if (!directory) {
                    socket.emit(eventName);
                    return;
                }
                ServerUtility.unlinkDirectoryAsync(directory, function (err) {
                    if (!err) {
                        logger.info("delete  dir=" + directory);
                    }
                    loop();
                });
            })();
        });
    },
    'cleanProject': function (socket) {
        var eventName = 'cleanProject';
        socket.on(eventName, function (projectFilePath) {
            var operator = new ProjectOperator(projectFilePath);
            operator.cleanAsync(function () {
                projectUtility.cleanProject(projectFilePath, function (err) {
                    if (err) {
                        logger.error(err);
                        socket.emit(eventName, false);
                        return;
                    }
                    socket.emit(eventName, true);
                });
            });
        });
    },
    'openProjectJson': function (socket) {
        var eventName = 'openProjectJson';
        socket.on(eventName, function (projectFilepath) {
            var projectJson = projectUtility.openProjectJson(projectFilepath);
            socket.json.emit(eventName, projectJson);
            try {
            }
            catch (error) {
                logger.error(error);
                socket.emit(eventName);
            }
        });
    },
    'UploadFileEvent': function (socket) {
        var upload = {};
        var writeThreshold = 32 * 1024 * 1024;
        var readyEventName = 'onUploadReady';
        var startEventName = 'onUploadStart';
        var doneEventName = 'onUploadDone';
        var openFile = function (filepath, size) {
            fs.open(filepath, 'a', 755, function (err, fd) {
                if (err) {
                    logger.error(err);
                    socket.emit(doneEventName, false, filepath);
                    return;
                }
                upload[filepath] = {
                    uploaded: 0,
                    size: size,
                    data: '',
                    handler: fd
                };
                socket.emit(startEventName, upload[filepath].uploaded, filepath);
            });
        };
        var closeFile = function (filepath, isSucceed) {
            var file = upload[filepath];
            fs.close(file.handler, function (err) {
                if (err) {
                    logger.error(err);
                    socket.emit(doneEventName, isSucceed, filepath);
                    delete upload.filepath;
                }
                else {
                    fs.chmod(filepath, '664', function (err) {
                        if (err) {
                            logger.error(err);
                        }
                        socket.emit(doneEventName, isSucceed, filepath);
                        delete upload.filepath;
                    });
                }
            });
        };
        var appendFile = function (filepath, callback) {
            var file = upload[filepath];
            fs.write(file.handler, file.data, null, 'Binary', function (err, witten, str) {
                logger.info("progress:" + path.basename(filepath) + ":" + file.uploaded + "/" + file.size);
                if (err) {
                    logger.error(err);
                    closeFile(filepath, false);
                    return;
                }
                file.data = '';
                if (callback) {
                    callback();
                }
            });
        };
        socket.on(startEventName, function (filepath, data) {
            var file = upload[filepath];
            file.uploaded += data.length;
            file.data += data;
            if (file.uploaded !== file.size) {
                if (file.data.length >= writeThreshold) {
                    appendFile(filepath);
                }
                socket.emit(startEventName, file.uploaded, filepath);
            }
            else {
                appendFile(filepath, function () {
                    closeFile(filepath, true);
                    logger.info("upload file=" + filepath);
                });
            }
        });
        socket.on(readyEventName, function (filepath, size) {
            fs.unlink(filepath, function (err) {
                openFile(filepath, size);
            });
        });
    }
};
function add(socket, namespace, listeners) {
    socket.of(namespace).on('connect', function (socket) {
        logger.debug("socket on connect " + namespace);
        for (var _i = 0, listeners_1 = listeners; _i < listeners_1.length; _i++) {
            var eventName = listeners_1[_i];
            eventListeners[eventName](socket);
        }
        socket.on('disconnect', function () {
            logger.debug("socket on disconnect " + namespace);
        });
    });
}
exports.add = add;
//# sourceMappingURL=eventListeners.js.map