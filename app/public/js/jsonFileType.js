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
 * json file base class
 */
var JsonFileTypeBase = (function () {
    function JsonFileTypeBase() {
        /**
         * property information
         */
        this.propertyInfo = [
            {
                key: 'name',
                readonly: function () { return false; },
                type: 'string',
                isUpdateUI: true,
                order: 0,
                validation: function (tree, v) {
                    return v.trim().length > 0;
                },
                callback: function (tree, object, name) {
                    var file = tree.toSwfFile();
                    file.name = name;
                    tree.updatePath(file);
                }
            },
            {
                key: 'description',
                readonly: function () { return false; },
                type: 'string',
                order: 10,
                callback: function (tree, object, description) {
                    var file = tree.toSwfFile();
                    file.description = description;
                    tree.updatePath(file);
                }
            },
            {
                key: 'path',
                readonly: function () { return false; },
                type: 'string',
                order: 20,
                validation: function (tree, v) {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: function (tree, object, path) {
                    var file = tree.toSwfFile();
                    file.path = path;
                    tree.updatePath(file);
                }
            },
            {
                key: 'clean_up',
                readonly: function () { return false; },
                type: 'boolean',
                order: 300
            },
            {
                key: 'max_size_receive_file',
                readonly: function () { return false; },
                type: 'number',
                order: 310
            }
        ];
    }
    /**
     * get extension string
     * @return get extension string
     */
    JsonFileTypeBase.prototype.getExtension = function () {
        return this.extension;
    };
    /**
     * get json file type string
     * @return get json file type string
     */
    JsonFileTypeBase.prototype.getType = function () {
        return this.type;
    };
    /**
     * whether specified string or SwfTree instance type is matched or not
     * @param target file type string or SwfTree instance
     * @return whether specified string or SwfTree instance type is matched or not
     */
    JsonFileTypeBase.prototype.checkFileType = function (target) {
        var type;
        if (typeof target === 'string') {
            type = target;
        }
        else {
            type = target.type;
        }
        return type === this.type;
    };
    /**
     * add script property information
     */
    JsonFileTypeBase.prototype.addScript = function () {
        this.propertyInfo.push({
            key: 'script',
            ishash: true,
            order: 30,
            item: [
                {
                    key: 'name',
                    readonly: function () { return false; },
                    type: 'string'
                },
                {
                    key: 'description',
                    readonly: function () { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: function (tree) { return tree.isExistUploadScript(); },
                    type: 'string',
                }
            ],
            button: [{
                    key: 'Upload...',
                    title: 'script',
                    callback: function (tree) {
                        $(document).trigger('selectFile', {
                            isMultiple: false,
                            callback: function (files) {
                                tree.addScriptFile(files[0]);
                            }
                        });
                    }
                }]
        });
    };
    /**
     * add job script property information
     */
    JsonFileTypeBase.prototype.addJobScript = function () {
        this.propertyInfo.push({
            key: 'job_script',
            ishash: true,
            order: 40,
            item: [
                {
                    key: 'name',
                    readonly: function () { return false; },
                    type: 'string'
                },
                {
                    key: 'description',
                    readonly: function () { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: function () { return true; },
                    type: 'string'
                }
            ],
            button: [{
                    key: 'Upload...',
                    title: 'job_script',
                    callback: function (tree) {
                        $(document).trigger('selectFile', {
                            isMultiple: false,
                            callback: function (files) {
                                tree.addJobScriptFile(files[0]);
                            }
                        });
                    }
                }]
        });
    };
    /**
     * add for loop property information
     */
    JsonFileTypeBase.prototype.addForParam = function () {
        this.propertyInfo.push({
            key: 'forParam',
            ishash: true,
            order: 50,
            item: [
                {
                    key: 'start',
                    readonly: function () { return false; },
                    type: 'number',
                    validation: function (tree, v) {
                        var forWorkflow = tree;
                        var num = parseInt(v);
                        if (forWorkflow.forParam !== undefined) {
                            return num < forWorkflow.forParam.end;
                        }
                        return true;
                    }
                },
                {
                    key: 'end',
                    readonly: function () { return false; },
                    type: 'number',
                    validation: function (tree, v) {
                        var forWorkflow = tree;
                        var num = parseInt(v);
                        if (forWorkflow.forParam !== undefined) {
                            return forWorkflow.forParam.start < num;
                        }
                        return true;
                    }
                },
                {
                    key: 'step',
                    readonly: function () { return false; },
                    type: 'number',
                    validation: function (tree, v) {
                        return parseInt(v) > 0;
                    }
                }
            ]
        });
    };
    /**
     * add input files property information
     */
    JsonFileTypeBase.prototype.addInputFile = function () {
        this.propertyInfo.push({
            key: 'input_files',
            ishash: true,
            order: 100,
            button: [{
                    key: 'Add',
                    title: 'input_files',
                    isUpdateUI: true,
                    callback: function (tree) {
                        var file = SwfFile.getDefault();
                        var parent = tree.getParent();
                        tree.input_files.push(file);
                        parent.addInputFileToParent(tree, file.path);
                    }
                }]
        });
        this.propertyInfo.push({
            key: 'input_files',
            isarray: true,
            order: 101,
            item: [
                {
                    key: 'name',
                    readonly: function () { return false; },
                    type: 'string',
                    isUpdateUI: true,
                    validation: function (tree, v) {
                        return v.trim().length > 0;
                    },
                    callback: function (tree, object, name) {
                        var file = new SwfFile(object);
                        file.name = name;
                        tree.updateInputFile(object, file);
                    }
                },
                {
                    key: 'description',
                    readonly: function () { return false; },
                    type: 'string',
                    callback: function (tree, object, description) {
                        var file = new SwfFile(object);
                        file.description = description;
                        tree.updateInputFile(object, file);
                    }
                },
                {
                    key: 'path',
                    readonly: function () { return false; },
                    type: 'string',
                    isUpdateUI: true,
                    validation: function (tree, newData, oldData) {
                        if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                            return true;
                        }
                        return !tree.isEnablePath(newData);
                    },
                    callback: function (tree, object, path) {
                        var newFile = new SwfFile(object);
                        newFile.path = path;
                        newFile.type = ClientUtility.getIOFileType(newFile.path);
                        tree.updateInputFile(object, newFile);
                        object.type = newFile.type;
                    }
                },
                {
                    key: 'required',
                    readonly: function () { return false; },
                    type: 'boolean',
                    callback: function (tree, object, value) {
                        var file = new SwfFile(object);
                        file.required = value === 'true';
                        tree.updateInputFile(object, file);
                    }
                }
            ],
            button: [{
                    key: 'Delete',
                    title: 'input_file',
                    isUpdateUI: true,
                    callback: function (tree, object) {
                        var filepath = object.path;
                        var parent = tree.getParent();
                        parent.deleteInputFileFromParent(tree, filepath);
                        var index = tree.input_files.indexOf(object);
                        tree.input_files.splice(index, 1);
                    }
                }]
        });
    };
    /**
     * add output files property information
     */
    JsonFileTypeBase.prototype.addOutputFile = function () {
        this.propertyInfo.push({
            key: 'output_files',
            ishash: true,
            order: 110,
            button: [{
                    key: 'Add',
                    title: 'output_files',
                    isUpdateUI: true,
                    callback: function (tree) {
                        var file = SwfFile.getDefault();
                        var parent = tree.getParent();
                        tree.output_files.push(file);
                        parent.addOutputFileToParent(tree, file.path);
                    }
                }]
        });
        this.propertyInfo.push({
            key: 'output_files',
            isarray: true,
            order: 111,
            item: [
                {
                    key: 'name',
                    readonly: function () { return false; },
                    type: 'string',
                    isUpdateUI: true,
                    validation: function (tree, v) {
                        return v.trim() ? true : false;
                    },
                    callback: function (tree, object, name) {
                        var file = new SwfFile(object);
                        file.name = name;
                        tree.updateOutputFile(object, file);
                    }
                },
                {
                    key: 'description',
                    readonly: function () { return false; },
                    type: 'string',
                    callback: function (tree, object, description) {
                        var file = new SwfFile(object);
                        file.description = description;
                        tree.updateOutputFile(object, file);
                    }
                },
                {
                    key: 'path',
                    readonly: function () { return false; },
                    type: 'string',
                    isUpdateUI: true,
                    validation: function (tree, newData, oldData) {
                        if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                            return true;
                        }
                        return !tree.isEnablePath(newData);
                    },
                    callback: function (tree, object, path) {
                        var newFile = new SwfFile(object);
                        newFile.path = path;
                        newFile.type = ClientUtility.getIOFileType(newFile.path);
                        tree.updateOutputFile(object, newFile);
                        object.type = newFile.type;
                    }
                },
                {
                    key: 'required',
                    readonly: function () { return false; },
                    type: 'boolean',
                    callback: function (tree, object, value) {
                        var file = new SwfFile(object);
                        file.required = value === 'true';
                        tree.updateOutputFile(object, file);
                    }
                }
            ],
            button: [{
                    key: 'Delete',
                    title: 'output_file',
                    isUpdateUI: true,
                    callback: function (tree, object) {
                        var filepath = object.path;
                        var parent = tree.getParent();
                        parent.deleteOutputFileFromParent(tree, filepath);
                        var index = tree.output_files.indexOf(object);
                        tree.output_files.splice(index, 1);
                    }
                }]
        });
    };
    /**
     * add send files property information
     */
    JsonFileTypeBase.prototype.addSendFile = function () {
        this.propertyInfo.push({
            key: 'send_files',
            ishash: true,
            order: 120,
            button: [
                {
                    key: 'Upload...',
                    title: 'send_files',
                    isUpdateUI: true,
                    callback: function (tree) {
                        $(document).trigger('selectFile', {
                            isMultiple: true,
                            callback: function (files) {
                                tree.addSendFile(files);
                            }
                        });
                    }
                },
                {
                    key: 'Add',
                    title: 'send_files',
                    isUpdateUI: true,
                    callback: function (tree) {
                        var rtask = tree;
                        var file = SwfFile.getDefault();
                        rtask.send_files.push(file);
                    }
                }
            ]
        });
        this.propertyInfo.push({
            key: 'send_files',
            isarray: true,
            order: 122,
            item: [
                {
                    key: 'name',
                    readonly: function () { return false; },
                    type: 'string',
                    validation: function (tree, v) {
                        return v.trim() ? true : false;
                    }
                },
                {
                    key: 'description',
                    readonly: function () { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    type: 'string',
                    readonly: function (tree, sendFile) {
                        return tree.isExistSendfile(sendFile);
                    },
                    validation: function (tree, v) {
                        return !tree.isEnablePath(v);
                    },
                    callback: function (tree, object, path) {
                        object.type = ClientUtility.getIOFileType(path);
                    }
                }
            ],
            button: [{
                    key: 'Delete',
                    title: 'send_file',
                    isUpdateUI: true,
                    callback: function (tree, object, name) {
                        tree.deleteSendfile(object);
                    }
                }]
        });
    };
    /**
     * add receive files property information
     */
    JsonFileTypeBase.prototype.addReceiveFile = function () {
        this.propertyInfo.push({
            key: 'receive_files',
            ishash: true,
            order: 130,
            button: [{
                    key: 'Add',
                    title: 'receive_files',
                    isUpdateUI: true,
                    callback: function (tree) {
                        var rtask = tree;
                        var file = SwfFile.getDefault();
                        rtask.receive_files.push(file);
                    }
                }]
        });
        this.propertyInfo.push({
            key: 'receive_files',
            isarray: true,
            order: 131,
            item: [
                {
                    key: 'name',
                    readonly: function () { return false; },
                    type: 'string',
                    validation: function (tree, v) {
                        return v.trim() ? true : false;
                    }
                },
                {
                    key: 'description',
                    readonly: function () { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: function () { return false; },
                    type: 'string',
                    validation: function (tree, v) {
                        return !tree.isEnablePath(v);
                    },
                    callback: function (tree, object, path) {
                        object.type = ClientUtility.getIOFileType(path);
                    }
                },
                {
                    key: 'required',
                    readonly: function () { return false; },
                    type: 'boolean'
                }
            ],
            button: [{
                    key: 'Delete',
                    title: 'receive_file',
                    isUpdateUI: true,
                    callback: function (tree, object, name) {
                        var rtask = tree;
                        var index = rtask.receive_files.indexOf(object);
                        rtask.receive_files.splice(index, 1);
                    }
                }]
        });
    };
    /**
     * add script parameter property information
     */
    JsonFileTypeBase.prototype.addScriptParam = function () {
        this.propertyInfo.push({
            key: 'script_param',
            ishash: true,
            order: 140,
            item: [
                {
                    key: 'cores',
                    readonly: function () { return false; },
                    type: 'number',
                    validation: function (tree, v) {
                        return parseInt(v) > 0;
                    }
                },
                {
                    key: 'nodes',
                    readonly: function () { return false; },
                    type: 'number',
                    validation: function (tree, v) {
                        return parseInt(v) > 0;
                    }
                }
            ]
        });
    };
    /**
     * add parameter file property information
     */
    JsonFileTypeBase.prototype.addParameterFile = function () {
        this.propertyInfo.push({
            key: 'parameter_file',
            ishash: true,
            order: 150,
            item: [
                {
                    key: 'name',
                    readonly: function () { return false; },
                    type: 'string'
                },
                {
                    key: 'description',
                    readonly: function () { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: function () { return true; },
                    type: 'string',
                }
            ],
            button: [{
                    key: 'Upload...',
                    title: 'parameter_file',
                    callback: function (tree) {
                        $(document).trigger('selectFile', {
                            isMultiple: false,
                            callback: function (files) {
                                tree.addParameterFile(files[0]);
                            }
                        });
                    }
                }]
        });
    };
    /**
     * add host property information
     */
    JsonFileTypeBase.prototype.addHost = function () {
        this.propertyInfo.push({
            key: 'remote',
            ishash: true,
            order: 200,
            item: [
                {
                    key: 'host',
                    readonly: function () { return false; },
                    type: 'host'
                }
            ]
        });
    };
    /**
     * add upload property information
     */
    JsonFileTypeBase.prototype.addUpload = function () {
        this.propertyInfo.push({
            key: 'upload_files',
            ishash: true,
            order: 400,
            button: [{
                    key: 'Upload...',
                    title: 'upload_files',
                    isUpdateUI: true,
                    callback: function (tree) {
                        $(document).trigger('selectFile', {
                            isMultiple: true,
                            callback: function (files) {
                                tree.addUploadFile(files);
                            }
                        });
                    }
                }]
        });
        this.propertyInfo.push({
            key: 'upload_files',
            isarray: true,
            order: 401,
            item: [
                {
                    key: 'name',
                    readonly: function () { return true; }
                }
            ],
            button: [{
                    key: 'Delete',
                    title: 'upload_file',
                    isUpdateUI: true,
                    callback: function (tree, object, name) {
                        tree.deleteUploadfile(object);
                    }
                }]
        });
    };
    /**
     * sort property info
     */
    JsonFileTypeBase.prototype.sortPropertyInfo = function () {
        this.propertyInfo.sort(function (a, b) { return a.order < b.order ? -1 : 1; });
    };
    /**
     * get property information
     * @returns property information
     */
    JsonFileTypeBase.prototype.getPropertyInfo = function () {
        return this.propertyInfo;
    };
    return JsonFileTypeBase;
}());
/**
 * type of project class
 */
var TypeProject = (function (_super) {
    __extends(TypeProject, _super);
    /**
     * create new instance for project
     */
    function TypeProject() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.project;
        return _this;
    }
    return TypeProject;
}(JsonFileTypeBase));
/**
 * type of task class
 */
var TypeTask = (function (_super) {
    __extends(TypeTask, _super);
    /**
     * create new instance for task
     */
    function TypeTask() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.task;
        _this.type = SwfType.TASK;
        _this.addScript();
        _this.addInputFile();
        _this.addOutputFile();
        _this.addUpload();
        _this.sortPropertyInfo();
        return _this;
    }
    return TypeTask;
}(JsonFileTypeBase));
/**
 * type of workflow class
 */
var TypeWorkflow = (function (_super) {
    __extends(TypeWorkflow, _super);
    /**
     * create new instance for workflow
     */
    function TypeWorkflow() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.workflow;
        _this.type = SwfType.WORKFLOW;
        _this.addUpload();
        return _this;
    }
    return TypeWorkflow;
}(JsonFileTypeBase));
/**
 * type of job class
 */
var TypeJob = (function (_super) {
    __extends(TypeJob, _super);
    /**
     * create new instance for job
     */
    function TypeJob() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.job;
        _this.type = SwfType.JOB;
        _this.addScrip();
        _this.addJobScript();
        _this.addInputFile();
        _this.addOutputFile();
        _this.addSendFile();
        _this.addReceiveFile();
        _this.addScriptParam();
        _this.addHost();
        _this.sortPropertyInfo();
        return _this;
    }
    /**
     * add script property information for job
     */
    TypeJob.prototype.addScrip = function () {
        this.propertyInfo.push({
            key: 'script',
            ishash: true,
            order: 30,
            item: [
                {
                    key: 'name',
                    readonly: function () { return false; },
                    type: 'string'
                },
                {
                    key: 'description',
                    readonly: function () { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: function () { return true; },
                    type: 'string'
                }
            ],
            button: [{
                    key: 'Edit',
                    title: 'submit_script',
                    validation: function (tree) {
                        var jobTask = tree;
                        if (jobTask.job_script.path) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    },
                    callback: function (tree) {
                        $(document).trigger('editScript');
                    }
                }]
        });
    };
    /**
     * add host property information for job
     */
    TypeJob.prototype.addHost = function () {
        this.propertyInfo.push({
            key: 'remote',
            ishash: true,
            order: 200,
            item: [
                {
                    key: 'host',
                    readonly: function () { return false; },
                    type: 'host'
                },
                {
                    key: 'job_scheduler',
                    readonly: function () { return false; },
                    type: 'scheduler'
                }
            ]
        });
    };
    return TypeJob;
}(JsonFileTypeBase));
/**
 * type of remote task class
 */
var TypeRemoteTask = (function (_super) {
    __extends(TypeRemoteTask, _super);
    /**
     * create new instance for remote task
     */
    function TypeRemoteTask() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.remotetask;
        _this.type = SwfType.REMOTETASK;
        _this.addScript();
        _this.addInputFile();
        _this.addOutputFile();
        _this.addSendFile();
        _this.addReceiveFile();
        _this.addHost();
        _this.sortPropertyInfo();
        return _this;
    }
    return TypeRemoteTask;
}(JsonFileTypeBase));
/**
 * type of for class
 */
