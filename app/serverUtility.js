"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var fs = require("fs");
var path = require("path");
var os = require("os");
var logger = require("./logger");
var ServerConfig = require("./serverConfig");
var SwfType = require("./swfType");
var SwfState = require("./swfState");
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
     * unlink specified directory async
     * @param path_dir unlink directory path
     * @param callback The funcion to call when we have finished to unlink directory
     */
    ServerUtility.unlinkDirectoryAsync = function (path_dir, callback) {
        var _this = this;
        fs.lstat(path_dir, function (err, stat) {
            if (err) {
                callback(err);
                return;
            }
            if (stat.isDirectory()) {
                fs.readdir(path_dir, function (err, files) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    var loop = function () {
                        var file = files.shift();
                        if (!file) {
                            fs.rmdir(path_dir, function (err) {
                                callback(err);
                            });
                            return;
                        }
                        var path_child = path.join(path_dir, file);
                        fs.lstat(path_child, function (err, stat) {
                            if (err) {
                                loop();
                                return;
                            }
                            if (stat.isDirectory()) {
                                _this.unlinkDirectoryAsync(path_child, loop);
                            }
                            else {
                                fs.unlink(path_child, function (err) {
                                    loop();
                                });
                            }
                        });
                    };
                    loop();
                });
            }
            else {
                callback();
            }
        });
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
        var filepath = this.getTypeOfJson(SwfType.PROJECT).getTemplateFilePath();
        return this.readProjectJson(filepath);
    };
    /**
     * read template workflow json file
     * @return template workflow json data
     */
    ServerUtility.readTemplateWorkflowJson = function () {
        var filepath = this.getTypeOfJson(SwfType.WORKFLOW).getTemplateFilePath();
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
     * @param treeJsonFilepath task json file (.wf.json or .tsk.json file)
     * @return task json file
     */
    ServerUtility.createTreeJson = function (treeJsonFilepath) {
        var _this = this;
        var parent = this.readJson(treeJsonFilepath);
        var parentDirname = path.dirname(treeJsonFilepath);
        parent.children = [];
        if (parent.children_file) {
            parent.children_file.forEach(function (child, index) {
                var childFilePath = path.resolve(parentDirname, child.path);
                if (path.dirname(childFilePath).length <= parentDirname.length) {
                    logger.error("find circular reference. file=" + treeJsonFilepath);
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
     * renumbering display order
     * @param treeJson tree json date
     */
    ServerUtility.setDisplayOrder = function (treeJson) {
        var _this = this;
        var order = 0;
        treeJson.children.forEach(function (child, index) {
            var relations = treeJson.relations.filter(function (relation) { return relation.index_after_task === index; });
            var fileRelations = treeJson.file_relations.filter(function (relation) { return relation.index_after_task === index; });
            if (!relations[0] && !fileRelations[0]) {
                child.order = order;
                order += 100;
            }
        });
        function setOrder(before) {
            treeJson.relations
                .filter(function (relation) { return relation.index_before_task === before; })
                .forEach(function (relation) { return updateOrder(relation); });
            treeJson.file_relations
                .filter(function (relation) { return relation.index_before_task === before; })
                .forEach(function (relation) { return updateOrder(relation); });
        }
        function updateOrder(relation) {
            var child = treeJson.children[relation.index_after_task];
            var afterOrder = treeJson.children[relation.index_before_task].order + 1;
            if (child.order === undefined) {
                child.order = afterOrder;
            }
            else {
                child.order = Math.max(child.order, afterOrder);
            }
            setOrder(relation.index_after_task);
        }
        treeJson.children.forEach(function (child, index) {
            if (child.order !== undefined && child.order % 100 === 0) {
                setOrder(index);
            }
            _this.setDisplayOrder(child);
        });
    };
    /**
     * create log node json
     * @param path_taskFile path json file (.wf.json or .tsk.json file)
     * @return swf project json object
     */
    ServerUtility.createLogJson = function (path_taskFile) {
        var tree = this.createTreeJson(path_taskFile);
        this.setDisplayOrder(tree);
        var planningState = SwfState.PLANNING;
        (function convertTreeToLog(treeJson, parentDir) {
            treeJson.path = path.join(parentDir, treeJson.path);
            var logJson = {
                name: treeJson.name,
                path: treeJson.path,
                description: treeJson.description,
                type: treeJson.type,
                state: planningState,
                execution_start_date: '',
                execution_end_date: '',
                children: [],
                order: treeJson.order,
                remote: treeJson.remote
            };
            Object.keys(treeJson).forEach(function (key) {
                if (logJson[key] === undefined) {
                    delete treeJson[key];
                }
            });
            Object.keys(logJson).forEach(function (key) {
                if (treeJson[key] === undefined) {
                    treeJson[key] = logJson[key];
                }
            });
            treeJson.children.forEach(function (child) { return convertTreeToLog(child, logJson.path); });
        })(tree, path.dirname(path.dirname(path_taskFile)));
        return tree;
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
        return os.platform() === 'win32';
    };
    /**
     * whether platform is linux or not
     * @return whether platform is linux or not
     */
    ServerUtility.isLinux = function () {
        return os.platform() === 'linux';
    };
    /**
     * whether platform is mac or not
     * @return whether platform is mac or not
     */
    ServerUtility.isMac = function () {
        return os.platform() === 'darwin';
    };
    /**
     * whether platform is unix or not
     * @return whether platform is unix or not
     */
    ServerUtility.isUnix = function () {
        return this.isLinux() || this.isMac();
    };
    /**
     * get instane by type
     * @param target filetype or tree json data
     * @return instance by type
     */
    ServerUtility.getTypeOfJson = function (target) {
        var type;
        if (typeof target === 'string') {
            type = target;
        }
        else {
            type = target.type;
        }
        switch (type) {
            case SwfType.PROJECT:
                return new TypeProject();
            case SwfType.WORKFLOW:
                return new TypeWorkflow();
            case SwfType.TASK:
                return new TypeTask();
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
            case SwfType.JOB:
                return new TypeJob();
            case SwfType.CONDITION:
                return new TypeCondition();
            case SwfType.PSTUDY:
                return new TypePStudy();
            default:
                throw new TypeError('file type is undefined');
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
    /**
     * create new instance
     * @param type SwfType
     */
    function TypeBase(type) {
        /**
         * config date
         */
        this.config = ServerConfig.getConfig();
        this.type = type;
    }
    /**
     * get file extension name
     * @return file extension name
     */
    TypeBase.prototype.getExtension = function () {
        return this.config.extension[this.type.toLocaleLowerCase()];
    };
    /**
     * get template file path
     * @return template file path
     */
    TypeBase.prototype.getTemplateFilePath = function () {
        return path.normalize(__dirname + "/" + this.config.template[this.type.toLocaleLowerCase()]);
    };
    /**
     * get default file name
     * @return default file name
     */
    TypeBase.prototype.getDefaultName = function () {
        return "" + this.config.default_filename + this.getExtension();
    };
    /**
     * get file type
     * @return file type
     */
    TypeBase.prototype.getType = function () {
        return this.type;
    };
    /**
     * run task
     */
    TypeBase.prototype.run = function () {
        throw new Error('function is not implemented');
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
        return _super.call(this, SwfType.PROJECT) || this;
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
        return _super.call(this, SwfType.TASK) || this;
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
        return _super.call(this, SwfType.WORKFLOW) || this;
    }
    return TypeWorkflow;
}(TypeBase));
var TypeFor = (function (_super) {
    __extends(TypeFor, _super);
    /**
     * create new instance
     */
    function TypeFor() {
        return _super.call(this, SwfType.FOR) || this;
    }
    return TypeFor;
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
        return _super.call(this, SwfType.IF) || this;
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
        return _super.call(this, SwfType.ELSE) || this;
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
        return _super.call(this, SwfType.BREAK) || this;
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
        return _super.call(this, SwfType.REMOTETASK) || this;
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
        return _super.call(this, SwfType.JOB) || this;
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
        return _super.call(this, SwfType.CONDITION) || this;
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
        return _super.call(this, SwfType.PSTUDY) || this;
    }
    return TypePStudy;
}(TypeBase));
module.exports = ServerUtility;
//# sourceMappingURL=serverUtility.js.map