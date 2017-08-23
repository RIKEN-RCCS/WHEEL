/**
 * Swf File definition
 */
class SwfFile implements SwfFileJson {
    /**
     * file name
     */
    public name: string;
    /**
     * file description
     */
    public description: string;
    /**
     * file path
     */
    public path: string;
    /**
     * file type
     */
    public type: string;
    /**
     * file required flag
     */
    public required: boolean;

    /**
     * create new instance
     * @param swfFile swf file data
     */
    public constructor(swfFile: (SwfFile | SwfFileJson)) {
        if (swfFile == null) {
            throw new TypeError('parameter is null');
        }
        this.name = swfFile.name;
        this.description = swfFile.description;
        this.path = swfFile.path;
        this.type = swfFile.type;
        this.required = swfFile.required;
    }

    /**
     * get this instance name
     * @return this instance name
     */
    public toString(): string {
        return this.name;
    }

    /**
     * get normalized path
     * @return get normalized path
     */
    public getNormalPath(): string {
        return ClientUtility.normalize(this.path);
    }

    /**
     * clone this SwfFile instance
     */
    public clone(): SwfFile {
        return new SwfFile(this);
    }

    /**
     * set SwfFile data
     * @param file SwfFile instance
     */
    public set(file: SwfFile): void {
        this.name = file.name;
        this.description = file.description;
        this.path = file.path;
        this.type = file.type;
        this.required = file.required;
    }

    /**
     * get default setting SwfFile instance
     * @return default setting SwfFile instance
     */
    public static getDefault(): SwfFile {
        const rand = Math.floor(Date.now() / 100) % 100000;
        const filename = `File${`00000${rand}`.slice(-5)}`;
        return new SwfFile({
            name: 'name',
            description: '',
            path: `./${filename}`,
            type: 'file',
            required: true
        });
    }

    /**
     * rename file path
     * @param tree tree instance
     * @param oldDirectory old directory name
     * @param newDirectory new directory name
     */
    public renamePath(tree: SwfTree, oldDirectory: string, newDirectory: string) {
        const oldFullpath = tree.getFullpath(this);
        const newFullpath = oldFullpath.replace(oldDirectory, newDirectory);
        this.path = tree.getRelativePath(newFullpath);
    }
}

/**
 * Swf Task definition
 */
class SwfTask implements SwfTaskJson {
    /**
     * task name
     */
    public name: string;
    /**
     * task description
     */
    public description: string;
    /**
     * task path
     */
    public path: string;
    /**
     * type of task
     * Task, Workflow, RemoteTask, Job
     */
    public type: SwfType;
    /**
     * script file
     */
    public script: SwfFile;
    /**
     * input files
     */
    public input_files: SwfFile[];
    /**
     * output_files
     */
    public output_files: SwfFile[];
    /**
     * clean up flag
     */
    public clean_up: boolean;
    /**
     * max size of rreceive file (kb)
     */
    public max_size_receive_file: number;
    /**
     * birthday epoch
     */
    public readonly birth: number;

    /**
     * create new instance
     * @param swfTask task json data
     */
    public constructor(swfTask: (SwfTask | SwfTaskJson)) {
        this.name = swfTask.name;
        this.description = swfTask.description;
        this.path = swfTask.path.replace(/[\\/]/g, '/');
        this.type = swfTask.type;
        this.script = swfTask.script == null ? null : new SwfFile(swfTask.script);
        this.input_files = JSON.parse(JSON.stringify(swfTask.input_files)).map(file => new SwfFile(file));
        this.output_files = JSON.parse(JSON.stringify(swfTask.output_files)).map(file => new SwfFile(file));
        this.clean_up = swfTask.clean_up;
        this.max_size_receive_file = swfTask.max_size_receive_file;
        this.birth = swfTask.birth;
    }

