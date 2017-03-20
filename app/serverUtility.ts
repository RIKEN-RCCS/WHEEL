import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import ServerConfig = require('./serverConfig');

/**
 * json file type
 */
enum JsonFileType {
    /**
     * file type project
     */
    Project,
    /**
     * file type workflow
     */
    WorkFlow,
    /**
     * file type task
     */
    Task,
    /**
     * file type remote task
     */
    RemoteTask,
    /**
     * file type job
     */
    Job,
    /**
     * file type loop
     */
    Loop,
    /**
     * file type if
     */
    If,
    /**
     * file type else
     */
    Else,
    /**
     * file type condition
     */
    Condition,
    /**
     * file type break
     */
    Break,
    /**
     * file type parameter study
     */
    PStudy
}

/**
 * Utility for server
 */
class ServerUtility {
    /**
     * copy file
     * @param path_src source path string
     * @param path_dst destination path string
     */
    public static copyFile(path_src: string, path_dst: string) {
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
    public static copyFileAsync(path_src: string, path_dst: string, callback: ((err?: Error) => void)) {
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
    public static copyFolder(path_src: string, path_dst: string) {
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
                } else {
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
    public static copyFolderAsync(path_src: string, path_dst: string, callback: ((err?: Error) => void)) {

        let filenames: string[];

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
    public static unlinkDirectory(path_dir: string) {
        if (!fs.existsSync(path_dir)) {
            return;
        }

        if (fs.lstatSync(path_dir).isDirectory()) {
            const name_bases = fs.readdirSync(path_dir);
            for (let i = 0; i < name_bases.length; i++) {
                const path_child = path.join(path_dir, name_bases[i]);
                if (fs.lstatSync(path_child).isDirectory()) {
                    ServerUtility.unlinkDirectory(path_child);
                } else {
                    fs.unlinkSync(path_child);
                }
            }
            fs.rmdirSync(path_dir);
        }
    }

    /**
     * link directory
     * @param path_src source path string
     * @param path_dst destination path string
     */
    public static linkDirectory(path_src: string, path_dst: string) {
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
                } else {
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
    public static writeFileKeywordReplaced(src_path: string, dst_path: string, values: Object) {
        const data: Buffer = fs.readFileSync(src_path);
        let text: string = String(data);
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
    public static writeFileKeywordReplacedAsync(src_path: string, dst_path: string, values: { [key: string]: string }, callback: ((err?: Error) => void)) {
        fs.readFile(src_path, (err, data) => {
            if (err) {
                logger.error(err);
                callback(err);
                return;
            }

            let text: string = data.toString();
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
     * config parameter
     */
    private static config = ServerConfig.getConfig();

    /**
     * get all host infomation
     * @param callback The function to call when we have finished to get host information
     */
    public static getHostInfo(callback: ((err?: Error, hosts?: SwfHostJson[]) => void)) {
        fs.readFile(ServerUtility.getHostListPath(), (err, data) => {
            if (err) {
                callback(err);
                return;
            }
            try {
                const hostListJson: SwfHostJson[] = JSON.parse(data.toString());
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
    public static deleteHostInfo(name: string, callback: ((err?: Error) => void)) {
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
    public static addHostInfo(addHostInfo: SwfHostJson, callback: ((err?) => void)) {
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
    public static getHostListPath(): string {
        return path.join(__dirname, this.config.remotehost);
    }

    /**
     * read template project json file
     * @return template project json data
     */
    public static readTemplateProjectJson(): SwfProjectJson {
        const filepath = this.getTemplateFilePath(JsonFileType.Project);
        return this.readProjectJson(filepath);
    }

    /**
     * read template workflow json file
     * @return template workflow json data
     */
    public static readTemplateWorkflowJson(): SwfWorkflowJson {
        const filepath = this.getTemplateFilePath(JsonFileType.WorkFlow);
        return this.readJson(filepath);
    }

    /**
     * read projct json
     * @param filepath project json file path
     * @return project json data
     */
    public static readProjectJson(filepath: string): SwfProjectJson {
        const regex = new RegExp(`(?:${this.config.extension.project.replace(/\./, '\.')})$`);
        if (!filepath.match(regex)) {
            logger.error(`file extension is not ${this.config.extension.project}`);
            return null;
        }

        const data = fs.readFileSync(filepath);
        const projectJson: SwfProjectJson = JSON.parse(data.toString());

        return projectJson;
    }

    /**
     * read json file
     * @param filepath json file path
     */
    public static readJson(filepath: string): any {
        const data = fs.readFileSync(filepath);
        const json: SwfWorkflowJson = JSON.parse(data.toString());
        return json;
    }

    /**
     * read .wf.json file tree
     * @param workflowJsonFilepath task json file (.wf.json or .tsk.json file)
     * @return task json file
     */
    public static createTreeJson(workflowJsonFilepath: string): SwfTreeJson {

        const parent = <SwfTreeJson>this.readJson(workflowJsonFilepath);
        const parentDirname = path.dirname(workflowJsonFilepath);
        parent.children = [];
        if (parent.children_file) {
            parent.children_file.forEach((child, index) => {
                const childFilePath = path.resolve(parentDirname, child.path);
                if (path.dirname(childFilePath).length <= parentDirname.length) {
                    logger.error(`find circular reference. file=${workflowJsonFilepath}`);
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
     * create log node json
     * @param path_taskFile path json file (.wf.json or .tsk.json file)
     * @return swf project json object
     */
    public static createLogJson(path_taskFile: string): SwfLogJson {

        const workflowJson: any = this.readJson(path_taskFile);

        const logJson: SwfLogJson = {
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

        const parentDirname = path.dirname(path_taskFile);
        if (workflowJson.children_file) {
            workflowJson.children_file.forEach(child => {
                const path_childFile = path.join(parentDirname, child.path);
                if (path.dirname(path_childFile).length <= parentDirname.length) {
                    logger.error(`find circular reference. file=${path_taskFile}`);
                }
                else {
                    const childJson = this.createLogJson(path_childFile);
                    if (childJson != null) {
                        logJson.children.push(childJson);
                    }
                }
            });
        }
        return logJson;
    }

    /**
     * create project json data
     * @param path_project project json file (.prj.json)
     * @return project json data
     */
    public static createProjectJson(path_project: string): SwfProjectJson {
        const projectJson: SwfProjectJson = this.readProjectJson(path_project);
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
    public static writeJson(filepath: string, json: any, callback: ((err?: Error) => void)): void {
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
    public static isLocalHost(hostname: string): boolean {
        return (hostname === 'localhost') || (hostname === '127.0.0.1');
    }

    /**
     * whether platform is windows or not
     * @return whether platform is windows or not
     */
    public static isWindows(): boolean {
        return process.platform === 'win32';
    }

    /**
     * whether platform is linux or not
     * @return whether platform is linux or not
     */
    public static isLinux(): boolean {
        return process.platform === 'linux';
    }

    /**
     * get home directory
     * @return home directory path
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
     * get template file path by type
     * @param fileType json file type
     * @return template file path by type
     */
    public static getTemplateFilePath(fileType: JsonFileType): string {
        return this.getTypeOfJson(fileType).getTemplateFilepath();
    }

    /**
     * whether specified log json or project json is finished or not
     * @param json project json data or log json data
     * @return whether specified log json or project json is finished or not
     */
    public static isProjectFinished(json: (SwfLogJson | SwfProjectJson)) {
        return json.state === this.config.state.finishd || json.state === this.config.state.failed;
    }

    /**
     * whether specified json is type of job or not
     * @param json tree json data or log json data
     * @return whether specified json is type of job or not
     */
    public static isTypeJob(json: (SwfLogJson | SwfTreeJson)) {
        const template = this.getTypeOfJson(json.type);
        return template.getType() === this.config.json_types.job;
    }

    /**
     * whether specified json is type of loop or not
     * @param json tree json data or log json data
     * @return whether specified json is type of loop or not
     */
    public static isTypeLoop(json: (SwfLogJson | SwfTreeJson)) {
        const template = this.getTypeOfJson(json.type);
        return template.getType() === this.config.json_types.loop;
    }

    /**
     * whether specified json is type of parameter study or not
     * @param json tree json data or log json data
     * @return whether specified json is type of parameter study or not
     */
    public static isTypePStudy(json: (SwfLogJson | SwfTreeJson)) {
        const template = this.getTypeOfJson(json.type);
        return template.getType() === this.config.json_types.pstudy;
    }

    /**
     * get default default file name by type
     * @param fileType filetype or file type string
     * @return default default file name by type
     */
    public static getDefaultName(fileType: (string | JsonFileType)): string {
        const template = this.getTypeOfJson(fileType);
        const extension = template.getExtension();
        return `${this.config.default_filename}${extension}`;
    }

    /**
     * get instane by type
     * @param fileType filetype or file type string
     * @return instance by type
     */
    private static getTypeOfJson(fileType: (string | JsonFileType)): TypeBase {
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
    }
}

/**
 * type base
 */
class TypeBase {
    /**
     * config date
     */
    protected config = ServerConfig.getConfig();
    /**
     * file extension name
     */
    protected extension: string;
    /**
     * template file path
     */
    protected templateFilepath: string;
    /**
     * file type string
     */
    protected type: string;
    /**
     * get file extension name
     * @return file extension name
     */
    public getExtension(): string {
        return this.extension;
    }
    /**
     * get template file path
     * @return template file path
     */
    public getTemplateFilepath(): string {
        return path.normalize(`${__dirname}/${this.templateFilepath}`);
    }
    /**
     * get file type
     * @return file type
     */
    public getType(): string {
        return this.type;
    }
}
/**
 * type project
 */
class TypeProject extends TypeBase {
    /**
     * create new instance
     */
    public constructor() {
        super();
        this.extension = this.config.extension.project;
        this.templateFilepath = this.config.template.project;
    }
}
/**
 * type task
 */
class TypeTask extends TypeBase {
    /**
     * create new instance
     */
    public constructor() {
        super();
        this.extension = this.config.extension.task;
        this.templateFilepath = this.config.template.task;
        this.type = this.config.json_types.task;
    }
}
/**
 * type workflow
 */
class TypeWorkflow extends TypeBase {
    /**
     * create new instance
     */
    public constructor() {
        super();
        this.extension = this.config.extension.workflow;
        this.templateFilepath = this.config.template.workflow;
        this.type = this.config.json_types.workflow;
    }
}
class TypeLoop extends TypeBase {
    /**
     * create new instance
     */
    public constructor() {
        super();
        this.extension = this.config.extension.loop;
        this.templateFilepath = this.config.template.loop;
        this.type = this.config.json_types.loop;
    }
}
/**
 * type if
 */
class TypeIf extends TypeBase {
    /**
     * create new instance
     */
    public constructor() {
        super();
        this.extension = this.config.extension.if;
        this.templateFilepath = this.config.template.if;
        this.type = this.config.json_types.if;
    }
}
/**
 * type else
 */
class TypeElse extends TypeBase {
    /**
     * create new instance
     */
    public constructor() {
        super();
        this.extension = this.config.extension.else;
        this.templateFilepath = this.config.template.else;
        this.type = this.config.json_types.else;
    }
}
/**
 * type break
 */
class TypeBreak extends TypeBase {
    /**
     * create new instance
     */
    public constructor() {
        super();
        this.extension = this.config.extension.break;
        this.templateFilepath = this.config.template.break;
        this.type = this.config.json_types.break;
    }
}
/**
 * type remote task
 */
class TypeRemoteTask extends TypeBase {
    /**
     * create new instance
     */
    public constructor() {
        super();
        this.extension = this.config.extension.remotetask;
        this.templateFilepath = this.config.template.remotetask;
        this.type = this.config.json_types.remotetask;
    }
}
/**
 * type job
 */
class TypeJob extends TypeBase {
    /**
     * create new instance
     */
    public constructor() {
        super();
        this.extension = this.config.extension.job;
        this.templateFilepath = this.config.template.job;
        this.type = this.config.json_types.job;
    }
}
/**
 * type condition
 */
class TypeCondition extends TypeBase {
    /**
     * create new instance
     */
    public constructor() {
        super();
        this.extension = this.config.extension.condition;
        this.templateFilepath = this.config.template.condition;
        this.type = this.config.json_types.condition;
    }
}
/**
 * type parameter study
 */
class TypePStudy extends TypeBase {
    /**
     * create new instance
     */
    public constructor() {
        super();
        this.extension = this.config.extension.pstudy;
        this.templateFilepath = this.config.template.pstudy;
        this.type = this.config.json_types.pstudy;
    }
}
export = ServerUtility;