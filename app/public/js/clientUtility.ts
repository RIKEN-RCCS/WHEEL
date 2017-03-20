/**
 * socket io
 */
var io;

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
     * @param type json file type string (ex 'Workflow', 'Loop')
     * @param fileType json file type
     * @return whether specified type string is matched or not
     */
    public static checkFileType(type: string, fileType: JsonFileType): boolean;

    /**
     * whether specified type string is matched or not
     * @param tree SwfTree class instance
     * @param fileType json file type
     * @return whether specified type string is matched or not
     */
    public static checkFileType(tree: SwfTree, fileType: JsonFileType): boolean;

    /**
     * whether specified type string is matched or not
     * @param target json file type string or SwfTree instance
     * @param fileType json file type
     * @return whether specified type string is matched or not
     */
    public static checkFileType(object: (string | SwfTree), fileType: JsonFileType): boolean {
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
    public static getDefaultName(type: JsonFileType): string;

    /**
     * get default json file name
     * @param object SwfTree class instance or json file type
     * @return get default json file name
     */
    public static getDefaultName(object: (JsonFileType | SwfTree)): string {
        let template: JsonFileTypeBase;
        if (typeof object === 'number') {
            template = this.getTemplate(object);
        }
        else {
            template = this.getTemplate(object);
        }
        const extension = template.getExtension();
        return `${config.default_filename}${extension}`;
    }

    /**
     * whether specified class has script or not
     * @param target SwfTree instance or SwfLog instance
     * @return whether specified class has script or not
     */
    public static isImplimentsWorkflow(target: (SwfTree | SwfLog)): boolean {
        const workflowType = this.getJsonFileType(JsonFileType.WorkFlow);
        const loopType = this.getJsonFileType(JsonFileType.Loop);
        const ifType = this.getJsonFileType(JsonFileType.If);
        const elseType = this.getJsonFileType(JsonFileType.Else);
        const pstudyType = this.getJsonFileType(JsonFileType.PStudy);
        if (target.type.match(new RegExp(`^(?:${[workflowType, loopType, ifType, elseType, pstudyType].join('|')})$`))) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * get json file type string
     * @param fileType json file type
     * @return json file type string
     */
    public static getJsonFileType(fileType: JsonFileType): string {
        return this.getTemplate(fileType).getType();
    }

    /**
     * get templete class by file type
     * @param fileType json file type
     * @return JsonFileTypeBase class instance
     */
    private static getTemplate(fileType: JsonFileType): JsonFileTypeBase;

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
    private static getTemplate(object: (JsonFileType | SwfTree)): JsonFileTypeBase {
        if (typeof object === 'number') {
            switch (object) {
                case JsonFileType.Project:
                    return new TypeProject();
                case JsonFileType.WorkFlow:
                    return new TypeWorkflow();
                case JsonFileType.Task:
                    return new TypeTask();
                case JsonFileType.Job:
                    return new TypeJob();
                case JsonFileType.Loop:
                    return new TypeLoop();
                case JsonFileType.If:
                    return new TypeIf();
                case JsonFileType.Else:
                    return new TypeElse();
                case JsonFileType.Break:
                    return new TypeBreak();
                case JsonFileType.RemoteTask:
                    return new TypeRemoteTask();
                case JsonFileType.Condition:
                    return new TypeCondition();
                case JsonFileType.PStudy:
                    return new TypePStudy();
                default:
                    throw new TypeError('file type is undefined');
            }
        }
        else {
            if (this.checkFileType(object, JsonFileType.Task)) {
                return new TypeTask();
            }
            else if (this.checkFileType(object, JsonFileType.WorkFlow)) {
                return new TypeWorkflow();
            }
            else if (this.checkFileType(object, JsonFileType.Loop)) {
                return new TypeLoop();
            }
            else if (this.checkFileType(object, JsonFileType.If)) {
                return new TypeIf();
            }
            else if (this.checkFileType(object, JsonFileType.Else)) {
                return new TypeElse();
            }
            else if (this.checkFileType(object, JsonFileType.Break)) {
                return new TypeBreak();
            }
            else if (this.checkFileType(object, JsonFileType.RemoteTask)) {
                return new TypeRemoteTask();
            }
            else if (this.checkFileType(object, JsonFileType.Job)) {
                return new TypeJob();
            }
            else if (this.checkFileType(object, JsonFileType.Condition)) {
                return new TypeCondition();
            }
            else if (this.checkFileType(object, JsonFileType.PStudy)) {
                return new TypePStudy();
            }
            else {
                throw new TypeError('file type is undefined');
            }
        }
    }
}
