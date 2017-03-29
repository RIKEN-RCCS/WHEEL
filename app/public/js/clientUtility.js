/**
 * utility for client
 */
var ClientUtility = (function () {
    function ClientUtility() {
    }
    /**
     * whether specified hostname is localhost or not
     * @param hostname hostname
     * @return specified hostname is localhost or not
     */
    ClientUtility.isLocalHost = function (hostname) {
        return (hostname === 'localhost') || (hostname === '127.0.0.1');
    };
    /**
     * whether platform is windows or not
     * @return running platform is windows or not
     */
    ClientUtility.isWindows = function () {
        return navigator.platform.indexOf('Win') != -1;
    };
    /**
     * whether platform is linux or not
     * @return running platform is linux or not
     */
    ClientUtility.isLinux = function () {
        return navigator.platform.indexOf('Linux') != -1;
    };
    /**
     * get home directory
     * @return get home directory
     */
    ClientUtility.getHomeDir = function () {
        if (this.isWindows()) {
            return process.env.USERPROFILE;
        }
        else if (this.isLinux()) {
            return process.env.HOME;
        }
        else {
            throw new Error('undefined platform');
        }
    };
    /**
     * get cookies hash set
     * @return all cookies information
     */
    ClientUtility.getCookies = function () {
        if (!document.cookie) {
            return null;
        }
        var cookies = {};
        document.cookie.split('; ').forEach(function (cookie) {
            var keyValue = cookie.split('=');
            cookies[keyValue[0]] = decodeURIComponent(keyValue[1]);
        });
        return cookies;
    };
    /**
     * delete cookie that matched specified key
     * @param key key name
     */
    ClientUtility.deleteCookie = function (key) {
        document.cookie = key + "=; max-age=0";
    };
    /**
     * move to workflow.html page
     * @param filepath selected workflow filepath
     */
    ClientUtility.moveWorkflowLink = function (filepath) {
        $('<form/>', { action: '/swf/project_manager.html', method: 'post' })
            .append($('<input/>', { type: 'hidden', name: 'project', value: filepath }))
            .appendTo(document.body)
            .submit();
    };
    /**
     * get file status color string
     * @param state task status string
     * @return status color string
     */
    ClientUtility.getStateColor = function (state) {
        return config.state_color[state.toLowerCase()];
    };
    /**
     * normalize path string
     * @param filepath file path string
     * @return normalized path string
     */
    ClientUtility.normalize = function (filepath) {
        var split = filepath.replace(/[\\\/]+/g, '/').split('/');
        var path = [split.shift()];
        split.forEach(function (name) {
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
    };
    /**
     * get basename of file path
     * @param filepath file path string
     * @return basename of file path
     */
    ClientUtility.basename = function (filepath) {
        return filepath.replace(/\\/g, '/').replace(/\/$/, '').replace(/.*\//, '');
    };
    /**
     * get dirname of file path
     * @param filepath file path string
     * @return dirname of file path
     */
    ClientUtility.dirname = function (filepath) {
        return filepath.replace(/\\/g, '/').replace(/\/$/, '').replace(/\/[^/]*$/, '');
    };
    /**
     * get file type string
     * @param filepath file path string
     * @return 'file' or 'files' or 'directory' string
     */
    ClientUtility.getIOFileType = function (filepath) {
        if (filepath.match(/\/$/)) {
            return 'directory';
        }
        else if (filepath.match(/\*/)) {
            return 'files';
        }
        else {
            return 'file';
        }
    };
    /**
     * whether filepath can use for directory name or not
     * @param filepath file path string
     * @return specified filepath can use for directory name or not
     */
    ClientUtility.isValidDirectoryName = function (filepath) {
        if (!filepath) {
            return false;
        }
        else if (filepath.match(/[\\\/:\*\?\"\<\>\|]/g)) {
            return false;
        }
        else {
            return true;
        }
    };
    /**
     * get property information
     * @param tree SwfTree class instance
     * @return get property information
     */
    ClientUtility.getPropertyInfo = function (tree) {
        return this.getTemplate(tree).getPropertyInfo();
    };
    /**
     * whether specified type string is matched or not
     * @param target json file type string or SwfTree instance
     * @param fileType json file type
     * @return whether specified type string is matched or not
     */
    ClientUtility.checkFileType = function (object, fileType) {
        if (object == null) {
            return false;
        }
        return this.getTemplate(fileType).checkFileType(object);
    };
    /**
     * get default json file name
     * @param object SwfTree class instance or json file type
     * @return get default json file name
     */
    ClientUtility.getDefaultName = function (object) {
        var template;
        if (typeof object === 'string') {
            template = this.getTemplate(object);
        }
        else {
            template = this.getTemplate(object);
        }
        var extension = template.getExtension();
        return "" + config.default_filename + extension;
    };
    /**
     * get json file type string
     * @param fileType json file type
     * @return json file type string
     */
    ClientUtility.getJsonFileType = function (fileType) {
        return this.getTemplate(fileType).getType();
    };
    /**
     * get templete class by file type
     * @param object json file type or SwfTree class instance
     * @return JsonFileTypeBase class instance
     */
    ClientUtility.getTemplate = function (object) {
        var type;
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
    };
    return ClientUtility;
}());
//# sourceMappingURL=clientUtility.js.map