var TypeFor = (function (_super) {
    __extends(TypeFor, _super);
    /**
     * create new instance for loop
     */
    function TypeFor() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.for;
        _this.type = SwfType.FOR;
        _this.addForParam();
        _this.addUpload();
        _this.sortPropertyInfo();
        return _this;
    }
    return TypeFor;
}(JsonFileTypeBase));
/**
 * type of if class
 */
var TypeIf = (function (_super) {
    __extends(TypeIf, _super);
    /**
     * create new instance for if
     */
    function TypeIf() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.if;
        _this.type = SwfType.IF;
        _this.addUpload();
        return _this;
    }
    return TypeIf;
}(JsonFileTypeBase));
/**
 * type of else class
 */
var TypeElse = (function (_super) {
    __extends(TypeElse, _super);
    /**
     * create new instance for else
     */
    function TypeElse() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.else;
        _this.type = SwfType.ELSE;
        _this.addUpload();
        return _this;
    }
    return TypeElse;
}(JsonFileTypeBase));
/**
 * type of condition class
 */
var TypeCondition = (function (_super) {
    __extends(TypeCondition, _super);
    /**
     * create new instance for condition
     */
    function TypeCondition() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.condition;
        _this.type = SwfType.CONDITION;
        _this.addScript();
        _this.addInputFile();
        _this.addOutputFile();
        _this.addUpload();
        _this.sortPropertyInfo();
        return _this;
    }
    /**
     * add output files property information for condition
     */
    TypeCondition.prototype.addOutputFile = function () {
        this.propertyInfo.push({
            key: 'output_files',
            ishash: true,
            order: 110,
            button: [{
                    key: 'Add',
                    title: 'output_files',
                    isUpdateUI: true,
                    callback: function (tree) {
                        var file = SwfFile.getDefault();
                        tree.output_files.push(file);
                    }
                }]
        });
        this.propertyInfo.push({
            key: 'output_files',
            isarray: true,
            order: 111,
            item: [
                {
                    key: 'name',
                    readonly: function () { return false; },
                    type: 'string',
                    isUpdateUI: true,
                    validation: function (tree, v) {
                        return v.trim() ? true : false;
                    }
                },
                {
                    key: 'description',
                    readonly: function () { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: function () { return false; },
                    type: 'string',
                    validation: function (tree, v) {
                        return !tree.isEnablePath(v);
                    },
                    callback: function (tree, object, path) {
                        object.type = ClientUtility.getIOFileType(path);
                    }
                },
                {
                    key: 'required',
                    readonly: function () { return false; },
                    type: 'boolean'
                }
            ],
            button: [{
                    key: 'Delete',
                    title: 'output_file',
                    isUpdateUI: true,
                    callback: function (tree, object) {
                        var index = tree.output_files.indexOf(object);
                        tree.output_files.splice(index, 1);
                    }
                }]
        });
    };
    return TypeCondition;
}(JsonFileTypeBase));
/**
 * type of break class
 */
