"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const logger = require("./logger");
const SwfType = require("./swfType");
const SwfState = require("./swfState");
/**
 * Utility for server
 */
class ServerUtility {
    /**
     * copy file
     * @param path_src source path string
     * @param path_dst destination path string
     */
    static copyFile(path_src, path_dst) {
        if (!fs.existsSync(path_src)) {
            return;
        }
        let path_dst_file = path_dst;
        //if target is a directory a new file with the same name will be created
        if (fs.existsSync(path_dst) || fs.lstatSync(path_dst).isDirectory()) {
            path_dst_file = path.join(path_dst, path.basename(path_src));
        }
        if (fs.existsSync(path_dst_file)) {
            fs.unlinkSync(path_dst_file);
        }
        fs.writeFileSync(path_dst_file, fs.readFileSync(path_src));
    }
    /**
     * copy file async
     * @param path_src source path string
     * @param path_dst destination path string
     * @param callback The function to call when we have finished copy file
     */
    static copyFileAsync(path_src, path_dst, callback) {
        let path_dst_file = path_dst;
        const copy = () => {
            fs.readFile(path_src, (err, data) => {
                if (err) {
                    callback(err);
                    return;
                }
                fs.writeFile(path_dst_file, data, (err) => {
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback();
                });
            });
        };
        fs.stat(path_src, (err, stat) => {
            if (err) {
                callback(err);
                return;
            }
            fs.lstat(path_dst, (err, stat) => {
                if (!err && stat.isDirectory()) {
                    path_dst_file = path.join(path_dst, path.basename(path_src));
                }
                fs.stat(path_dst_file, (err, stat) => {
                    if (err) {
                        copy();
                        return;
                    }
                    fs.unlink(path_dst_file, (err) => {
                        if (err) {
                            callback(err);
                            return;
                        }
                        copy();
                    });
                });
            });
        });
    }
    /**
     * copy folder
     * @param path_src source path string
     * @param path_dst destination path string
     */
    static copyFolder(path_src, path_dst) {
        if (!fs.existsSync(path_src)) {
            return;
        }
        if (!fs.existsSync(path_dst)) {
            fs.mkdirSync(path_dst);
        }
        //copy
        if (fs.lstatSync(path_src).isDirectory()) {
            const files = fs.readdirSync(path_src);
            files.forEach(function (name_base) {
                const path_src_child = path.join(path_src, name_base);
                if (fs.lstatSync(path_src_child).isDirectory()) {
                    ServerUtility.copyFolder(path_src_child, path.join(path_dst, name_base));
                }
                else {
                    ServerUtility.copyFile(path_src_child, path_dst);
                }
            });
        }
    }
    /**
     * copy folder async
     * @param path_src source path string
     * @param path_dst destination path string
     * @param callback The funcion to call when we have finished to copy folder
     */
    static copyFolderAsync(path_src, path_dst, callback) {
        let filenames;
        const loop = () => {
            const filename = filenames.shift();
            if (!filename) {
                callback();
                return;
            }
            const path_src_child = path.join(path_src, filename);
            fs.lstat(path_src_child, (err, stat) => {
                if (err) {
                    callback(err);
                    return;
                }
                if (stat.isDirectory()) {
                    this.copyFolderAsync(path_src_child, path.join(path_dst, filename), loop);
                }
                else {
                    this.copyFileAsync(path_src_child, path_dst, loop);
                }
            });
        };
        fs.stat(path_src, (err, stat) => {
            if (err) {
                callback(err);
                return;
            }
            fs.stat(path_dst, (err, stat) => {
                fs.mkdir(path_dst, (err) => {
                    fs.lstat(path_src, (err, stat) => {
                        if (err) {
                            callback(err);
                            return;
                        }
                        if (!stat.isDirectory()) {
                            callback(new Error(`${path_src} is not directory`));
                            return;
                        }
                        fs.readdir(path_src, (err, files) => {
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
    }
    /**
     * unlink specified directory
     * @param path_dir unlink directory path
     */
    static unlinkDirectory(path_dir) {
        if (!fs.existsSync(path_dir)) {
            return;
        }
        if (fs.lstatSync(path_dir).isDirectory()) {
            const name_bases = fs.readdirSync(path_dir);
            for (let i = 0; i < name_bases.length; i++) {
                const path_child = path.join(path_dir, name_bases[i]);
                if (fs.lstatSync(path_child).isDirectory()) {
                    ServerUtility.unlinkDirectory(path_child);
                }
                else {
                    fs.unlinkSync(path_child);
                }
            }
            fs.rmdirSync(path_dir);
        }
    }
    /**
     * unlink specified directory async
     * @param path_dir unlink directory path
     * @param callback The funcion to call when we have finished to unlink directory
     */
    static unlinkDirectoryAsync(path_dir, callback) {
        fs.lstat(path_dir, (err, stat) => {
            if (err) {
                callback(err);
                return;
            }
            if (stat.isDirectory()) {
                fs.readdir(path_dir, (err, files) => {
                    if (err) {
                        callback(err);
                        return;
                    }
                    const loop = () => {
                        const file = files.shift();
                        if (!file) {
                            fs.rmdir(path_dir, (err) => {
                                callback(err);
                            });
                            return;
                        }
                        const path_child = path.join(path_dir, file);
                        fs.lstat(path_child, (err, stat) => {
                            if (err) {
                                loop();
                                return;
                            }
                            if (stat.isDirectory()) {
                                this.unlinkDirectoryAsync(path_child, loop);
                            }
                            else {
                                fs.unlink(path_child, (err) => {
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
    }
    /**
     * link directory
     * @param path_src source path string
     * @param path_dst destination path string
     */
    static linkDirectory(path_src, path_dst) {
        if (!fs.existsSync(path_src)) {
            return;
        }
        if (!fs.existsSync(path_dst)) {
            fs.mkdirSync(path_dst);
        }
        //copy
        if (fs.lstatSync(path_src).isDirectory()) {
            const files = fs.readdirSync(path_src);
            files.forEach(function (name_base) {
                const path_src_child = path.join(path_src, name_base);
                if (fs.lstatSync(path_src_child).isDirectory()) {
                    ServerUtility.copyFolder(path_src_child, path.join(path_dst, name_base));
                }
                else {
                    ServerUtility.copyFile(path_src_child, path_dst);
                }
            });
        }
    }
    /**
     * write file with replace keyword
     * @param src_path path of source file
     * @param dst_path path of destination file
     * @param values to replace set of key and value
     */
    static writeFileKeywordReplaced(src_path, dst_path, values) {
        const data = fs.readFileSync(src_path);
        let text = String(data);
        for (const key in values) {
            text = text.replace(`${key}`, String(values[key]));
        }
        fs.writeFileSync(dst_path, text);
    }
    /**
     * write file async with replace keyword
     * @param src_path path of source file
     * @param dst_path path of destination file
     * @param values to replace set of key and value
     * @param callback The function to call when we have finished to write file
     */
    static writeFileKeywordReplacedAsync(src_path, dst_path, values, callback) {
        fs.readFile(src_path, (err, data) => {
            if (err) {
                logger.error(err);
                callback(err);
                return;
            }
            let text = data.toString();
            Object.keys(values).forEach(key => {
                text = text.replace(key, String(values[key]));
            });
            fs.writeFile(dst_path, text, (err) => {
                if (err) {
                    callback(err);
                    return;
                }
                callback();
            });
        });
    }
    /**
     * get all host infomation
     * @param callback The function to call when we have finished to get host information
     */
    static getHostInfo(callback) {
        fs.readFile(ServerUtility.getHostListPath(), (err, data) => {
            if (err && err.code !== 'ENOENT') {
                callback(err);
                return;
            }
            try {
                var hostListJson = [];
                if (data != null) {
                    hostListJson = JSON.parse(data.toString());
                }
                callback(undefined, hostListJson);
            }
            catch (err) {
                callback(err);
            }
        });
    }
    /**
     * delete host information
     * @param name delete host label name
     * @param callback The function to call when we have finished to delete host information
     */
    static deleteHostInfo(name, callback) {
        this.getHostInfo((err, remoteHostList) => {
            if (err) {
                callback(err);
                return;
            }
            if (!remoteHostList) {
                callback(new Error('host list does not exist'));
                return;
            }
            remoteHostList = remoteHostList.filter(host => host.name != name);
            fs.writeFile(ServerUtility.getHostListPath(), JSON.stringify(remoteHostList, null, '\t'), (err) => {
                if (err) {
                    callback(err);
                }
                else {
                    callback();
                }
            });
        });
    }
    /**
     * add host information
     * @param addHostInfo add host information
     * @param callback The function to call when we have finished to add host information
     */
    static addHostInfo(addHostInfo, callback) {
        this.getHostInfo((err, remoteHostList) => {
            if (err) {
                callback(err);
                return;
            }
            if (!remoteHostList) {
                callback(new Error('host list does not exist'));
                return;
            }
            remoteHostList = remoteHostList.filter(host => host.name !== addHostInfo.name);
            remoteHostList.push(addHostInfo);
            fs.writeFile(ServerUtility.getHostListPath(), JSON.stringify(remoteHostList, null, '\t'), (err) => {
                if (err) {
                    callback(err);
                }
                else {
                    callback();
                }
            });
        });
    }
    /**
     * get host list path
     * @return host list path
     */
    static getHostListPath() {
        return path.join(__dirname, this.config.remotehost);
    }
    /**
     * read template project json file
     * @return template project json data
     */
    static readTemplateProjectJson() {
        const filepath = this.getTypeOfJson(SwfType.PROJECT).getTemplateFilePath();
        return this.readProjectJson(filepath);
    }
    /**
     * read template workflow json file
     * @return template workflow json data
     */
    static readTemplateWorkflowJson() {
        const filepath = this.getTypeOfJson(SwfType.WORKFLOW).getTemplateFilePath();
        return this.readJson(filepath);
    }
    /**
     * read projct json
     * @param filepath project json file path
     * @return project json data
     */
    static readProjectJson(filepath) {
        const regex = new RegExp(`(?:${this.config.extension.project.replace(/\./, '\.')})$`);
        if (!filepath.match(regex)) {
            logger.error(`file extension is not ${this.config.extension.project}`);
            return null;
        }
        const data = fs.readFileSync(filepath);
        const projectJson = JSON.parse(data.toString());
        return projectJson;
    }
    /**
     * read json file
     * @param filepath json file path
     */
    static readJson(filepath) {
        const data = fs.readFileSync(filepath);
        const json = JSON.parse(data.toString());
        return json;
    }
    /**
     * read .wf.json file tree
     * @param treeJsonFilepath task json file (.wf.json or .tsk.json file)
     * @return task json file
     */
    static createTreeJson(treeJsonFilepath) {
        const parent = this.readJson(treeJsonFilepath);
        const parentDirname = path.dirname(treeJsonFilepath);
        parent.children = [];
        if (parent.children_file) {
            parent.children_file.forEach((child, index) => {
                const childFilePath = path.resolve(parentDirname, child.path);
                if (path.dirname(childFilePath).length <= parentDirname.length) {
                    logger.error(`find circular reference. file=${treeJsonFilepath}`);
                }
                else {
                    const childJson = this.createTreeJson(childFilePath);
                    if (childJson != null) {
                        parent.children.push(childJson);
                    }
                }
            });
        }
        return parent;
    }
    /**
     * renumbering display order
     * @param treeJson tree json date
     */
    static setDisplayOrder(treeJson) {
        let order = 0;
        treeJson.children.forEach((child, index) => {
            const relations = treeJson.relations.filter(relation => relation.index_after_task === index);
            const fileRelations = treeJson.file_relations.filter(relation => relation.index_after_task === index);
            if (!relations[0] && !fileRelations[0]) {
                child.order = order;
                order += 100;
            }
        });
        function setOrder(before) {
            treeJson.relations
                .filter(relation => relation.index_before_task === before)
                .forEach(relation => updateOrder(relation));
            treeJson.file_relations
                .filter(relation => relation.index_before_task === before)
                .forEach(relation => updateOrder(relation));
        }
        function updateOrder(relation) {
            const child = treeJson.children[relation.index_after_task];
            const afterOrder = treeJson.children[relation.index_before_task].order + 1;
            if (child.order === undefined) {
                child.order = afterOrder;
            }
            else {
                child.order = Math.max(child.order, afterOrder);
            }
            setOrder(relation.index_after_task);
        }
        treeJson.children.forEach((child, index) => {
            if (child.order !== undefined && child.order % 100 === 0) {
                setOrder(index);
            }
            this.setDisplayOrder(child);
        });
    }
    /**
     * create log node json
     * @param path_taskFile path json file (.wf.json or .tsk.json file)
     * @return swf project json object
     */
    static createLogJson(path_taskFile) {
        const tree = this.createTreeJson(path_taskFile);
        this.setDisplayOrder(tree);
        const planningState = SwfState.PLANNING;
        (function convertTreeToLog(treeJson, parentDir) {
            treeJson.path = path.join(parentDir, treeJson.path);
            const logJson = {
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
            Object.keys(treeJson).forEach(key => {
                if (logJson[key] === undefined) {
                    delete treeJson[key];
                }
            });
            Object.keys(logJson).forEach(key => {
                if (treeJson[key] === undefined) {
                    treeJson[key] = logJson[key];
                }
            });
            treeJson.children.forEach(child => convertTreeToLog(child, logJson.path));
        })(tree, path.dirname(path.dirname(path_taskFile)));
        return tree;
    }
    /**
     * create project json data
     * @param path_project project json file (.prj.json)
     * @return project json data
     */
    static createProjectJson(path_project) {
        const projectJson = this.readProjectJson(path_project);
        const dir_project = path.dirname(path_project);
        const path_workflow = path.resolve(dir_project, projectJson.path_workflow);
        projectJson.log = this.createLogJson(path_workflow);
        return projectJson;
    }
    /**
     * write json data
     * @param filepath write file path
     * @param json write json data
     * @param callback The function to call when we write json file
     */
    static writeJson(filepath, json, callback) {
        fs.writeFile(filepath, JSON.stringify(json, null, '\t'), (err) => {
            if (err) {
                callback(err);
                return;
            }
            callback();
        });
    }
    /**
     * whether specified hostname is localhost or not
     * @param hostname hostname
     * @return whether specified hostname is localhost or not
     */
    static isLocalHost(hostname) {
        return (hostname === 'localhost') || (hostname === '127.0.0.1');
    }
    /**
     * whether platform is windows or not
     * @return whether platform is windows or not
     */
    static isWindows() {
        return os.platform() === 'win32';
    }
    /**
     * whether platform is linux or not
     * @return whether platform is linux or not
     */
    static isLinux() {
        return os.platform() === 'linux';
    }
    /**
     * whether platform is mac or not
     * @return whether platform is mac or not
     */
    static isMac() {
        return os.platform() === 'darwin';
    }
    /**
     * whether platform is unix or not
     * @return whether platform is unix or not
     */
    static isUnix() {
        return this.isLinux() || this.isMac();
    }
    /**
     * get instane by type
     * @param target filetype or tree json data
     * @return instance by type
     */
    static getTypeOfJson(target) {
        let type;
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
    }
}
/**
 * config parameter
 */
ServerUtility.config = require('./config/server');
/**
 * type base
 */
class TypeBase {
    /**
     * create new instance
     * @param type SwfType
     */
    constructor(type) {
        /**
         * config date
         */
        this.config = require('./config/server');
        this.type = type;
    }
    /**
     * get file extension name
     * @return file extension name
     */
    getExtension() {
        return this.config.extension[this.type.toLocaleLowerCase()];
    }
    /**
     * get template file path
     * @return template file path
     */
    getTemplateFilePath() {
        return path.normalize(`${__dirname}/${this.config.template[this.type.toLocaleLowerCase()]}`);
    }
    /**
     * get default file name
     * @return default file name
     */
    getDefaultName() {
        return `${this.config.default_filename}${this.getExtension()}`;
    }
    /**
     * get file type
     * @return file type
     */
    getType() {
        return this.type;
    }
    /**
     * run task
     */
    run() {
        throw new Error('function is not implemented');
    }
}
/**
 * type project
 */
class TypeProject extends TypeBase {
    /**
     * create new instance
     */
    constructor() {
        super(SwfType.PROJECT);
    }
}
/**
 * type task
 */
class TypeTask extends TypeBase {
    /**
     * create new instance
     */
    constructor() {
        super(SwfType.TASK);
    }
}
/**
 * type workflow
 */
class TypeWorkflow extends TypeBase {
    /**
     * create new instance
     */
    constructor() {
        super(SwfType.WORKFLOW);
    }
}
class TypeFor extends TypeBase {
    /**
     * create new instance
     */
    constructor() {
        super(SwfType.FOR);
    }
}
/**
 * type if
 */
class TypeIf extends TypeBase {
    /**
     * create new instance
     */
    constructor() {
        super(SwfType.IF);
    }
}
/**
 * type else
 */
class TypeElse extends TypeBase {
    /**
     * create new instance
     */
    constructor() {
        super(SwfType.ELSE);
    }
}
/**
 * type break
 */
class TypeBreak extends TypeBase {
    /**
     * create new instance
     */
    constructor() {
        super(SwfType.BREAK);
    }
}
/**
 * type remote task
 */
class TypeRemoteTask extends TypeBase {
    /**
     * create new instance
     */
    constructor() {
        super(SwfType.REMOTETASK);
    }
}
/**
 * type job
 */
class TypeJob extends TypeBase {
    /**
     * create new instance
     */
    constructor() {
        super(SwfType.JOB);
    }
}
/**
 * type condition
 */
class TypeCondition extends TypeBase {
    /**
     * create new instance
     */
    constructor() {
        super(SwfType.CONDITION);
    }
}
/**
 * type parameter study
 */
class TypePStudy extends TypeBase {
    /**
     * create new instance
     */
    constructor() {
        super(SwfType.PSTUDY);
    }
}
module.exports = ServerUtility;
//# sourceMappingURL=serverUtility.js.map