    /**
     * get the file with the same input file path name as the specified path name
     * @param path path name
     * @returns get the file with the same input file path name as the specified path name
     */
    public getInputFile(path: string): SwfFile {
        return this.input_files.filter(file => { return file.getNormalPath() === ClientUtility.normalize(path); })[0];
    }
    /**
     * get the file with the same output file path name as the specified path name
     * @param path path name
     * @returns get the file with the same output file path name as the specified path name
     */
    public getOutputFile(path: string): SwfFile {
        return this.output_files.filter(file => { return file.getNormalPath() === ClientUtility.normalize(path); })[0];
    }
}

/**
 * Swf Remote Task definition
 */
class SwfRemoteTask extends SwfTask implements SwfRemoteTaskJson {
    /**
     * host information
     */
    public remote: SwfHostJson;
    /**
     * send files
     */
    public send_files: SwfFileJson[];
    /**
     * receive files
     */
    public receive_files: SwfFileJson[];
    /**
     * operated date
     */
    public timeStamp: string;
}

/**
 * Swf Relation definition
 */
class SwfRelation implements SwfRelationJson {
    /**
     * index of before task
     */
    public index_before_task: number;
    /**
     * index of after task
     */
    public index_after_task: number;
    /**
     * create new instance
     * @param index_before_task befor task index
     * @param index_after_task after task index
     */
    public constructor(index_before_task: number, index_after_task: number);
    /**
     * create new instance
     * @param swfRelation relation data
     */
    public constructor(swfRelation: (SwfRelation | SwfRelationJson));
    /**
     * create new instance
     * @param object befor task index or relation data
     * @param index_after_task after task index
     */
    public constructor(object: (SwfRelation | SwfRelationJson | number), index_after_task?: number) {
        if (typeof object === 'number') {
            this.index_before_task = object;
            this.index_after_task = index_after_task;
        }
        else {
            this.index_before_task = object.index_before_task;
            this.index_after_task = object.index_after_task;
        }
    }

    /**
     * get class string
     * @return class string
     */
    public toString(): string {
        return `${this.index_before_task}_${this.index_after_task}`;
    }
}

/**
 * Swf Relation files definition
 */
class SwfRelationFile implements SwfFileRelationJson {
    /**
     * befor task index
     */
    public index_before_task: number;
    /**
     * output file path name
     */
    public path_output_file: string;
    /**
     * after task index
     */
    public index_after_task: number;
    /**
     * input file path name
     */
    public path_input_file: string;

    /**
     * create new instance
     * @param swfRelation relation data
     */
    public constructor(swfRelation: (SwfRelationFile | SwfFileRelationJson)) {
        this.index_before_task = swfRelation.index_before_task;
        this.path_output_file = swfRelation.path_output_file;
        this.index_after_task = swfRelation.index_after_task;
        this.path_input_file = swfRelation.path_input_file;
    }
    /**
     * get input file name
     * @return input file name
     */
    public getOutputFileName(): string {
        return `${this.index_before_task}_${ClientUtility.normalize(this.path_output_file)}`;
    }
    /**
     * get output file name
     * @return output file name
     */
    public getInputFileName(): string {
        return `${this.index_after_task}_${ClientUtility.normalize(this.path_input_file)}`;
    }
    /**
     * get class string
     * @return class string
     */
    public toString(): string {
        return `${this.getOutputFileName()}_${this.getInputFileName()}`;
    }

    /**
     * rename output file path
     * @param tree tree instance
     * @param oldDirectory old directory name
     * @param newDirectory new directory name
     */
    public renameOutputPath(tree: SwfTree, oldDirectory: string, newDirectory: string) {
        const oldFullpath = tree.getFullpath(this.path_output_file);
        const newFullpath = oldFullpath.replace(oldDirectory, newDirectory);
        this.path_output_file = tree.getRelativePath(newFullpath);
    }

    /**
     * rename input file path
     * @param tree tree instance
     * @param oldDirectory old directory name
     * @param newDirectory new directory name
     */
    public renameInputPath(tree: SwfTree, oldDirectory: string, newDirectory: string) {
        const oldFullpath = tree.getFullpath(this.path_input_file);
        const newFullpath = oldFullpath.replace(oldDirectory, newDirectory);
        this.path_input_file = tree.getRelativePath(newFullpath);
    }
}

