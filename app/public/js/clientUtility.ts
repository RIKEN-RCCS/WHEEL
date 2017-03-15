/**
 *
 */
interface SocketListener {
    onEvent: ((socket: SocketIO.Socket) => void);
}

/**
 *
 */
interface EventNamespacePair {
    io: SocketIO.Namespace;
    listeners: SocketListener[];
}

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
     * @returns true(localhost) or false
     */
    public static isLocalHost(hostname: string): boolean {
        return (hostname === 'localhost') || (hostname === '127.0.0.1');
    }

    /**
     * whether platform is windows or not
     * @returns true(windows) or false
     */
    public static isWindows(): boolean {
        return navigator.platform.indexOf('Win') != -1;
    }

    /**
     * whether platform is linux or not
     * @returns true(linux) or false
     */
    public static isLinux(): boolean {
        return navigator.platform.indexOf('Linux') != -1;
    }

    /**
     * get home directory
     * @returns directory path
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
     * get cookie informations
     * @returns cookie infomation hash
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
     * move to workflow.html page
     * @param filepath selected workflow filepath
     * @returns none
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
     * @returns color string
     */
    public static getStateColor(state: string): string {
        return config.state_color[state.toLowerCase()];
    }

    /**
     *
     * @param filepath
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
     *
     * @param filepath
     */
    public static basename(filepath: string): string {
        return filepath.replace(/\\/g, '/').replace(/\/$/, '').replace(/.*\//, '');
    }

    /**
     *
     * @param filepath
     */
    public static dirname(filepath: string): string {
        return filepath.replace(/\\/g, '/').replace(/\/$/, '').replace(/\/[^/]*$/, '');
    }

    /**
     *
     * @param path
     */
    public static getIOFileType(path: string) {
        if (path.match(/\/$/)) {
            return 'directory';
        }
        else if (path.match(/\*/)) {
            return 'files';
        }
        else {
            return 'file';
        }
    }

    /**
     *
     * @param dirname
     */
    public static isValidDirectoryName(dirname: string): boolean {
        if (!dirname) {
            return false;
        }
        else if (dirname.match(/[\\\/:\*\?\"\<\>\|]/g)) {
            return false;
        }
        else {
            return true;
        }
    }

    /**
     *
     * @param tree
     */
    public static getPropertyInfo(tree: SwfTree) {
        return this.getTemplate(tree).getPropertyInfo();
    }

    /**
     *
     * @param target
     * @param fileType
     */
    public static checkFileType(target: (string | SwfTree | SwfTreeJson), fileType: JsonFileType) {
        if (target == null) {
            return false;
        }
        return this.getTemplate(fileType).checkFileType(target);
    }

    /**
     *
     * @param type
     */
    public static getDefaultName(type: (JsonFileType | SwfTree)): string {
        const template = this.getTemplate(type);
        const extension = template.getExtension();
        return `${config.default_filename}${extension}`;
    }

    /**
     *
     * @param type
     */
    public static isImplimentsWorkflow(type: string) {
        const workflowType = this.getJsonFileType(JsonFileType.WorkFlow);
        const loopType = this.getJsonFileType(JsonFileType.Loop);
        const ifType = this.getJsonFileType(JsonFileType.If);
        const elseType = this.getJsonFileType(JsonFileType.Else);
        const pstudyType = this.getJsonFileType(JsonFileType.PStudy);
        if (type.match(new RegExp(`^(?:${[workflowType, loopType, ifType, elseType, pstudyType].join('|')})$`))) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
     *
     * @param ileType
     */
    public static getJsonFileType(fileType: JsonFileType): string {
        return this.getTemplate(fileType).getType();
    }

    /**
     *
     * @param fileType
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
