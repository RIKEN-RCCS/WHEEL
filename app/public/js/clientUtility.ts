/**
 * utility for client
 */
class ClientUtility {

    /**
     * whether specified hostname is localhost or not
     * @param hostname hostname
     * @return specified hostname is localhost or not
     */
    public static isLocalHost(hostname: string): boolean {
        return (hostname === 'localhost') || (hostname === '127.0.0.1');
    }

    /**
     * whether platform is windows or not
     * @return running platform is windows or not
     */
    public static isWindows(): boolean {
        return navigator.platform.indexOf('Win') != -1;
    }

    /**
     * whether platform is linux or not
     * @return running platform is linux or not
     */
    public static isLinux(): boolean {
        return navigator.platform.indexOf('Linux') != -1;
    }

    /**
     * get home directory
     * @return get home directory
     */
    public static getHomeDir(): string {
        if (this.isWindows()) {
            return process.env.USERPROFILE;
        }
        else if (this.isLinux()) {
            return process.env.HOME;
        }
        else {
            throw new Error('undefined platform');
        }
    }

    /**
     * get cookies hash set
     * @return all cookies information
     */
    public static getCookies(): { [key: string]: string } {
        if (!document.cookie) {
            return null;
        }
        const cookies: { [key: string]: string } = {};
        document.cookie.split('; ').forEach(cookie => {
            const keyValue = cookie.split('=');
            cookies[keyValue[0]] = decodeURIComponent(keyValue[1]);
        });
        return cookies;
    }

    /**
     * delete cookie that matched specified key
     * @param key key name
     */
    public static deleteCookie(key: string) {
        document.cookie = `${key}=; max-age=0`;
    }

    /**
     * move to workflow.html page
     * @param filepath selected workflow filepath
     */
    public static moveWorkflowLink(filepath: string): void {
        $('<form/>', { action: '/swf/project_manager.html', method: 'post' })
            .append($('<input/>', { type: 'hidden', name: 'project', value: filepath }))
            .appendTo(document.body)
            .submit();
    }

    /**
     * get file status color string
     * @param state task status string
     * @return status color string
     */
    public static getStateColor(state: string): string {
        return config.state_color[state.toLowerCase()];
    }

    /**
     * normalize path string
     * @param filepath file path string
     * @return normalized path string
     */
    public static normalize(filepath: string): string {
        const split = filepath.replace(/[\\\/]+/g, '/').split('/');
        const path: string[] = [split.shift()];
        split.forEach(name => {
            if (name === '.') {
                return;
            }
            else if (name === '..') {
                path.pop();
            }
            else {
                path.push(name);
            }
        });

        return path.join('/').replace(/^\.\//, '');
    }

    /**
     * get basename of file path
     * @param filepath file path string
     * @return basename of file path
     */
    public static basename(filepath: string): string {
        return filepath.replace(/\\/g, '/').replace(/\/$/, '').replace(/.*\//, '');
    }

    /**
     * get dirname of file path
     * @param filepath file path string
     * @return dirname of file path
     */
    public static dirname(filepath: string): string {
        return filepath.replace(/\\/g, '/').replace(/\/$/, '').replace(/\/[^/]*$/, '');
    }

    /**
     * get file type string
     * @param filepath file path string
     * @return 'file' or 'files' or 'directory' string
     */
    public static getIOFileType(filepath: string) {
        if (filepath.match(/\/$/)) {
            return 'directory';
        }
        else if (filepath.match(/\*/)) {
            return 'files';
        }
        else {
            return 'file';
        }
    }

    /**
     * whether filepath can use for directory name or not
     * @param filepath file path string
     * @return specified filepath can use for directory name or not
     */
    public static isValidDirectoryName(filepath: string): boolean {
        if (!filepath) {
            return false;
        }
        else if (filepath.match(/[\\\/:\*\?\"\<\>\|]/g)) {
            return false;
        }
        else {
            return true;
        }
    }

    /**
     * get property information
     * @param tree SwfTree class instance
     * @return get property information
     */
    public static getPropertyInfo(tree: SwfTree) {
        return this.getTemplate(tree).getPropertyInfo();
    }

    /**
     * whether specified type string is matched or not
     * @param type json file type string (ex 'Workflow', 'For')
     * @param fileType json file type
     * @return whether specified type string is matched or not
     */
    public static checkFileType(type: string, fileType: SwfType): boolean;

    /**
     * whether specified type string is matched or not
     * @param tree SwfTree class instance
     * @param fileType json file type
     * @return whether specified type string is matched or not
     */
    public static checkFileType(tree: SwfTree, fileType: SwfType): boolean;

    /**
     * whether specified type string is matched or not
     * @param target json file type string or SwfTree instance
     * @param fileType json file type
     * @return whether specified type string is matched or not
     */
    public static checkFileType(object: (string | SwfTree), fileType: SwfType): boolean {
        if (object == null) {
            return false;
        }
        return this.getTemplate(fileType).checkFileType(object);
    }

    /**
     * get default json file name
     * @param tree SwfTree class instance
     * @return get default json file name
     */
    public static getDefaultName(tree: SwfTree): string;

    /**
     * get default json file name
     * @param type json file type
     * @return get default json file name
     */
    public static getDefaultName(type: SwfType): string;

    /**
     * get default json file name
     * @param object SwfTree class instance or json file type
     * @return get default json file name
     */
    public static getDefaultName(object: (SwfType | SwfTree)): string {
        let template: JsonFileTypeBase;
        if (typeof object === 'string') {
            template = this.getTemplate(object);
        }
        else {
            template = this.getTemplate(object);
        }
        const extension = template.getExtension();
        return `${config.default_filename}${extension}`;
    }

    /**
     * get json file type string
     * @param fileType json file type
     * @return json file type string
     */
    public static getJsonFileType(fileType: SwfType): string {
        return this.getTemplate(fileType).getType();
    }

    /**
     * get templete class by file type
     * @param fileType json file type
     * @return JsonFileTypeBase class instance
     */
    private static getTemplate(fileType: SwfType): JsonFileTypeBase;

    /**
     * get templete class by file type
     * @param tree SwfTree class instance
     * @return JsonFileTypeBase class instance
     */
    private static getTemplate(tree: SwfTree): JsonFileTypeBase;

    /**
     * get templete class by file type
     * @param object json file type or SwfTree class instance
     * @return JsonFileTypeBase class instance
     */
    private static getTemplate(object: (SwfType | SwfTree)): JsonFileTypeBase {
        let type: SwfType;
        if (typeof object === 'string') {
            type = object;
        }
        else {
            type = object.type;
        }
        switch (type) {
            case SwfType.PROJECT:
                return new TypeProject();
            case SwfType.WORKFLOW:
                return new TypeWorkflow();
            case SwfType.TASK:
                return new TypeTask();
            case SwfType.JOB:
                return new TypeJob();
            case SwfType.FOR:
                return new TypeFor();
            case SwfType.IF:
                return new TypeIf();
            case SwfType.ELSE:
                return new TypeElse();
            case SwfType.BREAK:
                return new TypeBreak();
            case SwfType.REMOTETASK:
                return new TypeRemoteTask();
            case SwfType.CONDITION:
                return new TypeCondition();
            case SwfType.PSTUDY:
                return new TypePStudy();
            default:
                throw new TypeError('file type is undefined');
        }
    }
}