/**
 * utility for client
 */
class ClientUtility {
    /**
     * whether specified hostname is localhost or not
     * @param target hostname or host json data
     * @return specified hostname is localhost or not
     */
    static isLocalHost(target) {
        let hostname;
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
    static isWindows() {
        return navigator.platform.indexOf('Win') != -1;
    }
    /**
     * whether platform is linux or not
     * @return running platform is linux or not
     */
    static isLinux() {
        return navigator.platform.indexOf('Linux') != -1;
    }
    /**
     * get cookies hash set
     * @return all cookies information
     */
    static getCookies() {
        if (!document.cookie) {
            return null;
        }
        const cookies = {};
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
    static deleteCookie(key) {
        document.cookie = `${key}=; max-age=0`;
    }
    /**
     * move to workflow.html page
     * @param filepath selected workflow filepath
     */
    static moveWorkflowLink(filepath) {
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
    static normalize(...filepath) {
        const split = filepath.join('/').replace(/[\\\/]+/g, '/').split('/');
        const path = [split.shift()];
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
    static basename(filepath) {
        return filepath.replace(/\\/g, '/').replace(/\/$/, '').replace(/.*\//, '');
    }
    /**
     * get dirname of file path
     * @param filepath file path string
     * @return dirname of file path
     */
    static dirname(filepath) {
        return filepath.replace(/\\/g, '/').replace(/\/$/, '').replace(/\/[^/]*$/, '');
    }
    /**
     * whether filepath can use for directory name or not
     * @param filepath file path string
     * @return specified filepath can use for directory name or not
     */
    static isValidDirectoryName(filepath) {
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
     * @param object json file type or SwfTree class instance
     * @return JsonFileTypeBase class instance
     */
    static getTemplate(object) {
        let type;
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
 * mouse key type extension
 */
var MouseKeyType;
(function (MouseKeyType) {
    /**
     * left key
     */
    MouseKeyType.LEFT = 0;
    /**
     * center key
     */
    MouseKeyType.CENTER = 1;
    /**
     * right key
     */
    MouseKeyType.RIGHT = 2;
})(MouseKeyType || (MouseKeyType = {}));
//# sourceMappingURL=clientUtility.js.map