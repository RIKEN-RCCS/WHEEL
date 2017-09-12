"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const ServerUtility = require("./serverUtility");
const path = require("path");
const os = require("os");
const logger = require("./logger");
const fileUtility = require("./fileUtility");
const sshConnection = require("./sshConnection");
const ProjectOperator = require("./projectOperator");
const writeTreeJson = require("./writeTreeJson");
const projectUtility = require("./projectUtility");
var onAddHost = function (socket) {
    const eventName = 'onAddHost';
    socket.on(eventName, (hostInfo) => {
        ServerUtility.addHostInfo(hostInfo, (err) => {
            if (err) {
                logger.error(err);
                socket.emit(eventName, false);
            }
            else {
                socket.emit(eventName, true);
            }
        });
    });
};
var onDeleteHost = function (socket) {
    const eventName = 'onDeleteHost';
    socket.on(eventName, (name) => {
        ServerUtility.deleteHostInfo(name, (err) => {
            if (err) {
                logger.error(err);
                socket.emit(eventName, false);
            }
            else {
                socket.emit(eventName, true);
            }
        });
    });
};
var onGetRemoteHostList = function (socket) {
    const eventName = 'onGetRemoteHostList';
    socket.on(eventName, () => {
        ServerUtility.getHostInfo((err, hostList) => {
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
};
var onGetFileList = function (socket) {
    const eventName = 'onGetFileList';
    socket.on(eventName, (directoryPath, extension) => {
        directoryPath = directoryPath || os.homedir();
        if (!path.isAbsolute(directoryPath) || !fileUtility.isDir(directoryPath)) {
            socket.emit(eventName);
            return;
        }
        const regex = extension == null ? null : new RegExp(`${extension.replace(/\./, '\\.')}$`);
        try {
            const getFiles = fileUtility.getFiles(directoryPath, regex);
            logger.debug(`send file list ${JSON.stringify(getFiles)}`);
            const fileList = {
                directory: `${directoryPath.replace(/[\\/]/g, '/')}/`,
                files: getFiles
            };
            socket.json.emit(eventName, fileList);
        }
        catch (err) {
            logger.error(err);
            socket.emit(eventName);
        }
    });
};
var readFile = function (socket) {
    const eventName = 'readFile';
    socket.on(eventName, (readFilePath) => {
        fs.readFile(readFilePath, (err, data) => {
            if (err) {
                logger.error(err);
                socket.emit(eventName);
                return;
            }
            socket.emit(eventName, data.toString());
        });
    });
};
var writeFile = function (socket) {
    const eventName = 'writeFile';
    socket.on(eventName, (filepath, data) => {
        fs.writeFile(filepath, data, (err) => {
            if (err) {
                logger.error(err);
                socket.emit(eventName, false);
                return;
            }
            socket.emit(eventName, true);
        });
    });
};
var onCreateNewProject = function (socket) {
    const eventName = 'onCreateNewProject';
    socket.on(eventName, (directoryPath) => {
        const config = require('../dst/config/server');
        const projectFileName = config.system_name;
        const workflowFileName = config.default_filename;
        const projectJson = ServerUtility.readTemplateProjectJson();
        const workflowJson = ServerUtility.readTemplateWorkflowJson();
        projectJson.path = `./${projectFileName}${config.extension.project}`;
        projectJson.path_workflow = `./${workflowFileName}${config.extension.workflow}`;
        workflowJson.name = `${workflowJson.name}1`;
        workflowJson.path = path.basename(directoryPath);
        const projectFilePath = path.join(directoryPath, projectJson.path);
        const workflowFilePath = path.join(directoryPath, projectJson.path_workflow);
        fs.mkdir(directoryPath, (mkdirErr) => {
            if (mkdirErr) {
                logger.error(mkdirErr);
                socket.emit(eventName);
                return;
            }
            ServerUtility.writeJson(projectFilePath, projectJson, (err) => {
                if (err) {
                    logger.error(err);
                    socket.emit(eventName);
                    return;
                }
                ServerUtility.writeJson(workflowFilePath, workflowJson, (err) => {
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
};
var onSshConnection = function (socket) {
    const eventName = 'onSshConnection';
    const succeed = () => {
        socket.emit(eventName, true);
    };
    const failed = () => {
        socket.emit(eventName, false);
    };
    socket.on(eventName, (name, password) => {
        ServerUtility.getHostInfo((err, hostList) => {
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
            const host = hostList.filter(host => host.name === name)[0];
            if (!host) {
                logger.error(`${name} is not found at host list conf`);
                failed();
            }
            if (ServerUtility.isLocalHost(host.host)) {
                succeed();
                return;
            }
            sshConnection.sshConnectTest(host, password, (err) => {
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
};
var onRunProject = function (socket) {
    const eventName = 'onRunProject';
    socket.on(eventName, (projectFilepath, host_passSet) => {
        const projectOperator = new ProjectOperator(projectFilepath);
        projectOperator.updateProjectJson(projectFilepath, (err) => {
            if (err) {
                logger.error(err);
                socket.emit(eventName, false);
                return;
            }
            projectOperator.run(host_passSet);
            socket.emit(eventName, true);
        });
    });
};
var onGetFileStat = function (socket) {
    const eventName = 'onGetFileStat';
    socket.on(eventName, (filepath) => {
        fs.stat(filepath, (err, stats) => {
            if (err) {
                socket.emit(eventName);
            }
            else {
                socket.json.emit(eventName, stats);
            }
        });
    });
};
var readTreeJson = function (socket) {
    const eventName = 'readTreeJson';
    socket.on(eventName, (workflowJsonFilePath) => {
        const roodDirectory = path.dirname(workflowJsonFilePath);
        try {
            logger.debug(`tree json=${workflowJsonFilePath}`);
            const createJsonFile = ServerUtility.createTreeJson(workflowJsonFilePath);
            socket.json.emit(eventName, createJsonFile);
        }
        catch (error) {
            logger.error(error);
            socket.emit(eventName);
        }
    });
};
var onWriteTreeJson = function (socket) {
    const eventName = 'writeTreeJson';
    socket.on(eventName, (projectDirectory, json) => {
        const queue = [];
        writeTreeJson.setQueue(queue, projectDirectory, json);
        writeTreeJson.saveTreeJson(queue, () => {
            socket.emit(eventName);
        });
    });
};
var onGetJsonFile = function (socket) {
    const eventName = 'onGetJsonFile';
    socket.on(eventName, (filetype) => {
        const filepath = ServerUtility.getTypeOfJson(filetype).getTemplateFilePath();
        fs.readFile(filepath, (err, data) => {
            if (err) {
                logger.error(err);
                socket.emit(eventName);
            }
            else {
                socket.json.emit(eventName, JSON.parse(data.toString()));
            }
        });
    });
};
var onDeleteDirectory = function (socket) {
    const eventName = 'onDeleteDirectory';
    socket.on(eventName, (directorys) => {
        (function loop() {
            const directory = directorys.shift();
            if (!directory) {
                socket.emit(eventName);
                return;
            }
            ServerUtility.unlinkDirectoryAsync(directory, (err) => {
                if (!err) {
                    logger.info(`delete  dir=${directory}`);
                }
                loop();
            });
        })();
    });
};
var cleanProject = function (socket) {
    const eventName = 'cleanProject';
    socket.on(eventName, (projectFilePath) => {
        const operator = new ProjectOperator(projectFilePath);
        operator.cleanAsync(() => {
            projectUtility.cleanProject(projectFilePath, (err) => {
                if (err) {
                    logger.error(err);
                    socket.emit(eventName, false);
                    return;
                }
                socket.emit(eventName, true);
            });
        });
    });
};
var openProjectJson = function (socket) {
    const eventName = 'openProjectJson';
    socket.on(eventName, (projectFilepath) => {
        var projectJson = projectUtility.openProjectJson(projectFilepath);
        socket.json.emit(eventName, projectJson);
        try {
        }
        catch (error) {
            logger.error(error);
            socket.emit(eventName);
        }
    });
};
var UploadFileEvent = function (socket) {
    var upload = {};
    const writeThreshold = 32 * 1024 * 1024;
    const readyEventName = 'onUploadReady';
    const startEventName = 'onUploadStart';
    const doneEventName = 'onUploadDone';
    const openFile = (filepath, size) => {
        fs.open(filepath, 'a', 755, (err, fd) => {
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
    const closeFile = (filepath, isSucceed) => {
        const file = upload[filepath];
        fs.close(file.handler, (err) => {
            if (err) {
                logger.error(err);
                socket.emit(doneEventName, isSucceed, filepath);
                delete upload.filepath;
            }
            else {
                fs.chmod(filepath, '664', (err) => {
                    if (err) {
                        logger.error(err);
                    }
                    socket.emit(doneEventName, isSucceed, filepath);
                    delete upload.filepath;
                });
            }
        });
    };
    const appendFile = (filepath, callback) => {
        const file = upload[filepath];
        fs.write(file.handler, file.data, null, 'Binary', (err, witten, str) => {
            logger.info(`progress:${path.basename(filepath)}:${file.uploaded}/${file.size}`);
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
    socket.on(startEventName, (filepath, data) => {
        const file = upload[filepath];
        file.uploaded += data.length;
        file.data += data;
        if (file.uploaded !== file.size) {
            if (file.data.length >= writeThreshold) {
                appendFile(filepath);
            }
            socket.emit(startEventName, file.uploaded, filepath);
        }
        else {
            appendFile(filepath, () => {
                closeFile(filepath, true);
                logger.info(`upload file=${filepath}`);
            });
        }
    });
    socket.on(readyEventName, (filepath, size) => {
        fs.unlink(filepath, (err) => {
            openFile(filepath, size);
        });
    });
};
var eventListeners = {
    'onAddHost': onAddHost,
    'onDeleteHost': onDeleteHost,
    'onGetRemoteHostList': onGetRemoteHostList,
    'onGetFileList': onGetFileList,
    'readFile': readFile,
    'writeFile': writeFile,
    'onCreateNewProject': onCreateNewProject,
    'onSshConnection': onSshConnection,
    'onRunProject': onRunProject,
    'onGetFileStat': onGetFileStat,
    'readTreeJson': readTreeJson,
    'writeTreeJson': onWriteTreeJson,
    'onGetJsonFile': onGetJsonFile,
    'onDeleteDirectory': onDeleteDirectory,
    'cleanProject': cleanProject,
    'openProjectJson': openProjectJson,
    'UploadFileEvent': UploadFileEvent
};
function add(sio, listeners) {
    sio.on('connect', (socket) => {
        logger.debug(`socket on connect ${sio.name}`);
        for (var eventName of listeners) {
            eventListeners[eventName](socket);
        }
        socket.on('disconnect', () => {
            logger.debug(`socket on disconnect ${sio.name}`);
        });
    });
}
exports.add = add;
//# sourceMappingURL=eventListeners.js.map