/**
 * Swf Workflow definition
 */
class SwfWorkflow extends SwfTask implements SwfWorkflowJson {
    /**
     * children files
     */
    public children_file: SwfFile[] = [];
    /**
     * task relations
     */
    public relations: SwfRelation[] = [];
    /**
     * file relations
     */
    public file_relations: SwfRelationFile[] = [];
    /**
     * task posistions
     */
    public positions: Position2D[] = [];

    /**
     * create new instance
     * @param swfWorkflow workflow json data
     */
    public constructor(swfWorkflow: (SwfWorkflow | SwfWorkflowJson)) {
        super(swfWorkflow);
        if (swfWorkflow.file_relations) {
            const relationFiles = JSON.parse(JSON.stringify(swfWorkflow.file_relations));
            this.file_relations = relationFiles.map(r => new SwfRelationFile(r));
        }
        if (swfWorkflow.children_file) {
            const files = JSON.parse(JSON.stringify(swfWorkflow.children_file));
            this.children_file = files.map(file => new SwfFile(file));
        }
        if (swfWorkflow.relations) {
            const relations = JSON.parse(JSON.stringify(swfWorkflow.relations));
            this.relations = relations.map(relation => new SwfRelation(relation));
        }
        if (swfWorkflow.positions) {
            this.positions = JSON.parse(JSON.stringify(swfWorkflow.positions));
        }
    }

    /**
     * get the number with the same input file path name as the specified path name
     * @param path path name
     * @return the number with the same input file path name as the specified path name
     */
    public inputFilePathCount(path: string): number {
        path = ClientUtility.normalize(path);
        let counter = 0;
        this.file_relations.forEach(relation => {
            if (ClientUtility.normalize(relation.path_input_file) === path) {
                counter++;
            }
        });
        return counter;
    }

    /**
     * get the number with the same output file path name as the specified path name
     * @param path path name
     * @return the number with the same input file path name as the specified path name
     */
    public outputFilePathCount(path: string): number {
        path = ClientUtility.normalize(path);
        let counter = 0;
        this.file_relations.forEach(relation => {
            if (ClientUtility.normalize(relation.path_output_file) === path) {
                counter++;
            }
        });
        return counter;
    }

    /**
     * whether input file path is duplicate or not
     * @param path check path name
     * @return whether input file path is duplicate or not
     */
    public isExistDuplicateInputFilePath(path: string): boolean {
        const counter = this.inputFilePathCount(path);
        return counter > 1;
    }

    /**
     * whether output file path is duplicate or not
     * @param path check path name
     * @return whether output file path is duplicate or not
     */
    public isExistDuplicateOutputFilePath(path: string): boolean {
        const counter = this.outputFilePathCount(path);
        return counter > 1;
    }
}

// /**
//  *
//  */
// class SwfLoop extends SwfWorkflow implements SwfLoopJson {
//     /**
//      *
//      */
//     public forParam: ForParam = {
//         start: undefined,
//         end: undefined,
//         step: undefined
//     };
//     /**
//      *
//      * @param swfLoop
//      */
//     public constructor(swfLoop: (SwfLoop | SwfLoopJson)) {
//         super(swfLoop);
//         if (swfLoop.forParam != null) {
//             this.forParam.start = swfLoop.forParam.start;
//             this.forParam.end = swfLoop.forParam.end;
//             this.forParam.step = swfLoop.forParam.step;
//         }
//     }
// }

/**
 * Swf Host definition
 */
