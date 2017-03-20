"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var fs = require("fs");
var path = require("path");
var logger = require("./logger");
var ServerConfig = require("./serverConfig");
/**
 * json file type
 */
var JsonFileType;
(function (JsonFileType) {
    /**
     * file type project
     */
    JsonFileType[JsonFileType["Project"] = 0] = "Project";
    /**
     * file type workflow
     */
    JsonFileType[JsonFileType["WorkFlow"] = 1] = "WorkFlow";
    /**
     * file type task
     */
    JsonFileType[JsonFileType["Task"] = 2] = "Task";
    /**
     * file type remote task
     */
    JsonFileType[JsonFileType["RemoteTask"] = 3] = "RemoteTask";
    /**
     * file type job
     */
    JsonFileType[JsonFileType["Job"] = 4] = "Job";
    /**
     * file type loop
     */
    JsonFileType[JsonFileType["Loop"] = 5] = "Loop";
    /**
     * file type if
     */
    JsonFileType[JsonFileType["If"] = 6] = "If";
    /**
     * file type else
     */
    JsonFileType[JsonFileType["Else"] = 7] = "Else";
    /**
     * file type condition
     */
    JsonFileType[JsonFileType["Condition"] = 8] = "Condition";
    /**
     * file type break
     */
    JsonFileType[JsonFileType["Break"] = 9] = "Break";
    /**
     * file type parameter study
     */
    JsonFileType[JsonFileType["PStudy"] = 10] = "PStudy";
})(JsonFileType || (JsonFileType = {}));
/**
 * Utility for server
 */