var TypeBreak = (function (_super) {
    __extends(TypeBreak, _super);
    /**
     * create new instance for break
     */
    function TypeBreak() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.break;
        _this.type = SwfType.BREAK;
        _this.addScript();
        _this.addInputFile();
        _this.addOutputFile();
        _this.addUpload();
        _this.sortPropertyInfo();
        return _this;
    }
    /**
     * add output files property information for break
     */
    TypeBreak.prototype.addOutputFile = function () {
        this.propertyInfo.push({
            key: 'output_files',
            ishash: true,
            order: 110,
            button: [{
                    key: 'Add',
                    title: 'output_files',
                    isUpdateUI: true,
                    callback: function (tree) {
                        var file = SwfFile.getDefault();
                        tree.output_files.push(file);
                    }
                }]
        });
        this.propertyInfo.push({
            key: 'output_files',
            isarray: true,
            order: 111,
            item: [
                {
                    key: 'name',
                    readonly: function () { return false; },
                    type: 'string',
                    isUpdateUI: true,
                    validation: function (tree, v) {
                        return v.trim() ? true : false;
                    }
                },
                {
                    key: 'description',
                    readonly: function () { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: function () { return false; },
                    type: 'string',
                    validation: function (tree, v) {
                        return !tree.isEnablePath(v);
                    },
                    callback: function (tree, object, path) {
                        object.type = ClientUtility.getIOFileType(path);
                    }
                },
                {
                    key: 'required',
                    readonly: function () { return false; },
                    type: 'boolean'
                }
            ],
            button: [{
                    key: 'Delete',
                    title: 'output_file',
                    isUpdateUI: true,
                    callback: function (tree, object) {
                        var index = tree.output_files.indexOf(object);
                        tree.output_files.splice(index, 1);
                    }
                }]
        });
    };
    return TypeBreak;
}(JsonFileTypeBase));
/**
 * type of parameter study class
 */
var TypePStudy = (function (_super) {
    __extends(TypePStudy, _super);
    /**
     * create new instance for parameter study
     */
    function TypePStudy() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.pstudy;
        _this.type = SwfType.PSTUDY;
        _this.addParameterFile();
        _this.addUpload();
        _this.sortPropertyInfo();
        return _this;
    }
    return TypePStudy;
}(JsonFileTypeBase));
//# sourceMappingURL=jsonFileType.js.map