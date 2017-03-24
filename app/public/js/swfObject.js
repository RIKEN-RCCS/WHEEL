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
/**
 * Swf File definition
 */
var SwfFile = (function () {
    /**
     * create new instance
     * @param swfFile swf file data
     */
    function SwfFile(swfFile) {
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
    SwfFile.prototype.toString = function () {
        return this.name;
    };
    /**
     * get normalized path
     * @return get normalized path
     */
    SwfFile.prototype.getNormalPath = function () {
        return ClientUtility.normalize(this.path);
    };
    /**
     * clone this SwfFile instance
     */
    SwfFile.prototype.clone = function () {
        return new SwfFile(this);
    };
    /**
     * set SwfFile data
     * @param file SwfFile instance
     */
    SwfFile.prototype.set = function (file) {
        this.name = file.name;
        this.description = file.description;
        this.path = file.path;
        this.type = file.type;
        this.required = file.required;
    };
    /**
     * get default setting SwfFile instance
     * @return default setting SwfFile instance
     */
    SwfFile.getDefault = function () {
        var rand = Math.floor(Date.now() / 100) % 100000;
        var filename = "File" + ("00000" + rand).slice(-5);
        return new SwfFile({
            name: 'name',
            description: '',
            path: "./" + filename,
            type: 'file',
            required: true
        });
    };
    return SwfFile;
}());
/**
 * Swf Task definition
 */
var SwfTask = (function () {
    /**
     *
     * @param swfTask
     */
    function SwfTask(swfTask) {
        this.name = swfTask.name;
        this.description = swfTask.description;
        this.path = swfTask.path.replace(/[\\/]/g, '/');
        this.type = swfTask.type;
        this.script = swfTask.script == null ? null : new SwfFile(swfTask.script);
        this.input_files = JSON.parse(JSON.stringify(swfTask.input_files)).map(function (file) { return new SwfFile(file); });
        this.output_files = JSON.parse(JSON.stringify(swfTask.output_files)).map(function (file) { return new SwfFile(file); });
        this.send_files = JSON.parse(JSON.stringify(swfTask.send_files)).map(function (file) { return new SwfFile(file); });
        this.receive_files = JSON.parse(JSON.stringify(swfTask.receive_files)).map(function (file) { return new SwfFile(file); });
        this.clean_up = swfTask.clean_up;
        this.max_size_receive_file = swfTask.max_size_receive_file;
    }
    /**
     * get the file with the same input file path name as the specified path name
     * @param path path name
     * @returns get the file with the same input file path name as the specified path name
     */
    SwfTask.prototype.getInputFile = function (path) {
        return this.input_files.filter(function (file) { return file.getNormalPath() === ClientUtility.normalize(path); })[0];
    };
    /**
     * get the file with the same output file path name as the specified path name
     * @param path path name
     * @returns get the file with the same output file path name as the specified path name
     */
    SwfTask.prototype.getOutputFile = function (path) {
        return this.output_files.filter(function (file) { return file.getNormalPath() === ClientUtility.normalize(path); })[0];
    };
    /**
     * get the file with the same send file path name as the specified path name
     * @param path path name
     * @returns get the file with the same send file path name as the specified path name
     */
    SwfTask.prototype.getSendFile = function (path) {
        return this.send_files.filter(function (file) { return file.getNormalPath() === ClientUtility.normalize(path); })[0];
    };
    /**
     * get the file with the same receive file path name as the specified path name
     * @param path path name
     * @returns get the file with the same receive file path name as the specified path name
     */
    SwfTask.prototype.getReceiveFile = function (path) {
        return this.receive_files.filter(function (file) { return file.getNormalPath() === ClientUtility.normalize(path); })[0];
    };
    return SwfTask;
}());
/**
 * Swf Relation definition
 */
var SwfRelation = (function () {
    /**
     * create new instance
     * @param object befor task index or relation data
     * @param index_after_task after task index
     */
    function SwfRelation(object, index_after_task) {
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
    SwfRelation.prototype.toString = function () {
        return this.index_before_task + "_" + this.index_after_task;
    };
    return SwfRelation;
}());
/**
 * Swf Relation files definition
 */
var SwfRelationFile = (function () {
    /**
     * create new instance
     * @param swfRelation relation data
     */
    function SwfRelationFile(swfRelation) {
        this.index_before_task = swfRelation.index_before_task;
        this.path_output_file = swfRelation.path_output_file;
        this.index_after_task = swfRelation.index_after_task;
        this.path_input_file = swfRelation.path_input_file;
    }
    /**
     * get input file name
     * @return input file name
     */
    SwfRelationFile.prototype.getOutputFileName = function () {
        return this.index_before_task + "_" + ClientUtility.normalize(this.path_output_file);
    };
    /**
     * get output file name
     * @return output file name
     */
    SwfRelationFile.prototype.getInputFileName = function () {
        return this.index_after_task + "_" + ClientUtility.normalize(this.path_input_file);
    };
    /**
     * get class string
     * @return class string
     */
    SwfRelationFile.prototype.toString = function () {
        return this.getOutputFileName() + "_" + this.getInputFileName();
    };
    return SwfRelationFile;
}());
/**
 * Swf Workflow definition
 */
var SwfWorkflow = (function (_super) {
    __extends(SwfWorkflow, _super);
    /**
     * create new instance
     * @param swfWorkflow workflow json data
     */
    function SwfWorkflow(swfWorkflow) {
        var _this = _super.call(this, swfWorkflow) || this;
        /**
         * children files
         */
        _this.children_file = [];
        /**
         * task relations
         */
        _this.relations = [];
        /**
         * file relations
         */
        _this.file_relations = [];
        /**
         * task posistions
         */
        _this.positions = [];
        if (swfWorkflow.file_relations) {
            var relationFiles = JSON.parse(JSON.stringify(swfWorkflow.file_relations));
            _this.file_relations = relationFiles.map(function (r) { return new SwfRelationFile(r); });
        }
        if (swfWorkflow.children_file) {
            var files = JSON.parse(JSON.stringify(swfWorkflow.children_file));
            _this.children_file = files.map(function (file) { return new SwfFile(file); });
        }
        if (swfWorkflow.relations) {
            var relations = JSON.parse(JSON.stringify(swfWorkflow.relations));
            _this.relations = relations.map(function (relation) { return new SwfRelation(relation); });
        }
        if (swfWorkflow.positions) {
            _this.positions = JSON.parse(JSON.stringify(swfWorkflow.positions));
        }
        return _this;
    }
    /**
     * get the number with the same input file path name as the specified path name
     * @param path path name
     * @return the number with the same input file path name as the specified path name
     */
    SwfWorkflow.prototype.inputFilePathCount = function (path) {
        path = ClientUtility.normalize(path);
        var counter = 0;
        this.file_relations.forEach(function (relation) {
            if (ClientUtility.normalize(relation.path_input_file) === path) {
                counter++;
            }
        });
        return counter;
    };
    /**
     * get the number with the same output file path name as the specified path name
     * @param path path name
     * @return the number with the same input file path name as the specified path name
     */
    SwfWorkflow.prototype.outputFilePathCount = function (path) {
        path = ClientUtility.normalize(path);
        var counter = 0;
        this.file_relations.forEach(function (relation) {
            if (ClientUtility.normalize(relation.path_output_file) === path) {
                counter++;
            }
        });
        return counter;
    };
    /**
     * whether input file path is duplicate or not
     * @param path check path name
     * @return whether input file path is duplicate or not
     */
    SwfWorkflow.prototype.isExistDuplicateInputFilePath = function (path) {
        var counter = this.inputFilePathCount(path);
        return counter > 1;
    };
    /**
     * whether output file path is duplicate or not
     * @param path check path name
     * @return whether output file path is duplicate or not
     */
    SwfWorkflow.prototype.isExistDuplicateOutputFilePath = function (path) {
        var counter = this.outputFilePathCount(path);
        return counter > 1;
    };
    return SwfWorkflow;
}(SwfTask));
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
var SwfHost = (function () {
    /**
     * create new instance
     * @param host host json data
     */
    function SwfHost(host) {
        var _this = this;
        Object.keys(host).forEach(function (key) {
            _this[key] = host[key];
        });
    }
    return SwfHost;
}());
// /**
//  * Swf Remote Task definition
//  */
// class SwfRemoteTask extends SwfTask implements SwfRemoteTaskJson {
//     host: SwfHost;
// }
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
var SwfLog = (function () {
    /**
     * create new instance
     * @param logJson log json data
     */
    function SwfLog(logJson) {
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
            var children = JSON.parse(JSON.stringify(logJson.children));
            this.children = children.map(function (child) { return new SwfLog(child); });
        }
        if (logJson.host) {
            this.host = JSON.parse(JSON.stringify(logJson.host));
        }
    }
    /**
     * get index string
     * @return index string
     */
    SwfLog.prototype.getIndexString = function () {
        return this.indexes.join('_');
    };
    /**
     * get hierarchy number
     * @return hierarchy number
     */
    SwfLog.prototype.getHierarchy = function () {
        return this.indexes.length - 1;
    };
    /**
     * create SwfLog instance
     * @param logJson logJson
     * @return SwfLog instance
     */
    SwfLog.create = function (logJson) {
        this.root = new SwfLog(logJson);
        this.renumberingIndex(this.root);
        return this.root;
    };
    /**
     * renumbering index
     * @param log SwfLog instance
     * @param indexes parent index array
     */
    SwfLog.renumberingIndex = function (log, indexes) {
        var _this = this;
        if (indexes === void 0) { indexes = [0]; }
        log.indexes = indexes;
        log.children.forEach(function (child, index) {
            var newIndexes = JSON.parse(JSON.stringify(indexes));
            newIndexes.push(index);
            _this.renumberingIndex(child, newIndexes);
        });
    };
    /**
     * get SwfLog instance
     * @param index index string (ex '0_1_0')
     * @return SwfLog instance
     */
    SwfLog.getSwfLogInstance = function (index) {
        var notSeachedList = [this.root];
        while (true) {
            var log = notSeachedList.shift();
            if (!log) {
                break;
            }
            if (log.getIndexString() === index) {
                return log;
            }
            log.children.forEach(function (child) {
                notSeachedList.push(child);
            });
        }
        return null;
    };
    /**
     * get max hierarchy number
     * @return max hierarchy number
     */
    SwfLog.getMaxHierarchy = function () {
        var max = 0;
        var notSeachedList = [this.root];
        while (true) {
            var tree = notSeachedList.shift();
            if (!tree) {
                break;
            }
            max = Math.max(max, tree.getHierarchy());
            tree.children.forEach(function (child) {
                notSeachedList.push(child);
            });
        }
        return max;
    };
    /**
     * get used host list
     * @return used host list
     */
    SwfLog.getHostList = function () {
        var hash = {};
        var notSeachedList = [this.root];
        while (true) {
            var log = notSeachedList.shift();
            if (!log) {
                break;
            }
            if (log.host && !ClientUtility.isLocalHost(log.host.host)) {
                hash[log.host.name] = log.host;
            }
            log.children.forEach(function (child) {
                notSeachedList.push(child);
            });
        }
        return Object.keys(hash).map(function (key) { return hash[key]; });
    };
    /**
     * whether this task is planning or not
     * @return whether this task is planning or not
     */
    SwfLog.prototype.isPlanning = function () {
        return this.state === config.state.planning;
    };
    /**
     * whether this task is finished or not
     * @return whether this task is finished or not
     */
    SwfLog.prototype.isFinished = function () {
        var state = config.state;
        return this.state === state.completed || this.state === state.failed;
    };
    /**
     * whether this task is running or not
     * @return whether this task is running or not
     */
    SwfLog.prototype.isRunning = function () {
        return !this.isFinished() && !this.isPlanning();
    };
    return SwfLog;
}());
/**
 * project json class
 */
var SwfProject = (function () {
    /**
     * create project class instance
     * @param projectJson project json
     */
    function SwfProject(projectJson) {
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
    SwfProject.prototype.isPlanning = function () {
        return this.state === config.state.planning;
    };
    /**
     * whether project is finished or not
     * @return whether project is finished or not
     */
    SwfProject.prototype.isFinished = function () {
        var state = config.state;
        return this.state === state.completed || this.state === state.failed;
    };
    /**
     * whether project is running or not
     * @return whether project is running or not
     */
    SwfProject.prototype.isRunning = function () {
        return !this.isFinished() && !this.isPlanning();
    };
    /**
     * get progress rate
     * @return progress rate
     */
    SwfProject.prototype.getProgressRate = function () {
        var finishedCount = 0;
        var runningCount = 0;
        var planningCount = 0;
        function getFinishedCount(log) {
            var count = 0;
            var notSearchedList = [log];
            while (true) {
                var shiftLog = notSearchedList.shift();
                if (!shiftLog) {
                    break;
                }
                count++;
                shiftLog.children.forEach(function (child) { return notSearchedList.push(child); });
            }
            return count;
        }
        (function getStateCount(log) {
            if (log.isFinished()) {
                finishedCount += getFinishedCount(log);
            }
            else if (log.isRunning()) {
                runningCount++;
                log.children.forEach(function (child) { return getStateCount(child); });
            }
            else {
                planningCount++;
                log.children.forEach(function (child) { return getStateCount(child); });
            }
        })(this.log);
        return (finishedCount * 2 + runningCount) * 100 / ((finishedCount + planningCount + runningCount) * 2);
    };
    return SwfProject;
}());
//# sourceMappingURL=swfObject.js.map