var ServerUtility = (function () {
    function ServerUtility() {
    }
    /**
     * copy file
     * @param path_src source path string
     * @param path_dst destination path string
     */
    ServerUtility.copyFile = function (path_src, path_dst) {
        if (!fs.existsSync(path_src)) {
            return;
        }
        var path_dst_file = path_dst;
        //if target is a directory a new file with the same name will be created
        if (fs.existsSync(path_dst) || fs.lstatSync(path_dst).isDirectory()) {
            path_dst_file = path.join(path_dst, path.basename(path_src));
        }
        if (fs.existsSync(path_dst_file)) {
            fs.unlinkSync(path_dst_file);
        }
        fs.writeFileSync(path_dst_file, fs.readFileSync(path_src));
    };
    /**
     * copy file async
     * @param path_src source path string
     * @param path_dst destination path string
     * @param callback The function to call when we have finished copy file
     */
    ServerUtility.copyFileAsync = function (path_src, path_dst, callback) {
        var path_dst_file = path_dst;
        var copy = function () {
            fs.readFile(path_src, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }
                fs.writeFile(path_dst_file, data, function (err) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback();
                });
            });
        };
        fs.stat(path_src, function (err, stat) {
            if (err) {
                callback(err);
                return;
            }
            fs.lstat(path_dst, function (err, stat) {
                if (!err && stat.isDirectory()) {
                    path_dst_file = path.join(path_dst, path.basename(path_src));
                }
                fs.stat(path_dst_file, function (err, stat) {
                    if (err) {
                        copy();
                        return;
                    }
                    fs.unlink(path_dst_file, function (err) {
                        if (err) {
                            callback(err);
                            return;
                        }
                        copy();
                    });
                });
            });
        });
    };
    /**
     * copy folder
     * @param path_src source path string
     * @param path_dst destination path string
     */
    ServerUtility.copyFolder = function (path_src, path_dst) {
        if (!fs.existsSync(path_src)) {
            return;
        }
        if (!fs.existsSync(path_dst)) {
            fs.mkdirSync(path_dst);
        }
        //copy
        if (fs.lstatSync(path_src).isDirectory()) {
            var files = fs.readdirSync(path_src);
            files.forEach(function (name_base) {
                var path_src_child = path.join(path_src, name_base);
                if (fs.lstatSync(path_src_child).isDirectory()) {
                    ServerUtility.copyFolder(path_src_child, path.join(path_dst, name_base));
                }
                else {
                    ServerUtility.copyFile(path_src_child, path_dst);
                }
            });
        }
    };
    /**
     * copy folder async
     * @param path_src source path string
     * @param path_dst destination path string
     * @param callback The funcion to call when we have finished to copy folder
     */
    ServerUtility.copyFolderAsync = function (path_src, path_dst, callback) {
        var _this = this;
        var filenames;
        var loop = function () {
            var filename = filenames.shift();
            if (!filename) {
                callback();
                return;
            }
            var path_src_child = path.join(path_src, filename);
            fs.lstat(path_src_child, function (err, stat) {
                if (err) {
                    callback(err);
                    return;
                }
                if (stat.isDirectory()) {
                    _this.copyFolderAsync(path_src_child, path.join(path_dst, filename), loop);
                }
                else {
                    _this.copyFileAsync(path_src_child, path_dst, loop);
                }
            });
        };
        fs.stat(path_src, function (err, stat) {
            if (err) {
                callback(err);
                return;
            }
            fs.stat(path_dst, function (err, stat) {
                fs.mkdir(path_dst, function (err) {
                    fs.lstat(path_src, function (err, stat) {
                        if (err) {
                            callback(err);
                            return;
                        }
                        if (!stat.isDirectory()) {
                            callback(new Error(path_src + " is not directory"));
                            return;
                        }
                        fs.readdir(path_src, function (err, files) {
                            if (err) {
                                callback(err);
                                return;
                            }
                            filenames = files;
                            loop();
                        });
                    });
                });
            });
        });
    };
    /**
     * unlink specified directory
     * @param path_dir unlink directory path
     */
    ServerUtility.unlinkDirectory = function (path_dir) {
        if (!fs.existsSync(path_dir)) {
            return;
        }
        if (fs.lstatSync(path_dir).isDirectory()) {
            var name_bases = fs.readdirSync(path_dir);
            for (var i = 0; i < name_bases.length; i++) {
                var path_child = path.join(path_dir, name_bases[i]);
                if (fs.lstatSync(path_child).isDirectory()) {
                    ServerUtility.unlinkDirectory(path_child);
                }
                else {
                    fs.unlinkSync(path_child);
                }
            }
            fs.rmdirSync(path_dir);
        }
    };
    /**
     * link directory
     * @param path_src source path string
     * @param path_dst destination path string
     */
    ServerUtility.linkDirectory = function (path_src, path_dst) {
        if (!fs.existsSync(path_src)) {
            return;
        }
        if (!fs.existsSync(path_dst)) {
            fs.mkdirSync(path_dst);
        }
        //copy
        if (fs.lstatSync(path_src).isDirectory()) {
            var files = fs.readdirSync(path_src);
            files.forEach(function (name_base) {
                var path_src_child = path.join(path_src, name_base);
                if (fs.lstatSync(path_src_child).isDirectory()) {
                    ServerUtility.copyFolder(path_src_child, path.join(path_dst, name_base));
                }
                else {
                    ServerUtility.copyFile(path_src_child, path_dst);
                }
            });
        }
    };
    /**
     * write file with replace keyword
     * @param src_path path of source file
     * @param dst_path path of destination file
     * @param values to replace set of key and value
     */
    ServerUtility.writeFileKeywordReplaced = function (src_path, dst_path, values) {
        var data = fs.readFileSync(src_path);
        var text = String(data);
        for (var key in values) {
            text = text.replace("" + key, String(values[key]));
        }
        fs.writeFileSync(dst_path, text);
    };
    /**
     * write file async with replace keyword
     * @param src_path path of source file
     * @param dst_path path of destination file
     * @param values to replace set of key and value
     * @param callback The function to call when we have finished to write file
     */
    ServerUtility.writeFileKeywordReplacedAsync = function (src_path, dst_path, values, callback) {
        fs.readFile(src_path, function (err, data) {
            if (err) {
                logger.error(err);
                callback(err);
                return;
            }
            var text = data.toString();
            Object.keys(values).forEach(function (key) {
                text = text.replace(key, String(values[key]));
            });
            fs.writeFile(dst_path, text, function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                callback();
            });
        });
    };
    /**
     * get all host infomation
     * @param callback The function to call when we have finished to get host information
     */
    ServerUtility.getHostInfo = function (callback) {
        fs.readFile(ServerUtility.getHostListPath(), function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            try {
                var hostListJson = JSON.parse(data.toString());
                callback(undefined, hostListJson);
            }
            catch (err) {
                callback(err);
            }
        });
    };
    /**
     * delete host information
     * @param name delete host label name
     * @param callback The function to call when we have finished to delete host information
     */
    ServerUtility.deleteHostInfo = function (name, callback) {
        this.getHostInfo(function (err, remoteHostList) {
            if (err) {
                callback(err);
                return;
            }
            if (!remoteHostList) {
                callback(new Error('host list does not exist'));
                return;
            }
            remoteHostList = remoteHostList.filter(function (host) { return host.name != name; });
            fs.writeFile(ServerUtility.getHostListPath(), JSON.stringify(remoteHostList, null, '\t'), function (err) {
                if (err) {
                    callback(err);
                }
                else {
                    callback();
                }
            });
        });
    };
    /**
     * add host information
     * @param addHostInfo add host information
     * @param callback The function to call when we have finished to add host information
     */
    ServerUtility.addHostInfo = function (addHostInfo, callback) {
        this.getHostInfo(function (err, remoteHostList) {
            if (err) {
                callback(err);
                return;
            }
            if (!remoteHostList) {
                callback(new Error('host list does not exist'));
                return;
            }
            remoteHostList = remoteHostList.filter(function (host) { return host.name !== addHostInfo.name; });
            remoteHostList.push(addHostInfo);
            fs.writeFile(ServerUtility.getHostListPath(), JSON.stringify(remoteHostList, null, '\t'), function (err) {
                if (err) {
                    callback(err);
                }
                else {
                    callback();
                }
            });
        });
    };
    /**
     * get host list path
     * @return host list path
     */
    ServerUtility.getHostListPath = function () {
        return path.join(__dirname, this.config.remotehost);
    };
    /**
     * read template project json file
     * @return template project json data
     */
    ServerUtility.readTemplateProjectJson = function () {
        var filepath = this.getTemplateFilePath(JsonFileType.Project);
        return this.readProjectJson(filepath);
    };
    /**
     * read template workflow json file
     * @return template workflow json data
     */
    ServerUtility.readTemplateWorkflowJson = function () {
        var filepath = this.getTemplateFilePath(JsonFileType.WorkFlow);
        return this.readJson(filepath);
    };
    /**
     * read projct json
     * @param filepath project json file path
     * @return project json data
     */
    ServerUtility.readProjectJson = function (filepath) {
        var regex = new RegExp("(?:" + this.config.extension.project.replace(/\./, '\.') + ")$");
        if (!filepath.match(regex)) {
            logger.error("file extension is not " + this.config.extension.project);
            return null;
        }
        var data = fs.readFileSync(filepath);
        var projectJson = JSON.parse(data.toString());
        return projectJson;
    };
    /**
     * read json file
     * @param filepath json file path
     */
    ServerUtility.readJson = function (filepath) {
        var data = fs.readFileSync(filepath);
        var json = JSON.parse(data.toString());
        return json;
    };
    /**
     * read .wf.json file tree
     * @param workflowJsonFilepath task json file (.wf.json or .tsk.json file)
     * @return task json file
     */
    ServerUtility.createTreeJson = function (workflowJsonFilepath) {
        var _this = this;
        var parent = this.readJson(workflowJsonFilepath);
        var parentDirname = path.dirname(workflowJsonFilepath);
        parent.children = [];
        if (parent.children_file) {
            parent.children_file.forEach(function (child, index) {
                var childFilePath = path.resolve(parentDirname, child.path);
                if (path.dirname(childFilePath).length <= parentDirname.length) {
                    logger.error("find circular reference. file=" + workflowJsonFilepath);
                }
                else {
                    var childJson = _this.createTreeJson(childFilePath);
                    if (childJson != null) {
                        parent.children.push(childJson);
                    }
                }
            });
        }
        return parent;
    };
    /**
     * create log node json
     * @param path_taskFile path json file (.wf.json or .tsk.json file)
     * @return swf project json object
     */
    ServerUtility.createLogJson = function (path_taskFile) {
        var _this = this;
        var workflowJson = this.readJson(path_taskFile);
        var logJson = {
            name: workflowJson.name,
            path: path.dirname(path_taskFile),
            description: workflowJson.description,
            type: workflowJson.type,
            state: this.config.state.planning,
            execution_start_date: '',
            execution_end_date: '',
            children: [],
            host: workflowJson.host
        };
        var parentDirname = path.dirname(path_taskFile);
        if (workflowJson.children_file) {
            workflowJson.children_file.forEach(function (child) {
                var path_childFile = path.join(parentDirname, child.path);
                if (path.dirname(path_childFile).length <= parentDirname.length) {
                    logger.error("find circular reference. file=" + path_taskFile);
                }
                else {
                    var childJson = _this.createLogJson(path_childFile);
                    if (childJson != null) {
                        logJson.children.push(childJson);
                    }
                }
            });
        }
        return logJson;
    };
    /**
     * create project json data
     * @param path_project project json file (.prj.json)
     * @return project json data
     */
    ServerUtility.createProjectJson = function (path_project) {
        var projectJson = this.readProjectJson(path_project);
        var dir_project = path.dirname(path_project);
        var path_workflow = path.resolve(dir_project, projectJson.path_workflow);
        projectJson.log = this.createLogJson(path_workflow);
        return projectJson;
    };
    /**
     * write json data
     * @param filepath write file path
     * @param json write json data
     * @param callback The function to call when we write json file
     */
    ServerUtility.writeJson = function (filepath, json, callback) {
        fs.writeFile(filepath, JSON.stringify(json, null, '\t'), function (err) {
            if (err) {
                callback(err);
                return;
            }
            callback();
        });
    };
    /**
     * whether specified hostname is localhost or not
     * @param hostname hostname
     * @return whether specified hostname is localhost or not
     */
    ServerUtility.isLocalHost = function (hostname) {
        return (hostname === 'localhost') || (hostname === '127.0.0.1');
    };
    /**
     * whether platform is windows or not
     * @return whether platform is windows or not
     */
    ServerUtility.isWindows = function () {
        return process.platform === 'win32';
    };
    /**
     * whether platform is linux or not
     * @return whether platform is linux or not
     */
    ServerUtility.isLinux = function () {
        return process.platform === 'linux';
    };
    /**
     * get home directory
     * @return home directory path
     */
    ServerUtility.getHomeDir = function () {
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
     * get template file path by type
     * @param fileType json file type
     * @return template file path by type
     */
    ServerUtility.getTemplateFilePath = function (fileType) {
        return this.getTypeOfJson(fileType).getTemplateFilepath();
    };
    /**
     * whether specified log json or project json is finished or not
     * @param json project json data or log json data
     * @return whether specified log json or project json is finished or not
     */
    ServerUtility.isProjectFinished = function (json) {
        return json.state === this.config.state.finishd || json.state === this.config.state.failed;
    };
    /**
     * whether specified json is type of job or not
     * @param json tree json data or log json data
     * @return whether specified json is type of job or not
     */
    ServerUtility.isTypeJob = function (json) {
        var template = this.getTypeOfJson(json.type);
        return template.getType() === this.config.json_types.job;
    };
    /**
     * whether specified json is type of loop or not
     * @param json tree json data or log json data
     * @return whether specified json is type of loop or not
     */
    ServerUtility.isTypeLoop = function (json) {
        var template = this.getTypeOfJson(json.type);
        return template.getType() === this.config.json_types.loop;
    };
    /**
     * whether specified json is type of parameter study or not
     * @param json tree json data or log json data
     * @return whether specified json is type of parameter study or not
     */
    ServerUtility.isTypePStudy = function (json) {
        var template = this.getTypeOfJson(json.type);
        return template.getType() === this.config.json_types.pstudy;
    };
    /**
     * get default default file name by type
     * @param fileType filetype or file type string
     * @return default default file name by type
     */
    ServerUtility.getDefaultName = function (fileType) {
        var template = this.getTypeOfJson(fileType);
        var extension = template.getExtension();
        return "" + this.config.default_filename + extension;
    };
    /**
     * get instane by type
     * @param fileType filetype or file type string
     * @return instance by type
     */
    ServerUtility.getTypeOfJson = function (fileType) {
        if (typeof fileType === 'string') {
            switch (fileType) {
                case this.config.json_types.workflow:
                    return new TypeWorkflow();
                case this.config.json_types.task:
                    return new TypeTask();
                case this.config.json_types.loop:
                    return new TypeLoop();
                case this.config.json_types.if:
                    return new TypeIf();
                case this.config.json_types.else:
                    return new TypeElse();
                case this.config.json_types.break:
                    return new TypeBreak();
                case this.config.json_types.remotetask:
                    return new TypeRemoteTask();
                case this.config.json_types.job:
                    return new TypeJob();
                case this.config.json_types.condition:
                    return new TypeCondition();
                case this.config.json_types.pstudy:
                    return new TypePStudy();
                default:
                    throw new TypeError('file type is undefined');
            }
        }
        else {
            switch (fileType) {
                case JsonFileType.Project:
                    return new TypeProject();
                case JsonFileType.WorkFlow:
                    return new TypeWorkflow();
                case JsonFileType.Task:
                    return new TypeTask();
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
                case JsonFileType.Job:
                    return new TypeJob();
                case JsonFileType.Condition:
                    return new TypeCondition();
                case JsonFileType.PStudy:
                    return new TypePStudy();
                default:
                    throw new TypeError('file type is undefined');
            }
        }
    };
    return ServerUtility;
}());
/**
 * config parameter
 */