class SwfHost implements SwfHostJson {
    /**
     * representative name
     */
    public name: string;
    /**
     * host description
     */
    public description: string;
    /**
     * host path
     */
    public path: string;
    /**
     * host name
     */
    public host: string;
    /**
     * job sheduler name
     */
    public job_scheduler: SwfJobScheduler;
    /**
     * user name
     */
    public username: string;
    /**
     * private key filepath
     */
    public privateKey?: string;
    /**
     * password or passphrase
     */
    public pass?: string;
    /**
     * create new instance
     * @param host host json data
     */
    public constructor(host: (SwfHost | SwfHostJson)) {
        Object.keys(host).forEach(key => {
            this[key] = host[key];
        });
    }
}

// /**
//  * Swf Job definition
//  */
// class SwfJob extends SwfRemoteTask implements SwfJobJson {
//     job_script: SwfBashScript;
// }

// /**
//  * Swf Bash Script definition
//  */
// class SwfBashScript extends SwfFile {
// }

// /**
//  * Swf Lua Script definition
//  */
// class SwfLuaScript extends SwfFile {
// }

/**
 * log json class
 */
class SwfLog implements SwfLogJson {
    /**
     * log name
     */
    public name: string;
    /**
     * log description
     */
    public description: string;
    /**
     * task state ('Planing', 'Running', 'ReRunning', 'Waiting', 'Completed', 'Failed')
     */
    public state: SwfState;
    /**
     * path to directory of task
     */
    public path: string;
    /**
     * type ('Task', 'Workflow', 'RemoteTask', 'Job', 'If', 'Else', 'Condition', 'Loop', 'Break')
     */
    public type: SwfType;
    /**
     * start date of execute task
     */
    public execution_start_date: string;
    /**
     * end date of execute task
     */
    public execution_end_date: string;
    /**
     * host information
     */
    public remote?: SwfHost;
    /**
     * display order
     */
    public order?: number;
    /**
     * child logs
     */
    public children: SwfLog[]
    /**
     * indexes are local task index array from root log
     */
    private indexes: number[] = [];
    /**
     * root log instance
     */
    private static root: SwfLog;

    /**
     * create new instance
     * @param logJson log json data
     */
    private constructor(logJson: (SwfLog | SwfLogJson)) {
        this.name = logJson.name;
        this.path = logJson.path;
        this.description = logJson.description;
        this.type = logJson.type;
        this.state = logJson.state;
        this.execution_start_date = logJson.execution_start_date;
        this.execution_end_date = logJson.execution_end_date;
        this.path = logJson.path;
        this.order = logJson.order;

        if (logJson.children) {
            const children = JSON.parse(JSON.stringify(logJson.children));
            this.children = children.map(child => new SwfLog(child));
        }

        if (logJson.remote) {
            this.remote = JSON.parse(JSON.stringify(logJson.remote));
        }
    }

    /**
     * get index string
     * @return index string
     */
    public getIndexString(): string {
        return this.indexes.join('_');
    }

    /**
     * get hierarchy number
     * @return hierarchy number
     */
    public getHierarchy(): number {
        return this.indexes.length - 1;
    }

    /**
     * create SwfLog instance
     * @param logJson logJson
     * @return SwfLog instance
     */
    public static create(logJson: (SwfLog | SwfLogJson)): SwfLog {
        this.root = new SwfLog(logJson);
        this.renumberingIndex(this.root);
        return this.root;
    }

    /**
     * renumbering index
     * @param log SwfLog instance
     * @param indexes parent index array
     */
    private static renumberingIndex(log: SwfLog, indexes: number[] = [0]) {
        log.indexes = indexes;
        log.children.forEach((child, index) => {
            const newIndexes: number[] = JSON.parse(JSON.stringify(indexes));
            newIndexes.push(index);
            this.renumberingIndex(child, newIndexes);
        });
    }

    /**
     * get SwfLog instance
     * @param index index string (ex '0_1_0')
     * @return SwfLog instance
     */
    public static getSwfLogInstance(index: string): SwfLog {
        const notSeachedList: SwfLog[] = [this.root];
        while (true) {
            const log = notSeachedList.shift();
            if (!log) {
                break;
            }

            if (log.getIndexString() === index) {
                return log;
            }
            log.children.forEach(child => {
                notSeachedList.push(child);
            });
        }
        return null;
    }

