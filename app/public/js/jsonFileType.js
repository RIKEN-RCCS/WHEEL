var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
 * json file type
 */
var JsonFileType;
(function (JsonFileType) {
    JsonFileType[JsonFileType["Project"] = 0] = "Project";
    JsonFileType[JsonFileType["WorkFlow"] = 1] = "WorkFlow";
    JsonFileType[JsonFileType["Task"] = 2] = "Task";
    JsonFileType[JsonFileType["RemoteTask"] = 3] = "RemoteTask";
    JsonFileType[JsonFileType["Job"] = 4] = "Job";
    JsonFileType[JsonFileType["Loop"] = 5] = "Loop";
    JsonFileType[JsonFileType["If"] = 6] = "If";
    JsonFileType[JsonFileType["Else"] = 7] = "Else";
    JsonFileType[JsonFileType["Condition"] = 8] = "Condition";
    JsonFileType[JsonFileType["Break"] = 9] = "Break";
    JsonFileType[JsonFileType["PStudy"] = 10] = "PStudy";
})(JsonFileType || (JsonFileType = {}));
/**
 *
 */
var JsonFileTypeBase = (function () {
    function JsonFileTypeBase() {
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
    JsonFileTypeBase.prototype.getExtension = function () {
        return this.extension;
    };
    JsonFileTypeBase.prototype.getType = function () {
        return this.type;
    };
    JsonFileTypeBase.prototype.checkExtension = function (target) {
        var filename;
        if (typeof target === 'string') {
            filename = target;
        }
        else {
            filename = target.path;
        }
        if (filename.match(new RegExp(this.extension.replace(/\./, '\\.') + "$"))) {
            return true;
        }
        else {
            return false;
        }
    };
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
                    key: 'Browse',
                    title: 'script',
                    callback: function (tree) {
                        $(document).trigger('selectFile', {
                            isMultiple: false,
                            callback: function (files) {
                                tree.setScriptPath(files[0]);
                            }
                        });
                    }
                }]
        });
    };
    JsonFileTypeBase.prototype.addScriptForJob = function () {
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
                        if (tree.job_script.path) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    },
                    callback: function (tree) {
                        $(document).trigger('editFile');
                    }
                }]
        });
    };
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
                    key: 'Browse',
                    title: 'job_script',
                    callback: function (tree) {
                        $(document).trigger('selectFile', {
                            isMultiple: false,
                            callback: function (files) {
                                tree.setJobScriptPath(files[0]);
                            }
                        });
                    }
                }]
        });
    };
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
                        var num = parseInt(v);
                        if (tree.forParam !== undefined) {
                            return num < tree.forParam.end;
                        }
                        return true;
                    }
                },
                {
                    key: 'end',
                    readonly: function () { return false; },
                    type: 'number',
                    validation: function (tree, v) {
                        var num = parseInt(v);
                        if (tree.forParam !== undefined) {
                            return tree.forParam.start < num;
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
    JsonFileTypeBase.prototype.addSendFile = function () {
        this.propertyInfo.push({
            key: 'send_files',
            ishash: true,
            order: 120,
            button: [
                {
                    key: 'Browse',
                    title: 'send_files',
                    isUpdateUI: true,
                    callback: function (tree) {
                        $(document).trigger('selectFile', {
                            isMultiple: true,
                            callback: function (files) {
                                tree.setSendFilepath(files);
                            }
                        });
                    }
                },
                {
                    key: 'Add',
                    title: 'send_files',
                    isUpdateUI: true,
                    callback: function (tree) {
                        var file = SwfFile.getDefault();
                        tree.send_files.push(file);
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
                        var file = SwfFile.getDefault();
                        tree.receive_files.push(file);
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
                    readonly: function () { return true; },
                    type: 'string',
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
                    title: 'receive_file',
                    isUpdateUI: true,
                    callback: function (tree, object, name) {
                        var filepath = object.path;
                        var parent = tree.getParent();
                        var index = tree.receive_files.indexOf(object);
                        tree.receive_files.splice(index, 1);
                    }
                }]
        });
    };
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
                    key: 'Browse',
                    title: 'parameter_file',
                    callback: function (tree) {
                        $(document).trigger('selectFile', {
                            isMultiple: false,
                            callback: function (files) {
                                tree.setParameterFilePath(files[0]);
                            }
                        });
                    }
                }]
        });
    };
    JsonFileTypeBase.prototype.addHost = function () {
        this.propertyInfo.push({
            key: 'host',
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
    JsonFileTypeBase.prototype.addHostForJob = function () {
        this.propertyInfo.push({
            key: 'host',
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
    JsonFileTypeBase.prototype.addUpload = function () {
        this.propertyInfo.push({
            key: 'upload_files',
            ishash: true,
            order: 400,
            button: [{
                    key: 'Browse',
                    title: 'upload_files',
                    isUpdateUI: true,
                    callback: function (tree) {
                        $(document).trigger('selectFile', {
                            isMultiple: true,
                            callback: function (files) {
                                tree.setUploadFilePath(files);
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
    JsonFileTypeBase.prototype.getPropertyInfo = function () {
        this.propertyInfo.sort(function (a, b) {
            if (a.order < b.order) {
                return -1;
            }
            else {
                return 1;
            }
        });
        return this.propertyInfo;
    };
    return JsonFileTypeBase;
}());
/**
 *
 */
var TypeProject = (function (_super) {
    __extends(TypeProject, _super);
    function TypeProject() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.project;
        return _this;
    }
    return TypeProject;
}(JsonFileTypeBase));
/**
 *
 */
var TypeTask = (function (_super) {
    __extends(TypeTask, _super);
    function TypeTask() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.task;
        _this.type = config.json_types.task;
        _this.addScript();
        _this.addInputFile();
        _this.addOutputFile();
        _this.addUpload();
        return _this;
    }
    return TypeTask;
}(JsonFileTypeBase));
/**
 *
 */
var TypeWorkflow = (function (_super) {
    __extends(TypeWorkflow, _super);
    function TypeWorkflow() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.workflow;
        _this.type = config.json_types.workflow;
        _this.addUpload();
        return _this;
    }
    return TypeWorkflow;
}(JsonFileTypeBase));
/**
 *
 */
var TypeJob = (function (_super) {
    __extends(TypeJob, _super);
    function TypeJob() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.job;
        _this.type = config.json_types.job;
        _this.addScriptForJob();
        _this.addJobScript();
        _this.addInputFile();
        _this.addOutputFile();
        _this.addSendFile();
        _this.addReceiveFile();
        _this.addScriptParam();
        _this.addHostForJob();
        return _this;
    }
    return TypeJob;
}(JsonFileTypeBase));
/**
 *
 */
var TypeRemoteTask = (function (_super) {
    __extends(TypeRemoteTask, _super);
    function TypeRemoteTask() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.remotetask;
        _this.type = config.json_types.remotetask;
        _this.addScript();
        _this.addInputFile();
        _this.addOutputFile();
        _this.addSendFile();
        _this.addReceiveFile();
        _this.addHost();
        return _this;
    }
    return TypeRemoteTask;
}(JsonFileTypeBase));
/**
 *
 */
var TypeLoop = (function (_super) {
    __extends(TypeLoop, _super);
    function TypeLoop() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.loop;
        _this.type = config.json_types.loop;
        _this.addForParam();
        _this.addUpload();
        return _this;
    }
    return TypeLoop;
}(JsonFileTypeBase));
/**
 *
 */
var TypeIf = (function (_super) {
    __extends(TypeIf, _super);
    function TypeIf() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.if;
        _this.type = config.json_types.if;
        _this.addUpload();
        return _this;
    }
    return TypeIf;
}(JsonFileTypeBase));
/**
 *
 */
var TypeElse = (function (_super) {
    __extends(TypeElse, _super);
    function TypeElse() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.else;
        _this.type = config.json_types.else;
        _this.addUpload();
        return _this;
    }
    return TypeElse;
}(JsonFileTypeBase));
/**
 *
 */
var TypeCondition = (function (_super) {
    __extends(TypeCondition, _super);
    function TypeCondition() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.condition;
        _this.type = config.json_types.condition;
        _this.addScript();
        _this.addInputFile();
        _this.addUpload();
        return _this;
    }
    return TypeCondition;
}(JsonFileTypeBase));
/**
 *
 */
var TypeBreak = (function (_super) {
    __extends(TypeBreak, _super);
    function TypeBreak() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.break;
        _this.type = config.json_types.break;
        _this.addScript();
        _this.addInputFile();
        _this.addUpload();
        return _this;
    }
    return TypeBreak;
}(JsonFileTypeBase));
/**
 *
 */
var TypePStudy = (function (_super) {
    __extends(TypePStudy, _super);
    function TypePStudy() {
        var _this = _super.call(this) || this;
        _this.extension = config.extension.pstudy;
        _this.type = config.json_types.pstudy;
        _this.addParameterFile();
        _this.addUpload();
        return _this;
    }
    return TypePStudy;
}(JsonFileTypeBase));
//# sourceMappingURL=jsonFileType.js.map