ServerUtility.config = ServerConfig.getConfig();
/**
 * type base
 */
var TypeBase = (function () {
    function TypeBase() {
        /**
         * config date
         */
        this.config = ServerConfig.getConfig();
    }
    /**
     * get file extension name
     * @return file extension name
     */
    TypeBase.prototype.getExtension = function () {
        return this.extension;
    };
    /**
     * get template file path
     * @return template file path
     */
    TypeBase.prototype.getTemplateFilepath = function () {
        return path.normalize(__dirname + "/" + this.templateFilepath);
    };
    /**
     * get file type
     * @return file type
     */
    TypeBase.prototype.getType = function () {
        return this.type;
    };
    return TypeBase;
}());
/**
 * type project
 */
var TypeProject = (function (_super) {
    __extends(TypeProject, _super);
    /**
     * create new instance
     */
    function TypeProject() {
        var _this = _super.call(this) || this;
        _this.extension = _this.config.extension.project;
        _this.templateFilepath = _this.config.template.project;
        return _this;
    }
    return TypeProject;
}(TypeBase));
/**
 * type task
 */
var TypeTask = (function (_super) {
    __extends(TypeTask, _super);
    /**
     * create new instance
     */
    function TypeTask() {
        var _this = _super.call(this) || this;
        _this.extension = _this.config.extension.task;
        _this.templateFilepath = _this.config.template.task;
        _this.type = _this.config.json_types.task;
        return _this;
    }
    return TypeTask;
}(TypeBase));
/**
 * type workflow
 */
