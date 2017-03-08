/**
 * socket io
 */
var io;
/**
 * utility for client
 */
var ClientUtility = (function () {
    function ClientUtility() {
    }
    /**
     * whether specified hostname is localhost or not
     * @param hostname hostname
     * @returns true(localhost) or false
     */
    ClientUtility.isLocalHost = function (hostname) {
        return (hostname === 'localhost') || (hostname === '127.0.0.1');
    };
    /**
     * whether platform is windows or not
     * @returns true(windows) or false
     */
    ClientUtility.isWindows = function () {
        return navigator.platform.indexOf('Win') != -1;
    };
    /**
     * whether platform is linux or not
     * @returns true(linux) or false
     */
    ClientUtility.isLinux = function () {
        return navigator.platform.indexOf('Linux') != -1;
    };
    /**
     * get home directory
     * @returns directory path
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
     * get cookie informations
     * @returns cookie infomation hash
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
     * move to workflow.html page
     * @param filepath selected workflow filepath
     * @returns none
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
     * @returns color string
     */
    ClientUtility.getStateColor = function (state) {
        return config.state_color[state.toLowerCase()];
    };
    /**
     *
     * @param filepath
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
        return path.join('/').replace(/^\.?\//, '');
    };
    /**
     *
     * @param filepath
     */
    ClientUtility.basename = function (filepath) {
        return filepath.replace(/\\/g, '/').replace(/\/$/, '').replace(/.*\//, '');
    };
    /**
     *
     * @param filepath
     */
    ClientUtility.dirname = function (filepath) {
        return filepath.replace(/\\/g, '/').replace(/\/$/, '').replace(/\/[^/]*$/, '');
    };
    /**
     *
     * @param path
     */
    ClientUtility.getIOFileType = function (path) {
        if (path.match(/\/$/)) {
            return 'directory';
        }
        else if (path.match(/\*/)) {
            return 'files';
        }
        else {
            return 'file';
        }
    };
    /**
     *
     * @param dirname
     */
    ClientUtility.isValidDirectoryName = function (dirname) {
        if (!dirname) {
            return false;
        }
        else if (dirname.match(/[\\\/:\*\?\"\<\>\|]/g)) {
            return false;
        }
        else {
            return true;
        }
    };
    /**
     *
     * @param tree
     */
    ClientUtility.getPropertyInfo = function (tree) {
        return this.getTemplate(tree).getPropertyInfo();
    };
    /**
     *
     * @param target
     * @param fileType
     */
    ClientUtility.checkFileType = function (target, fileType) {
        if (target == null) {
            return false;
        }
        return this.getTemplate(fileType).checkFileType(target);
    };
    /**
     *
     * @param type
     */
    ClientUtility.getDefaultName = function (type) {
        var template = this.getTemplate(type);
        var extension = template.getExtension();
        return "" + config.default_filename + extension;
    };
    /**
     *
     * @param type
     */
    ClientUtility.isImplimentsWorkflow = function (type) {
        var workflowType = this.getJsonFileType(JsonFileType.WorkFlow);
        var loopType = this.getJsonFileType(JsonFileType.Loop);
        var ifType = this.getJsonFileType(JsonFileType.If);
        var elseType = this.getJsonFileType(JsonFileType.Else);
        if (type.match(new RegExp("^(?:" + [workflowType, loopType, ifType, elseType].join('|') + ")$"))) {
            return true;
        }
        else {
            return false;
        }
    };
    /**
     *
     * @param ileType
     */
    ClientUtility.getJsonFileType = function (fileType) {
        return this.getTemplate(fileType).getType();
    };
    /**
     *
     * @param fileType
     */
    ClientUtility.getTemplate = function (object) {
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
            else {
                throw new TypeError('file type is undefined');
            }
        }
    };
    return ClientUtility;
}());
//# sourceMappingURL=clientUtility.js.map