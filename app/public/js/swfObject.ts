/**
 * Swf File definition
 */
class SwfFile implements SwfFileJson {
    public name: string;
    public description: string;
    public path: string;
    public type: string;
    public required: boolean;
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
    public toString(): string {
        return this.name;
    }
    public getPath(): string {
        return ClientUtility.normalize(this.path);
    }
    public clone(): SwfFile {
        return new SwfFile(this);
    }
    public set(file: SwfFile): void {
        this.name = file.name;
        this.description = file.description;
        this.path = file.path;
        this.type = file.type;
        this.required = file.required;
    }
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
}

/**
 * Swf Task definition
 */
class SwfTask implements SwfTaskJson {
    public name: string;
    public description: string;
    public path: string;
    public type: string;
    public clean_up: boolean;
    public max_size_receive_file: number;
    public script: SwfFile;
    public input_files: SwfFile[];
    public output_files: SwfFile[];
    public send_files: SwfFile[];
    public receive_files: SwfFile[];
    public constructor(swfTask: (SwfTask | SwfTaskJson)) {
        this.name = swfTask.name;
        this.description = swfTask.description;
        this.path = swfTask.path.replace(/[\\/]/g, '/');
        this.type = swfTask.type;
        this.script = swfTask.script == null ? null : new SwfFile(swfTask.script);
        this.input_files = JSON.parse(JSON.stringify(swfTask.input_files)).map(file => new SwfFile(file));
        this.output_files = JSON.parse(JSON.stringify(swfTask.output_files)).map(file => new SwfFile(file));
        this.send_files = JSON.parse(JSON.stringify(swfTask.send_files)).map(file => new SwfFile(file));
        this.receive_files = JSON.parse(JSON.stringify(swfTask.receive_files)).map(file => new SwfFile(file));
        this.clean_up = swfTask.clean_up;
        this.max_size_receive_file = swfTask.max_size_receive_file;
    }

    public getInputFile(path: string): SwfFile {
        return this.input_files.filter(file => { return file.getPath() === ClientUtility.normalize(path); })[0];
    }
    public getOutputFile(path: string): SwfFile {
        return this.output_files.filter(file => { return file.getPath() === ClientUtility.normalize(path); })[0];
    }
    public getSendFile(path: string): SwfFile {
        return this.send_files.filter(file => { return file.getPath() === ClientUtility.normalize(path); })[0];
    }
    public getReceiveFile(path: string): SwfFile {
        return this.receive_files.filter(file => { return file.getPath() === ClientUtility.normalize(path); })[0];
    }
}

/**
 * Swf Relation definition
 */
class SwfRelation implements SwfRelationJson {
    public index_before_task: number;
    public index_after_task: number;
    public constructor(swfRelation: (SwfRelation | SwfRelationJson)) {
        this.index_before_task = swfRelation.index_before_task;
        this.index_after_task = swfRelation.index_after_task;
    }

    public toString(): string {
        return `${this.index_before_task}_${this.index_after_task}`;
    }
}

/**
 * Swf Relation files definition
 */
class SwfRelationFile implements SwfFileRelationJson {
    public index_before_task: number;
    public path_output_file: string;
    public index_after_task: number;
    public path_input_file: string;

    public constructor(swfRelation: (SwfRelationFile | SwfFileRelationJson)) {
        this.index_before_task = swfRelation.index_before_task;
        this.path_output_file = swfRelation.path_output_file;
        this.index_after_task = swfRelation.index_after_task;
        this.path_input_file = swfRelation.path_input_file;
    }
    public getOutputFileName(): string {
        return `${this.index_before_task}_${ClientUtility.normalize(this.path_output_file)}`;
    }
    public getInputFileName(): string {
        return `${this.index_after_task}_${ClientUtility.normalize(this.path_input_file)}`;
    }
    public toString(): string {
        return `${this.getOutputFileName()}_${this.getInputFileName()}`;
    }
}

// /**
//  * Swf File Relation definition
//  */
// class SwfFileRelation extends SwfRelation implements SwfFileRelationJson {
//     relations_file: Array<SwfRelationFiles>;
// }

/**
 * Swf Workflow definition
 */
