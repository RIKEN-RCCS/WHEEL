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
}

export = SwfFileType;