var TypeWorkflow = (function (_super) {
    __extends(TypeWorkflow, _super);
    /**
     * create new instance
     */
    function TypeWorkflow() {
        var _this = _super.call(this) || this;
        _this.extension = _this.config.extension.workflow;
        _this.templateFilepath = _this.config.template.workflow;
        _this.type = _this.config.json_types.workflow;
        return _this;
    }
    return TypeWorkflow;
}(TypeBase));
var TypeLoop = (function (_super) {
    __extends(TypeLoop, _super);
    /**
     * create new instance
     */
    function TypeLoop() {
        var _this = _super.call(this) || this;
        _this.extension = _this.config.extension.loop;
        _this.templateFilepath = _this.config.template.loop;
        _this.type = _this.config.json_types.loop;
        return _this;
    }
    return TypeLoop;
}(TypeBase));
/**
 * type if
 */
var TypeIf = (function (_super) {
    __extends(TypeIf, _super);
    /**
     * create new instance
     */
    function TypeIf() {
        var _this = _super.call(this) || this;
        _this.extension = _this.config.extension.if;
        _this.templateFilepath = _this.config.template.if;
        _this.type = _this.config.json_types.if;
        return _this;
    }
    return TypeIf;
}(TypeBase));
/**
 * type else
 */
var TypeElse = (function (_super) {
    __extends(TypeElse, _super);
    /**
     * create new instance
     */
    function TypeElse() {
        var _this = _super.call(this) || this;
        _this.extension = _this.config.extension.else;
        _this.templateFilepath = _this.config.template.else;
        _this.type = _this.config.json_types.else;
        return _this;
    }
    return TypeElse;
}(TypeBase));
/**
 * type break
 */
