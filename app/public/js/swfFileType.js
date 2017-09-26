/**
 * file type extension
 */
var SwfFileType;
(function (SwfFileType) {
    /**
     * type of file
     */
    SwfFileType.FILE = 'file';
    /**
     * type of files
     */
    SwfFileType.FILES = 'files';
    /**
     * type of directory
     */
    SwfFileType.DIRECTORY = 'directory';
    /**
     * get all types
     * @return all types
     */
    function types() {
        return [this.FILE, this.FILES, this.DIRECTORY];
    }
    SwfFileType.types = types;
    /**
     * get plug color
     * @param file file instance
     * @return plug color
     */
    function getPlugColor(file) {
        return config.plug_color[file.type];
    }
    SwfFileType.getPlugColor = getPlugColor;
    /**
     * get file type
     * @param target file path string or SwfFile instance
     * @return file type
     */
    function getFileType(target) {
        let path;
        if (typeof target === 'string') {
            path = target;
        }
        else {
            path = target.path;
        }
        if (path.match(/\/$/)) {
            return this.DIRECTORY;
        }
        else if (path.match(/\*/)) {
            return this.FILES;
        }
        else {
            return this.FILE;
        }
    }
    SwfFileType.getFileType = getFileType;
})(SwfFileType || (SwfFileType = {}));
//# sourceMappingURL=swfFileType.js.map