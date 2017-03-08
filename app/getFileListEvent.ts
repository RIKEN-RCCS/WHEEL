import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import serverUtility = require('./serverUtility');
import serverConfig = require('./serverConfig');

/**
 *
 */
class GetFileListEvent implements SocketListener {

    /**
     * event name
     */
    private static eventName = 'onGetFileList';

    /**
     * file and directory watcher
     */
    private watcher: fs.FSWatcher;

    /**
     * socket io event listener
     * @param socket socket io object
     */
    public onEvent(socket: SocketIO.Socket): void {
        this.onGetFileList(socket);
        this.onDisconnect(socket);
    }

    /**
     *
     * @param socket socket io object
     */
    private onGetFileList(socket: SocketIO.Socket): void {
        socket.on(GetFileListEvent.eventName, (directoryPath: string, extension: string) => {

            if (directoryPath == null) {
                directoryPath = serverUtility.getHomeDir();
            }

            directoryPath = path.resolve(directoryPath);
            const regex = extension == null ? null : new RegExp(`${extension.replace(/\./, '\\.')}$`);
            this.emitFileList(directoryPath, socket, regex);
        });
    }

    /**
     *
     * @param socket socket io object
     */
    private onDisconnect(socket: SocketIO.Socket): void {
        socket.on('disconnect', () => {
            if (this.watcher != null) {
                this.watcher.close();
            }
        });
    }

    /**
     *
     * @param pathDirectory read directory path
     * @param socket socket io object
     * @param fileRegex file extension pattern
     */
    private emitFileList(pathDirectory: string, socket: SocketIO.Socket, fileRegex: RegExp): void {
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
     *
     * @param pathDirectory read directory path
     * @param fileRegexfile extension pattern
     * @returns file type array
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