var TypeBreak = (function (_super) {
    __extends(TypeBreak, _super);
    /**
     * create new instance
     */
    function TypeBreak() {
        var _this = _super.call(this) || this;
        _this.extension = _this.config.extension.break;
        _this.templateFilepath = _this.config.template.break;
        _this.type = _this.config.json_types.break;
        return _this;
    }
    return TypeBreak;
}(TypeBase));
/**
 * type remote task
 */
var TypeRemoteTask = (function (_super) {
    __extends(TypeRemoteTask, _super);
    /**
     * create new instance
     */
    function TypeRemoteTask() {
        var _this = _super.call(this) || this;
        _this.extension = _this.config.extension.remotetask;
        _this.templateFilepath = _this.config.template.remotetask;
        _this.type = _this.config.json_types.remotetask;
        return _this;
    }
    return TypeRemoteTask;
}(TypeBase));
/**
 * type job
 */
var TypeJob = (function (_super) {
    __extends(TypeJob, _super);
    /**
     * create new instance
     */
    function TypeJob() {
        var _this = _super.call(this) || this;
        _this.extension = _this.config.extension.job;
        _this.templateFilepath = _this.config.template.job;
        _this.type = _this.config.json_types.job;
        return _this;
    }
    return TypeJob;
}(TypeBase));
/**
 * type condition
 */
var TypeCondition = (function (_super) {
    __extends(TypeCondition, _super);
    /**
     * create new instance
     */
    function TypeCondition() {
        var _this = _super.call(this) || this;
        _this.extension = _this.config.extension.condition;
        _this.templateFilepath = _this.config.template.condition;
        _this.type = _this.config.json_types.condition;
        return _this;
    }
    return TypeCondition;
}(TypeBase));
/**
 * type parameter study
 */
var TypePStudy = (function (_super) {
    __extends(TypePStudy, _super);
    /**
     * create new instance
     */
    function TypePStudy() {
        var _this = _super.call(this) || this;
        _this.extension = _this.config.extension.pstudy;
        _this.templateFilepath = _this.config.template.pstudy;
        _this.type = _this.config.json_types.pstudy;
        return _this;
    }
    return TypePStudy;
}(TypeBase));
module.exports = ServerUtility;
//# sourceMappingURL=serverUtility.js.map