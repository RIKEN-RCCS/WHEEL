import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import serverConfig = require('./serverConfig');

/**
 * json file type
 */
enum JsonFileType {
    Project,
    WorkFlow,
    Task,
    RemoteTask,
    Job,
    Loop,
    If,
    Else,
    Condition,
    Break,
    PStudy
}

/**
 * Utility for server
 */
class ServerUtility {
    public static copyFile(path_src, path_dst) {
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
        fs.createReadStream(path_src).pipe(fs.createWriteStream(path_dst_file));
    }

    public static copyFolder(path_src, path_dst) {
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
     *
     * @param src_path path of source file
     * @param dst_path path of destination file
     * @param values to replace set of key and value
     * @returns none
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
     *
     * @param src_path
     * @param dst_path
     * @param values
     * @param callback
     */
    public static writeFileKeywordReplacedAsync(src_path: string, dst_path: string, values: { [key: string]: string }, callback: Function) {
        fs.readFile(src_path, (err, data) => {
            if (err) {
                logger.error(err);
                return;
            }

            let text: string = data.toString();
            Object.keys(values).forEach(key => {
                text = text.replace(key, String(values[key]));
            });

            fs.writeFile(dst_path, text, (err) => {
                if (err) {
                    logger.error(err);
                    return;
                }
                callback();
            });
        });
    }

    /**
     * config parameter
     */
    private static config = serverConfig.getConfig();

    /**
     * get all host infomation
     * @param isSucceed execute callback function when process is succeed
     * @param ifError exexute callback function when process is failed
     * @returns none
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
     * @param isSucceed execute callback function when process is succeed
     * @param ifError exexute callback function when process is failed
     * @returns none
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
     * @param isSucceed execute callback function when process is succeed
     * @param ifError exexute callback function when process is failed
     * @returns none
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
     *
     */
    public static getHostListPath(): string {
        return path.join(__dirname, this.config.remotehost);
    }

    /**
     *
     */
    public static readTemplateProjectJson(): SwfProjectJson {
        const filepath = this.getTemplateFilePath(JsonFileType.Project);
        return this.readProjectJson(filepath);
    }

    /**
     *
     */
    public static readTemplateWorkflowJson(): SwfWorkflowJson {
        const filepath = this.getTemplateFilePath(JsonFileType.WorkFlow);
        return this.readJson(filepath);
    }

    /**
     * read .prj.json file tree
     * @param filepath project json file (.proj.json file)
     * @return swf project json
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
     *
     * @param filepath
     * @param state
     * @param callback
     */
    public static updateProjectJsonState(filepath: string, state: string, isSucceed?: Function, ifError?: Function) {
        fs.readFile(filepath, (err, data) => {
            if (err) {
                logger.error(err);
                if (ifError) {
                    ifError();
                }
                return
            }
            const project: SwfProjectJson = JSON.parse(data.toString());
            project.state = state;
            fs.writeFile(filepath, JSON.stringify(project, null, '\t'), (err) => {
                if (err) {
                    logger.error(err);
                    if (ifError) {
                        ifError();
                    }
                    return;
                }
                if (isSucceed) {
                    isSucceed(project);
                }
            });
        });
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
            state: 'Planning',
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
     * read .wf.json file tree
     * @param path_project project json file (.prj.json)
     * @return project json file
     */
    public static createProjectJson(path_project: string): SwfProjectJson {
        const projectJson: SwfProjectJson = this.readProjectJson(path_project);
        const dir_project = path.dirname(path_project);
        const path_workflow = path.resolve(dir_project, projectJson.path_workflow);
        projectJson.log = this.createLogJson(path_workflow);

        return projectJson;
    }

    /**
     *
     * @param filepath
     * @param json
     * @param ifSucceed
     * @param isError
     */
    public static writeJson(filepath: string, json: any, ifSucceed?: Function, isError?: Function): void {
        fs.writeFile(filepath, JSON.stringify(json, null, '\t'), (err) => {
            if (err) {
                logger.error(err);
                if (isError) {
                    isError();
                }
                return;
            }
            if (ifSucceed) {
                ifSucceed();
            }
        });
    }

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
        return process.platform === 'win32';
    }

    /**
     * whether platform is linux or not
     * @returns true(linux) or false
     */
    public static isLinux(): boolean {
        return process.platform === 'linux';
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
     *
     * @param fileType
     * @returns
     */
    public static getTemplateFilePath(fileType: JsonFileType): string {
        return this.getTemplate(fileType).getPath();
    }

    /**
     *
     * @param filepath
     * @param fileType
     */
    public static getTemplateFile(filepath: string, fileType: JsonFileType): string {
        const extension: string = this.getTemplate(fileType).getExtension();
        if (!filepath.match(new RegExp(`${extension.replace(/\./, '\.')}$`))) {
            filepath += extension;
        }
        return filepath;
    }

    /**
     *
     * @param json
     */
    public static IsTypeJob(json: SwfTreeJson) {
        const template = this.getTemplate(json.type);
        return template.getType() === this.config.json_types.job;
    }

    /**
     *
     * @param fileType
     */
    public static getDefaultName(fileType: (string | JsonFileType)): string {
        const template = this.getTemplate(fileType);
        const extension = template.getExtension();
        return `${this.config.default_filename}${extension}`;
    }

    /**
     *
     * @param fileType
     */
    private static getTemplate(fileType: (string | JsonFileType)): TemplateBase {
        if (typeof fileType === 'string') {
            switch (fileType) {
                case this.config.json_types.workflow:
                    return new WorkflowTemplate();
                case this.config.json_types.task:
                    return new TaskTemplate();
                case this.config.json_types.loop:
                    return new LoopTemplate();
                case this.config.json_types.if:
                    return new IfTemplate();
                case this.config.json_types.else:
                    return new ElseTemplate();
                case this.config.json_types.break:
                    return new BreakTemplate();
                case this.config.json_types.remotetask:
                    return new RemoteTaskTemplate();
                case this.config.json_types.job:
                    return new JobTemplate();
                case this.config.json_types.condition:
                    return new ConditionTemplate();
                case this.config.json_types.pstudy:
                    return new PStudyTemplate();
                default:
                    throw new TypeError('file type is undefined');
            }
        }
        else {
            switch (fileType) {
                case JsonFileType.Project:
                    return new ProjectTemplate();
                case JsonFileType.WorkFlow:
                    return new WorkflowTemplate();
                case JsonFileType.Task:
                    return new TaskTemplate();
                case JsonFileType.Loop:
                    return new LoopTemplate();
                case JsonFileType.If:
                    return new IfTemplate();
                case JsonFileType.Else:
                    return new ElseTemplate();
                case JsonFileType.Break:
                    return new BreakTemplate();
                case JsonFileType.RemoteTask:
                    return new RemoteTaskTemplate();
                case JsonFileType.Job:
                    return new JobTemplate();
                case JsonFileType.Condition:
                    return new ConditionTemplate();
                case JsonFileType.PStudy:
                    return new PStudyTemplate();
                default:
                    throw new TypeError('file type is undefined');
            }
        }
    }
}

class TemplateBase {
    protected config = serverConfig.getConfig();
    protected extension: string;
    protected path: string;
    protected type: string;
    public getExtension(): string {
        return this.extension;
    }
    public getPath(): string {
        return path.normalize(`${__dirname}/${this.path}`);
    }
    public getType(): string {
        return this.type;
    }
}
class ProjectTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.project;
        this.path = this.config.template.project;
    }
}
class TaskTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.task;
        this.path = this.config.template.task;
        this.type = this.config.json_types.task;
    }
}
class WorkflowTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.workflow;
        this.path = this.config.template.workflow;
        this.type = this.config.json_types.workflow;
    }
}
class LoopTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.loop;
        this.path = this.config.template.loop;
        this.type = this.config.json_types.loop;
    }
}
class IfTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.if;
        this.path = this.config.template.if;
        this.type = this.config.json_types.if;
    }
}
class ElseTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.else;
        this.path = this.config.template.else;
        this.type = this.config.json_types.else;
    }
}
class BreakTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.break;
        this.path = this.config.template.break;
        this.type = this.config.json_types.break;
    }
}
class RemoteTaskTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.remotetask;
        this.path = this.config.template.remotetask;
        this.type = this.config.json_types.remotetask;
    }
}
class JobTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.job;
        this.path = this.config.template.job;
        this.type = this.config.json_types.job;
    }
}
class ConditionTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.condition;
        this.path = this.config.template.condition;
        this.type = this.config.json_types.condition;
    }
}
class PStudyTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.pstudy;
        this.path = this.config.template.pstudy;
        this.type = this.config.json_types.pstudy;
    }
}
export = ServerUtility;