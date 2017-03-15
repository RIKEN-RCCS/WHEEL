var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
 * Swf File definition
 */
var SwfFile = (function () {
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
    SwfFile.prototype.toString = function () {
        return this.name;
    };
    SwfFile.prototype.getPath = function () {
        return ClientUtility.normalize(this.path);
    };
    SwfFile.prototype.clone = function () {
        return new SwfFile(this);
    };
    SwfFile.prototype.set = function (file) {
        this.name = file.name;
        this.description = file.description;
        this.path = file.path;
        this.type = file.type;
        this.required = file.required;
    };
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
    SwfTask.prototype.getInputFile = function (path) {
        return this.input_files.filter(function (file) { return file.getPath() === ClientUtility.normalize(path); })[0];
    };
    SwfTask.prototype.getOutputFile = function (path) {
        return this.output_files.filter(function (file) { return file.getPath() === ClientUtility.normalize(path); })[0];
    };
    SwfTask.prototype.getSendFile = function (path) {
        return this.send_files.filter(function (file) { return file.getPath() === ClientUtility.normalize(path); })[0];
    };
    SwfTask.prototype.getReceiveFile = function (path) {
        return this.receive_files.filter(function (file) { return file.getPath() === ClientUtility.normalize(path); })[0];
    };
    return SwfTask;
}());
/**
 * Swf Relation definition
 */
var SwfRelation = (function () {
    function SwfRelation(swfRelation) {
        this.index_before_task = swfRelation.index_before_task;
        this.index_after_task = swfRelation.index_after_task;
    }
    SwfRelation.prototype.toString = function () {
        return this.index_before_task + "_" + this.index_after_task;
    };
    return SwfRelation;
}());
/**
 * Swf Relation files definition
 */
var SwfRelationFile = (function () {
    function SwfRelationFile(swfRelation) {
        this.index_before_task = swfRelation.index_before_task;
        this.path_output_file = swfRelation.path_output_file;
        this.index_after_task = swfRelation.index_after_task;
        this.path_input_file = swfRelation.path_input_file;
    }
    SwfRelationFile.prototype.getOutputFileName = function () {
        return this.index_before_task + "_" + ClientUtility.normalize(this.path_output_file);
    };
    SwfRelationFile.prototype.getInputFileName = function () {
        return this.index_after_task + "_" + ClientUtility.normalize(this.path_input_file);
    };
    SwfRelationFile.prototype.toString = function () {
        return this.getOutputFileName() + "_" + this.getInputFileName();
    };
    return SwfRelationFile;
}());
// /**
//  * Swf File Relation definition
//  */
// class SwfFileRelation extends SwfRelation implements SwfFileRelationJson {
//     relations_file: Array<SwfRelationFiles>;
// }
/**
 * Swf Workflow definition
 */
var SwfWorkflow = (function (_super) {
    __extends(SwfWorkflow, _super);
    function SwfWorkflow(swfWorkflow) {
        var _this = _super.call(this, swfWorkflow) || this;
        _this.children_file = [];
        _this.relations = [];
        _this.file_relations = [];
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
    SwfWorkflow.prototype.isExistDuplicateInputFilePath = function (path) {
        var counter = this.inputFilePathCount(path);
        return counter > 1;
    };
    SwfWorkflow.prototype.isExistDuplicateOutputFilePath = function (path) {
        var counter = this.outputFilePathCount(path);
        return counter > 1;
    };
    return SwfWorkflow;
}(SwfTask));
var SwfLoop = (function (_super) {
    __extends(SwfLoop, _super);
    function SwfLoop(swfLoop) {
        var _this = _super.call(this, swfLoop) || this;
        _this.forParam = {
            start: undefined,
            end: undefined,
            step: undefined
        };
        if (swfLoop.forParam != null) {
            _this.forParam.start = swfLoop.forParam.start;
            _this.forParam.end = swfLoop.forParam.end;
            _this.forParam.step = swfLoop.forParam.step;
        }
        return _this;
    }
    return SwfLoop;
}(SwfWorkflow));
/**
 * Swf Host definition
 */
var SwfHost = (function () {
    function SwfHost(host) {
        var _this = this;
        Object.keys(host).forEach(function (key) {
            _this[key] = host[key];
        });
    }
    return SwfHost;
}());
/**
 * Swf Remote Task definition
 */
var SwfRemoteTask = (function (_super) {
    __extends(SwfRemoteTask, _super);
    function SwfRemoteTask() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SwfRemoteTask;
}(SwfTask));
/**
 * Swf Job definition
 */
var SwfJob = (function (_super) {
    __extends(SwfJob, _super);
    function SwfJob() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SwfJob;
}(SwfRemoteTask));
/**
 * Swf Bash Script definition
 */
var SwfBashScript = (function (_super) {
    __extends(SwfBashScript, _super);
    function SwfBashScript() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SwfBashScript;
}(SwfFile));
/**
 * Swf Lua Script definition
 */
var SwfLuaScript = (function (_super) {
    __extends(SwfLuaScript, _super);
    function SwfLuaScript() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SwfLuaScript;
}(SwfFile));
/**
 *
 */
var SwfLog = (function () {
    /**
     *
     * @param logJson
     * @param hierarchy
     */
    function SwfLog(logJson) {
        this.children = [];
        this.indexes = [];
        this.name = logJson.name;
        this.path = logJson.path;
        this.description = logJson.description;
        this.type = logJson.type;
        this.state = logJson.state;
        this.execution_start_date = logJson.execution_start_date;
        this.execution_end_date = logJson.execution_end_date;
        this.path = logJson.path;
        if (logJson.children) {
            var children = JSON.parse(JSON.stringify(logJson.children));
            this.children = children.map(function (child) { return new SwfLog(child); });
        }
        if (logJson.host) {
            this.host = JSON.parse(JSON.stringify(logJson.host));
        }
    }
    /**
     *
     */
    SwfLog.prototype.getIndexString = function () {
        return this.indexes.join('_');
    };
    /**
     *
     * @param logJson
     */
    SwfLog.create = function (logJson) {
        this.root = new SwfLog(logJson);
        return this.renumberingIndex(this.root);
    };
    /**
     *
     * @param log
     * @param indexes
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
        return log;
    };
    /**
     *
     * @param index
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
    };
    /**
     *
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
     *
     */
    SwfLog.prototype.getHierarchy = function () {
        return this.indexes.length - 1;
    };
    /**
     *
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
    return SwfLog;
}());
var SwfProject = (function () {
    function SwfProject(projectJson) {
        this.name = projectJson.name;
        this.description = projectJson.description;
        this.state = projectJson.state;
        this.path = projectJson.path;
        this.path_workflow = projectJson.path_workflow;
        this.log = SwfLog.create(projectJson.log);
    }
    /**
     *
     */
    SwfProject.prototype.isPlanning = function () {
        return this.state === config.state.planning;
    };
    /**
     *
     */
    SwfProject.prototype.isFinished = function () {
        var state = config.state;
        return this.state === state.completed || this.state === state.failed;
    };
    /**
     *
     */
    SwfProject.prototype.isRunning = function () {
        return !this.isFinished() && !this.isPlanning();
    };
    return SwfProject;
}());
//# sourceMappingURL=swfObject.js.map