class SwfWorkflow extends SwfTask implements SwfWorkflowJson {
    public children_file: SwfFile[] = [];
    public relations: SwfRelation[] = [];
    public file_relations: SwfRelationFile[] = [];
    public positions: Position2D[] = [];
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
    public isExistDuplicateInputFilePath(path: string): boolean {
        const counter = this.inputFilePathCount(path);
        return counter > 1;
    }
    public isExistDuplicateOutputFilePath(path: string): boolean {
        const counter = this.outputFilePathCount(path);
        return counter > 1;
    }
}

class SwfLoop extends SwfWorkflow implements SwfLoopJson {
    public forParam: ForParam = {
        start: undefined,
        end: undefined,
        step: undefined
    };
    public constructor(swfLoop: (SwfLoop | SwfLoopJson)) {
        super(swfLoop);
        if (swfLoop.forParam != null) {
            this.forParam.start = swfLoop.forParam.start;
            this.forParam.end = swfLoop.forParam.end;
            this.forParam.step = swfLoop.forParam.step;
        }
    }
}

/**
 * Swf Host definition
 */
class SwfHost implements SwfHostJson {
    public name: string;
    public description: string;
    public path: string;
    public host: string;
    public job_scheduler: string;
    public username: string;
    public privateKey?: string;
    public constructor(host: (SwfHost | SwfHostJson)) {
        Object.keys(host).forEach(key => {
            this[key] = host[key];
        });
    }
}

/**
 * Swf Remote Task definition
 */
class SwfRemoteTask extends SwfTask implements SwfRemoteTaskJson {
    host: SwfHost;
}

/**
 * Swf Job definition
 */
class SwfJob extends SwfRemoteTask implements SwfJobJson {
    job_script: SwfBashScript;
}

/**
 * Swf Bash Script definition
 */
class SwfBashScript extends SwfFile {
}

/**
 * Swf Lua Script definition
 */
class SwfLuaScript extends SwfFile {
}

/**
 *
 */
class SwfLog implements SwfLogJson {
    public name: string;
    public description: string;
    public type: string;
    /**
     *
     */
    public state: string;
    /**
     *
     */
    public execution_start_date: string;
    /**
     *
     */
    public execution_end_date: string;
    /**
     *
     */
    public host?: SwfHostJson;


    private static root: SwfLog;
    public children: SwfLog[] = [];
    public path: string;
    private indexes: number[] = [];

    /**
     *
     * @param logJson
     * @param hierarchy
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

        if (logJson.children) {
            const children = JSON.parse(JSON.stringify(logJson.children));
            this.children = children.map(child => new SwfLog(child));
        }

        if (logJson.host) {
            this.host = JSON.parse(JSON.stringify(logJson.host));
        }
    }

    /**
     *
     */
    public getIndexString(): string {
        return this.indexes.join('_');
    }

    /**
     *
     * @param logJson
     */
    public static create(logJson: (SwfLog | SwfLogJson)): SwfLog {
        this.root = new SwfLog(logJson);
        return this.renumberingIndex(this.root);
    }

    /**
     *
     * @param log
     * @param indexes
     */
    private static renumberingIndex(log: SwfLog, indexes: number[] = [0]): SwfLog {
        log.indexes = indexes;
        log.children.forEach((child, index) => {
            const newIndexes: number[] = JSON.parse(JSON.stringify(indexes));
            newIndexes.push(index);
            this.renumberingIndex(child, newIndexes);
        });
        return log;
    }

    /**
     *
     * @param index
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
    }

    /**
     *
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
     *
     */
    public getHierarchy(): number {
        return this.indexes.length - 1;
    }

    /**
     *
     */
    public static getHostList(): SwfHostJson[] {
        const hash = {};
        const notSeachedList: SwfLog[] = [this.root];
        while (true) {
            const log = notSeachedList.shift();
            if (!log) {
                break;
            }
            if (log.host && !ClientUtility.isLocalHost(log.host.host)) {
                hash[log.host.name] = log.host;
            }
            log.children.forEach(child => {
                notSeachedList.push(child);
            });
        }
        return Object.keys(hash).map(key => hash[key]);
    }
}

class SwfProject implements SwfProjectJson {
    name: string;
    description: string;
    state: string;
    path: string;
    path_workflow: string;
    log: SwfLog;
}
