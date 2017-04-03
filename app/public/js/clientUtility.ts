/**
 * utility for client
 */
class ClientUtility {

    /**
     * whether specified hostname is localhost or not
     * @param target hostname or host json data
     * @return specified hostname is localhost or not
     */
    public static isLocalHost(target: (string | SwfHostJson)): boolean {
        let hostname: string;
        if (typeof target === 'string') {
            hostname = target;
        }
        else {
            hostname = target.host;
        }
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
     * normalize path string
     * @param filepath file path string
     * @return normalized path string
     */
    public static normalize(...filepath: string[]): string {
        const split = filepath.join('/').replace(/[\\\/]+/g, '/').split('/');
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
     * get templete class by file type
     * @param fileType json file type
     * @return JsonFileTypeBase class instance
     */
    public static getTemplate(fileType: SwfType): JsonFileTypeBase;

    /**
     * get templete class by file type
     * @param tree SwfTree class instance
     * @return JsonFileTypeBase class instance
     */
    public static getTemplate(tree: SwfTree): JsonFileTypeBase;

    /**
     * get templete class by file type
     * @param object json file type or SwfTree class instance
     * @return JsonFileTypeBase class instance
     */
    public static getTemplate(object: (SwfType | SwfTree)): JsonFileTypeBase {
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

/**
 * mouse key type
 */
type MouseKeyType = 0 | 1 | 2;
/**
 * mouse key type extension
 */
namespace MouseKeyType {
    /**
     * left key
     */
    export const LEFT: MouseKeyType = 0;
    /**
     * center key
     */
    export const CENTER: MouseKeyType = 1;
    /**
     * right key
     */
    export const RIGHT: MouseKeyType = 2;
}