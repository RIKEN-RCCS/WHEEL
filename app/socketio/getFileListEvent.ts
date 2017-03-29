import fs = require('fs');
import path = require('path');
import os = require('os');
import logger = require('../logger');
import ServerUtility = require('../serverUtility');
import ServerConfig = require('../serverConfig');
import ServerSocketIO = require('./serverSocketIO');

/**
 * socket io communication class for gettingfile list
 */
class GetFileListEvent implements ServerSocketIO.SocketListener {

    /**
     * event name
     */
    private static eventName = 'onGetFileList';

    /**
     * file and directory watcher
     */
    private watcher: fs.FSWatcher;

    /**
     * Adds a listener for this event
     * @param socket socket io instance
     */
    public onEvent(socket: SocketIO.Socket) {
        this.onGetFileList(socket);
        this.onDisconnect(socket);
    }

    /**
     * get file list
     * @param socket socket io instance
     */
    private onGetFileList(socket: SocketIO.Socket) {
        socket.on(GetFileListEvent.eventName, (directoryPath: string, extension: string) => {

            if (directoryPath == null) {
                directoryPath = os.homedir();
            }

            directoryPath = path.resolve(directoryPath);
            const regex = extension == null ? null : new RegExp(`${extension.replace(/\./, '\\.')}$`);
            this.emitFileList(directoryPath, socket, regex);
        });
    }

    /**
     * Adds a listener for disconnect event
     * @param socket socket io object
     */
    private onDisconnect(socket: SocketIO.Socket) {
        socket.on('disconnect', () => {
            if (this.watcher != null) {
                this.watcher.close();
            }
        });
    }

    /**
     * emit to client for sending file list
     * @param pathDirectory read directory path
     * @param socket socket io object
     * @param fileRegex file extension pattern
     */
    private emitFileList(pathDirectory: string, socket: SocketIO.Socket, fileRegex: RegExp) {
        try {
            const getFileList: FileType[] = this.getFileList(pathDirectory, fileRegex);
            logger.debug(`send file list ${JSON.stringify(getFileList)}`);
            const fileList: FileTypeList = {
                directory: `${pathDirectory.replace(/[\\/]/g, '/')}/`,
                files: getFileList
            };
            socket.json.emit(GetFileListEvent.eventName, fileList);

            if (this.watcher != null) {
                this.watcher.close();
            }

            // watch directory and emit
            // this.watcher = fs.watch(directory, (event, filename) => {
            //     this.emitFileList(directory, socket, regex);
            // });
        }
        catch (err) {
            logger.error(err);
            socket.emit(GetFileListEvent.eventName);
        }
    }

    /**
     * get file list
     * @param pathDirectory read directory path
     * @param fileRegexfile extension pattern
     * @return file list
     */
    private getFileList(pathDirectory: string, fileRegex: RegExp): FileType[] {
        let getFileList: FileType[] = [
            {
                name: `../`,
                type: "dir"
            }
        ];
        fs.readdirSync(pathDirectory)
            .forEach(file => {
                const stat = fs.statSync(`${pathDirectory}/${file}`);
                if (stat.isFile() && (fileRegex != null && file.match(fileRegex))) {
                    getFileList.push({
                        name: file,
                        type: "file"
                    });
                }
                else if (stat.isDirectory()) {
                    getFileList.push({
                        name: `${file}/`,
                        type: "dir"
                    });
                }
            });
        return getFileList;
    }
}

export = GetFileListEvent;