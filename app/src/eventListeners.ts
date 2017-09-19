import fs = require('fs');
import ServerUtility = require('./serverUtility');
import path = require('path');
import os = require('os');
import logger = require('./logger');
import fileUtility = require('./fileUtility');
import sshConnection = require('./sshConnection');
import ProjectOperator = require('./projectOperator');
import writeTreeJson = require('./writeTreeJson');
import projectUtility = require('./projectUtility');

var onAddHost= function(socket: SocketIO.Socket){
  const eventName = 'onAddHost';
  socket.on(eventName, (hostInfo: SwfHostJson) => {
      ServerUtility.addHostInfo(hostInfo, (err) => {
          if (err) {
              logger.error(err);
              socket.emit(eventName, false);
          } else {
              socket.emit(eventName, true);
          }
      });
  });
}

var onDeleteHost= function (socket: SocketIO.Socket): void {
    const eventName = 'onDeleteHost';
        socket.on(eventName, (name: string) => {
            ServerUtility.deleteHostInfo(name, (err) => {
                if (err) {
                    logger.error(err);
                    socket.emit(eventName, false);
                } else {
                    socket.emit(eventName, true);
                }
            });
        });
}

var onGetRemoteHostList= function (socket: SocketIO.Socket): void {
        const eventName = 'onGetRemoteHostList';
        socket.on(eventName, () => {
            ServerUtility.getHostInfo((err, hostList) => {
                if (err) {
                    logger.error(err);
                    socket.emit(eventName);
                } else if (!hostList) {
                    logger.error('host list does not exist');
                    socket.emit(eventName);
                } else {
                    logger.debug(hostList);
                    socket.json.emit(eventName, hostList);
                }
            });
        });
}

var onGetFileList=function (socket: SocketIO.Socket): void {
    const eventName = 'onGetFileList';
    socket.on(eventName, (directoryPath: string, extension: string) => {
        directoryPath=directoryPath|| os.homedir()
        if (!path.isAbsolute(directoryPath) || !fileUtility.isDir(directoryPath)) {
            socket.emit(eventName);
            return;
        }
        const regex = extension == null ? null : new RegExp(`${extension.replace(/\./, '\\.')}$`);
        try {
            const getFiles: FileType[] = fileUtility.getFiles(directoryPath, regex);
            logger.debug(`send file list ${JSON.stringify(getFiles)}`);
            const fileList: FileTypeList = {
                directory: `${directoryPath.replace(/[\\/]/g, '/')}/`,
                files: getFiles
            };
            socket.json.emit(eventName, fileList);
        } catch (err) {
            logger.error(err);
            socket.emit(eventName);
        }
    });
}

var readFile= function (socket: SocketIO.Socket): void {
      const eventName = 'readFile';
      socket.on(eventName, (readFilePath: string) => {
          fs.readFile(readFilePath, (err, data) => {
              if (err) {
                  logger.error(err);
                  socket.emit(eventName);
                  return;
              }
              socket.emit(eventName, data.toString());
          });
      });
}

var writeFile= function (socket: SocketIO.Socket): void {
      const eventName = 'writeFile';
      socket.on(eventName, (filepath: string, data) => {
          fs.writeFile(filepath, data, (err) => {
              if (err) {
                  logger.error(err);
                  socket.emit(eventName, false);
                  return;
              }
              socket.emit(eventName, true);
          });
      });
    }
