/**
 * Swf File definition
 */
class SwfFile {
    /**
     * create new instance
     * @param swfFile swf file data
     */
    constructor(swfFile) {
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
    toString() {
        return this.name;
    }
    /**
     * get normalized path
     * @return get normalized path
     */
    getNormalPath() {
        return ClientUtility.normalize(this.path);
    }
    /**
     * clone this SwfFile instance
     */
    clone() {
        return new SwfFile(this);
    }
    /**
     * set SwfFile data
     * @param file SwfFile instance
     */
    set(file) {
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
    static getDefault() {
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
    renamePath(tree, oldDirectory, newDirectory) {
        const oldFullpath = tree.getFullpath(this);
        const newFullpath = oldFullpath.replace(oldDirectory, newDirectory);
        this.path = tree.getRelativePath(newFullpath);
    }
}
/**
 * Swf Task definition
 */
class SwfTask {
    /**
     * create new instance
     * @param swfTask task json data
     */
    constructor(swfTask) {
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
    getInputFile(path) {
        return this.input_files.filter(file => { return file.getNormalPath() === ClientUtility.normalize(path); })[0];
    }
    /**
     * get the file with the same output file path name as the specified path name
     * @param path path name
     * @returns get the file with the same output file path name as the specified path name
     */
    getOutputFile(path) {
        return this.output_files.filter(file => { return file.getNormalPath() === ClientUtility.normalize(path); })[0];
    }
}
/**
 * Swf Remote Task definition
 */
class SwfRemoteTask extends SwfTask {
}
/**
 * Swf Relation definition
 */
class SwfRelation {
    /**
     * create new instance
     * @param object befor task index or relation data
     * @param index_after_task after task index
     */
    constructor(object, index_after_task) {
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
    toString() {
        return `${this.index_before_task}_${this.index_after_task}`;
    }
}
/**
 * Swf Relation files definition
 */
class SwfRelationFile {
    /**
     * create new instance
     * @param swfRelation relation data
     */
    constructor(swfRelation) {
        this.index_before_task = swfRelation.index_before_task;
        this.path_output_file = swfRelation.path_output_file;
        this.index_after_task = swfRelation.index_after_task;
        this.path_input_file = swfRelation.path_input_file;
    }
    /**
     * get input file name
     * @return input file name
     */
    getOutputFileName() {
        return `${this.index_before_task}_${ClientUtility.normalize(this.path_output_file)}`;
    }
    /**
     * get output file name
     * @return output file name
     */
    getInputFileName() {
        return `${this.index_after_task}_${ClientUtility.normalize(this.path_input_file)}`;
    }
    /**
     * get class string
     * @return class string
     */
    toString() {
        return `${this.getOutputFileName()}_${this.getInputFileName()}`;
    }
    /**
     * rename output file path
     * @param tree tree instance
     * @param oldDirectory old directory name
     * @param newDirectory new directory name
     */
    renameOutputPath(tree, oldDirectory, newDirectory) {
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
    renameInputPath(tree, oldDirectory, newDirectory) {
        const oldFullpath = tree.getFullpath(this.path_input_file);
        const newFullpath = oldFullpath.replace(oldDirectory, newDirectory);
        this.path_input_file = tree.getRelativePath(newFullpath);
    }
}
/**
 * Swf Workflow definition
 */
class SwfWorkflow extends SwfTask {
    /**
     * create new instance
     * @param swfWorkflow workflow json data
     */
    constructor(swfWorkflow) {
        super(swfWorkflow);
        /**
         * children files
         */
        this.children_file = [];
        /**
         * task relations
         */
        this.relations = [];
        /**
         * file relations
         */
        this.file_relations = [];
        /**
         * task posistions
         */
        this.positions = [];
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
    inputFilePathCount(path) {
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
    outputFilePathCount(path) {
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
    isExistDuplicateInputFilePath(path) {
        const counter = this.inputFilePathCount(path);
        return counter > 1;
    }
    /**
     * whether output file path is duplicate or not
     * @param path check path name
     * @return whether output file path is duplicate or not
     */
    isExistDuplicateOutputFilePath(path) {
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
class SwfHost {
    /**
     * create new instance
     * @param host host json data
     */
    constructor(host) {
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
class SwfLog {
    /**
     * create new instance
     * @param logJson log json data
     */
    constructor(logJson) {
        /**
         * indexes are local task index array from root log
         */
        this.indexes = [];
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
    getIndexString() {
        return this.indexes.join('_');
    }
    /**
     * get hierarchy number
     * @return hierarchy number
     */
    getHierarchy() {
        return this.indexes.length - 1;
    }
    /**
     * create SwfLog instance
     * @param logJson logJson
     * @return SwfLog instance
     */
    static create(logJson) {
        this.root = new SwfLog(logJson);
        this.renumberingIndex(this.root);
        return this.root;
    }
    /**
     * renumbering index
     * @param log SwfLog instance
     * @param indexes parent index array
     */
    static renumberingIndex(log, indexes = [0]) {
        log.indexes = indexes;
        log.children.forEach((child, index) => {
            const newIndexes = JSON.parse(JSON.stringify(indexes));
            newIndexes.push(index);
            this.renumberingIndex(child, newIndexes);
        });
    }
    /**
     * get SwfLog instance
     * @param index index string (ex '0_1_0')
     * @return SwfLog instance
     */
    static getSwfLogInstance(index) {
        const notSeachedList = [this.root];
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
    static getMaxHierarchy() {
        let max = 0;
        const notSeachedList = [this.root];
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
    static getHostList() {
        const hash = {};
        const notSeachedList = [this.root];
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
    isPlanning() {
        return SwfState.isPlanning(this);
    }
    /**
     * whether this task is finished or not
     * @return whether this task is finished or not
     */
    isFinished() {
        return SwfState.isFinished(this);
    }
    /**
     * whether this task is running or not
     * @return whether this task is running or not
     */
    isRunning() {
        return !this.isFinished() && !this.isPlanning();
    }
}
/**
 * project json class
 */
class SwfProject {
    /**
     * create project class instance
     * @param projectJson project json
     */
    constructor(projectJson) {
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
    isPlanning() {
        return SwfState.isPlanning(this);
    }
    /**
     * whether project is finished or not
     * @return whether project is finished or not
     */
    isFinished() {
        return SwfState.isFinished(this);
    }
    /**
     * whether project is running or not
     * @return whether project is running or not
     */
    isRunning() {
        return !this.isFinished() && !this.isPlanning();
    }
    /**
     * get progress rate
     * @return progress rate
     */
    getProgressRate() {
        let finishedCount = 0;
        let runningCount = 0;
        let planningCount = 0;
        function getFinishedCount(log) {
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
        (function getStateCount(log) {
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
//# sourceMappingURL=swfObject.js.map