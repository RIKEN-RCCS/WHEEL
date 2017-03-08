import fs = require('fs');
import path = require('path');
import logger = require('./logger');
import serverConfig = require('./serverConfig');

interface SucceedCallback {
    (hostList: SwfHostJson[]): void;
}

interface FailedCallback {
    (): void;
}

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
    Break
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
        fs.linkSync(path_src, path_dst_file);
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
     * config parameter
     */
    private static config = serverConfig.getConfig();

    /**
     * get all host infomation
     * @param isSucceed execute callback function when process is succeed
     * @param ifError exexute callback function when process is failed
     * @returns none
     */
    public static getHostInfo(ifSucceed: SucceedCallback, ifError: FailedCallback) {
        fs.readFile(ServerUtility.getHostListPath(), (err, data) => {
            if (err) {
                logger.error(err);
                ifError();
                return;
            }

            try {
                const hostListJson: SwfHostJson[] = JSON.parse(data.toString());
                ifSucceed(hostListJson);
            }
            catch (error) {
                logger.error(error);
                ifError();
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
    public static deleteHostInfo(name: string, ifSucceed: SucceedCallback, ifError: FailedCallback) {
        this.getHostInfo(
            (remoteHostList: SwfHostJson[]) => {
                remoteHostList = remoteHostList.filter(host => host.name != name);
                const writeData = JSON.stringify(remoteHostList, null, '\t');
                fs.writeFile(ServerUtility.getHostListPath(), writeData, (err) => {
                    if (err) {
                        logger.error(err);
                        ifError();
                    }
                    else {
                        ifSucceed(remoteHostList);
                    }
                });
            },
            ifError);
    }

    /**
     * add host information
     * @param addHostInfo add host information
     * @param isSucceed execute callback function when process is succeed
     * @param ifError exexute callback function when process is failed
     * @returns none
     */
    public static addHostInfo(addHostInfo: SwfHostJson, ifSucceed: SucceedCallback, ifError: FailedCallback) {

        this.getHostInfo(
            (remoteHostList: SwfHostJson[]) => {
                remoteHostList = remoteHostList.filter(host => host.name !== addHostInfo.name);
                remoteHostList.push(addHostInfo);
                const writeData = JSON.stringify(remoteHostList, null, '\t');
                fs.writeFile(ServerUtility.getHostListPath(), writeData, (err) => {
                    if (err) {
                        logger.error(err);
                        ifError();
                    }
                    else {
                        ifSucceed(remoteHostList);
                    }
                });
            },
            ifError);
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
        return this.readWorkflowJson(filepath);
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
     * read .wf.json file tree
     * @param path_task_file task json file (.wf.json or .tsk.json file or .lp.json)
     * @return swf task json
     */
    public static readWorkflowJson(filepath: string): SwfWorkflowJson {

        const data = fs.readFileSync(filepath);
        const json: SwfWorkflowJson = JSON.parse(data.toString());
        // if (json.type && json.type.match(/^(?:Task|Workflow)$/)) {
        return json;
        // }

        // logger.error(`file extension is not type of json`);
        // return null;
    }

    /**
     * read .wf.json file tree
     * @param workflowJsonFilepath task json file (.wf.json or .tsk.json file)
     * @return task json file
     */
    public static createTreeJson(workflowJsonFilepath: string): SwfTreeJson {

        const parent = <SwfTreeJson>this.readWorkflowJson(workflowJsonFilepath);
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

        const workflowJson: SwfWorkflowJson = this.readWorkflowJson(path_taskFile);

        const logJson: SwfLogJson = {
            name: workflowJson.name,
            path: path.dirname(path_taskFile),
            description: workflowJson.description,
            type: workflowJson.type,
            state: 'Planning',
            execution_start_date: '',
            execution_end_date: '',
            children: []
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
                case  this.config.json_types.workflow:
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
    public getExtension(): string {
        return this.extension;
    }
    public getPath(): string {
        return path.normalize(`${__dirname}/${this.path}`);
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
    }
}
class WorkflowTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.workflow;
        this.path = this.config.template.workflow;
    }
}
class LoopTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.loop;
        this.path = this.config.template.loop;
    }
}
class IfTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.if;
        this.path = this.config.template.if;
    }
}
class ElseTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.else;
        this.path = this.config.template.else;
    }
}
class BreakTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.break;
        this.path = this.config.template.break;
    }
}
class RemoteTaskTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.remotetask;
        this.path = this.config.template.remotetask;
    }
}
class JobTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.job;
        this.path = this.config.template.job;
    }
}
class ConditionTemplate extends TemplateBase {
    public constructor() {
        super();
        this.extension = this.config.extension.condition;
        this.path = this.config.template.condition;
    }
}
export = ServerUtility;