var onCreateNewProject= function (socket: SocketIO.Socket): void {
        const eventName = 'onCreateNewProject';
        socket.on(eventName, (directoryPath: string) => {
            const config = require('../dst/config/server');
            const projectFileName: string = config.system_name;
            const workflowFileName: string = config.default_filename;

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
}

var onSshConnection=function (socket: SocketIO.Socket): void {
      const eventName = 'onSshConnection';
      const succeed = () => {
          socket.emit(eventName, true);
      };
      const failed = () => {
          socket.emit(eventName, false);
      };
        socket.on(eventName, (name: string, password: string) => {
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

                sshConnection.sshConnectTest(host, password, (err: Error) => {
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
}

var onRunProject= function (socket: SocketIO.Socket): void {
    const eventName = 'onRunProject';
        socket.on(eventName, (projectFilepath: string, host_passSet: { [name: string]: string }) => {
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
}

var onGetFileStat= function (socket: SocketIO.Socket): void {
    const eventName = 'onGetFileStat';
        socket.on(eventName, (filepath: string) => {
            fs.stat(filepath, (err, stats: fs.Stats) => {
                if (err) {
                    socket.emit(eventName);
                } else {
                    socket.json.emit(eventName, stats);
                }
            });
        });
}

var readTreeJson= function (socket: SocketIO.Socket): void {
    const eventName = 'readTreeJson';
        socket.on(eventName, (workflowJsonFilePath: string) => {
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
    }

var onWriteTreeJson= function (socket: SocketIO.Socket): void {
    const eventName = 'writeTreeJson';
        socket.on(eventName, (projectDirectory: string, json: SwfTreeJson) => {
            const queue = [];
            writeTreeJson.setQueue(queue, projectDirectory, json);
            writeTreeJson.saveTreeJson(queue, () => {
                socket.emit(eventName);
            })
        });
    }

var onGetJsonFile= function (socket: SocketIO.Socket): void {
    const eventName = 'onGetJsonFile';
        socket.on(eventName, (filetype: SwfType) => {
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
    }

var onDeleteDirectory= function (socket: SocketIO.Socket): void {
    const  eventName = 'onDeleteDirectory';
        socket.on(eventName, (directorys: string[]) => {
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
    }

var cleanProject= function (socket: SocketIO.Socket) {
    const eventName = 'cleanProject';
        socket.on(eventName, (projectFilePath: string) => {
            const operator = new ProjectOperator(projectFilePath);
            operator.cleanAsync(() => {
                projectUtility.cleanProject(projectFilePath, (err) => {
                    if (err) {
                        logger.error(err);
                        socket.emit(eventName, false);
                        return
                    }
                    socket.emit(eventName, true);
                });
            });
        });
    }


var openProjectJson= function (socket: SocketIO.Socket): void {
    const eventName = 'openProjectJson';
        socket.on(eventName, (projectFilepath: string) => {
        console.log('projectFilePath',projectFilepath);
          var projectJson = projectUtility.openProjectJson(projectFilepath);
          socket.json.emit(eventName, projectJson);
        try {
          } catch (error) {
            logger.error(error);
            socket.emit(eventName);
          }
        });
    }

var UploadFileEvent= function (socket: SocketIO.Socket): void {
interface UploadedFileData {
    uploaded: number;
    data: any;
    readonly size: number;
    readonly handler: number;
}
    var upload: { [filepath: string]: UploadedFileData } = {};
    const writeThreshold = 32 * 1024 * 1024;
    const readyEventName = 'onUploadReady';
    const startEventName = 'onUploadStart';
    const doneEventName = 'onUploadDone';

        const openFile = (filepath: string, size: number) => {
            fs.open(filepath, 'a', 755, (err: NodeJS.ErrnoException, fd: number) => {
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

        const closeFile = (filepath: string, isSucceed: boolean) => {
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

        const appendFile = (filepath: string, callback?: (() => void)) => {
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

        socket.on(startEventName, (filepath: string, data: any) => {
                const file = upload[filepath];
                file.uploaded += data.length;
                file.data += data;

                if (file.uploaded !== file.size) {
                    if (file.data.length >= writeThreshold) {
                        appendFile(filepath);
                    }
                    socket.emit(startEventName, file.uploaded, filepath);
                } else {
                    appendFile(filepath, () => {
                        closeFile(filepath, true);
                        logger.info(`upload file=${filepath}`);
                    });
                }
            });
          socket.on(readyEventName, (filepath: string, size: number) => {
                fs.unlink(filepath, (err) => {
                    openFile(filepath, size);
                });
            });
    }

var eventListeners={
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
}

export function add(sio: SocketIO.Namespace, listeners) {
  sio.on('connect', (socket: SocketIO.Socket) => {
    logger.debug(`socket on connect ${sio.name}`);
    for(var eventName of listeners){
      eventListeners[eventName](socket);
    }
    socket.on('disconnect', () => {
      logger.debug(`socket on disconnect ${sio.name}`);
    });
  })
}

