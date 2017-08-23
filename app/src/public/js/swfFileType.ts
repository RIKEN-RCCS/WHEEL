/**
 * file type
 */
type SwfFileType = 'file' | 'files' | 'directory';

/**
 * file type extension
 */
namespace SwfFileType {
    /**
     * type of file
     */
    export const FILE: SwfFileType = 'file';
    /**
     * type of files
     */
    export const FILES: SwfFileType = 'files';
    /**
     * type of directory
     */
    export const DIRECTORY: SwfFileType = 'directory';
    /**
     * get all types
     * @return all types
     */
    export function types(): string[] {
        return [this.FILE, this.FILES, this.DIRECTORY];
    }
    /**
     * get plug color
     * @param file file instance
     * @return plug color
     */
    export function getPlugColor(file: SwfFile): string {
        return config.plug_color[file.type];
    }

    /**
     * get file type
     * @param target file path string or SwfFile instance
     * @return file type
     */
    export function getFileType(target: (SwfFile | string)): SwfFileType {
        let path: string;
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
}