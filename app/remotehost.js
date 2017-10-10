const fs = require("fs");
const ServerUtility = require("./serverUtility");
const path = require("path");
const os = require("os");
const logger = require("./logger");
const fileUtility = require("./fileUtility");
const sshConnection = require("./sshConnection");

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
                logger.debug(hostList);
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

function setup(sio){
  sio.of('/remotehost').on('connect', (socket) => {
    logger.debug(`socket on connect ${sio.name}`);
    onAddHost(socket);
    onDeleteHost(socket);
    onGetRemoteHostList(socket);
    onGetFileList(socket);
    onSshConnection(socket);
    socket.on('disconnect', () => {
      logger.debug(`socket on disconnect ${sio.name}`);
    });
  });
}

module.exports = setup;