    /**
     * get max hierarchy number
     * @return max hierarchy number
     */
    public static getMaxHierarchy(): number {
        let max: number = 0;
        const notSeachedList: SwfLog[] = [this.root];
        while (true) {
            const tree = notSeachedList.shift();
            if (!tree) {
                break;
            }

            max = Math.max(max, tree.getHierarchy());
            tree.children.forEach(child => {
                notSeachedList.push(child);
            });
        }
        return max;
    }

    /**
     * get used host list
     * @return used host list
     */
    public static getHostList(): SwfHostJson[] {
        const hash: { [name: string]: SwfHostJson } = {};
        const notSeachedList: SwfLog[] = [this.root];
        while (true) {
            const log = notSeachedList.shift();
            if (!log) {
                break;
            }
            if (log.remote && !ClientUtility.isLocalHost(log.remote)) {
                hash[log.remote.name] = log.remote;
            }
            log.children.forEach(child => {
                notSeachedList.push(child);
            });
        }
        return Object.keys(hash).map(key => hash[key]);
    }

    /**
     * whether this task is planning or not
     * @return whether this task is planning or not
     */
    public isPlanning(): boolean {
        return SwfState.isPlanning(this);
    }

    /**
     * whether this task is finished or not
     * @return whether this task is finished or not
     */
    public isFinished(): boolean {
        return SwfState.isFinished(this);
    }

    /**
     * whether this task is running or not
     * @return whether this task is running or not
     */
    public isRunning(): boolean {
        return !this.isFinished() && !this.isPlanning();
    }
}

/**
 * project json class
 */
class SwfProject implements SwfProjectJson {
    /**
     * project name
     */
    public name: string;
    /**
     * project description
     */
    public description: string;
    /**
     * project state
     */
    public state: SwfState;
    /**
     * project path
     */
    public path: string;
    /**
     * root workflow path
     */
    public path_workflow: string;
    /**
     * log file
     */
    public log: SwfLog;

    /**
     * create project class instance
     * @param projectJson project json
     */
    public constructor(projectJson: (SwfProject | SwfProjectJson)) {
        this.name = projectJson.name;
        this.description = projectJson.description;
        this.state = projectJson.state;
        this.path = projectJson.path;
        this.path_workflow = projectJson.path_workflow;
        this.log = SwfLog.create(projectJson.log);
    }

    /**
     * whether project is planning or not
     * @return whether project is planning or not
     */
    public isPlanning(): boolean {
        return SwfState.isPlanning(this);
    }

    /**
     * whether project is finished or not
     * @return whether project is finished or not
     */
    public isFinished(): boolean {
        return SwfState.isFinished(this);
    }

    /**
     * whether project is running or not
     * @return whether project is running or not
     */
    public isRunning(): boolean {
        return !this.isFinished() && !this.isPlanning();
    }

    /**
     * get progress rate
     * @return progress rate
     */
    public getProgressRate(): number {
        let finishedCount = 0;
        let runningCount = 0;
        let planningCount = 0;

        function getFinishedCount(log: SwfLog): number {
            let count = 0;
            const notSearchedList = [log];
            while (true) {
                const shiftLog = notSearchedList.shift();
                if (!shiftLog) {
                    break;
                }
                count++;
                shiftLog.children.forEach(child => notSearchedList.push(child));
            }
            return count;
        }

        (function getStateCount(log: SwfLog) {
            if (log.isFinished()) {
                finishedCount += getFinishedCount(log);
            }
            else if (log.isRunning()) {
                runningCount++;
                log.children.forEach(child => getStateCount(child));
            }
            else {
                planningCount++;
                log.children.forEach(child => getStateCount(child));
            }
        })(this.log);

        return (finishedCount * 2 + runningCount) * 100 / ((finishedCount + planningCount + runningCount) * 2);
    }
}
