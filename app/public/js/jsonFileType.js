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
})(JsonFileType || (JsonFileType = {}));
/**
 *
 */
var JsonFileTypeBase = (function () {
    function JsonFileTypeBase() {
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
    JsonFileTypeBase.prototype.getPropertyInfo = function () {
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
        _this.propertyInfo = {
            name: {
                readonly: false,
                type: 'string',
                isUpdateUI: true
            },
            description: {
                readonly: false,
                type: 'string'
            },
            path: {
                readonly: false,
                type: 'string',
                validation: function (tree, v) {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: function (tree, object, dirname) {
                    var file = new SwfFile({
                        name: tree.name,
                        description: tree.description,
                        path: dirname,
                        type: 'file',
                        required: true
                    });
                    tree.updateChildren(file);
                }
            },
            script: {
                ishash: true,
                name: {
                    readonly: false,
                    type: 'string'
                },
                description: {
                    readonly: false,
                    type: 'string'
                },
                path: {
                    readonly: false,
                    type: 'string',
                }
            },
            input_files: [
                {
                    name: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: function (tree, v) {
                            return v.trim() ? true : false;
                        },
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: function (tree, newData, oldData) {
                            if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                                return true;
                            }
                            return !tree.isEnablePath(newData);
                        },
                        callback: function (tree, object, data) {
                            var newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateInputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    }
                }
            ],
            output_files: [
                {
                    name: {
                        readonly: false,
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
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateOutputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: function (tree, v) {
                            return !tree.isEnablePath(v);
                        },
                        callback: function (tree, object, data) {
                            var newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateOutputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateOutputFile(object, file);
                        }
                    }
                }
            ],
            clean_up: {
                readonly: false,
                type: 'boolean'
            },
            max_size_recieve_file: {
                readonly: false,
                type: 'number'
            }
        };
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
        _this.propertyInfo = {
            name: {
                readonly: false,
                type: 'string',
                isUpdateUI: true
            },
            description: {
                readonly: false,
                type: 'string'
            },
            path: {
                readonly: false,
                type: 'string',
                validation: function (tree, v) {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: function (tree, object, dirname) {
                    var file = new SwfFile({
                        name: tree.name,
                        description: tree.description,
                        path: dirname,
                        type: 'file',
                        required: true
                    });
                    tree.updateChildren(file);
                }
            },
            clean_up: {
                readonly: false,
                type: 'boolean'
            },
            max_size_recieve_file: {
                readonly: false,
                type: 'number'
            }
        };
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
        _this.propertyInfo = {
            name: {
                readonly: false,
                type: 'string',
                isUpdateUI: true
            },
            description: {
                readonly: false,
                type: 'string'
            },
            path: {
                readonly: false,
                type: 'string',
                validation: function (tree, v) {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: function (tree, object, dirname) {
                    var file = new SwfFile({
                        name: tree.name,
                        description: tree.description,
                        path: dirname,
                        type: 'file',
                        required: true
                    });
                    tree.updateChildren(file);
                }
            },
            script: {
                ishash: true,
                name: {
                    readonly: false,
                    type: 'string'
                },
                description: {
                    readonly: false,
                    type: 'string'
                },
                path: {
                    readonly: false,
                    type: 'string',
                }
            },
            job_script: {
                ishash: true,
                name: {
                    readonly: false,
                    type: 'string'
                },
                description: {
                    readonly: false,
                    type: 'string'
                },
                path: {
                    readonly: false,
                    type: 'string',
                }
            },
            input_files: [
                {
                    name: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: function (tree, v) {
                            return v.trim() ? true : false;
                        },
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: function (tree, newData, oldData) {
                            if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                                return true;
                            }
                            return !tree.isEnablePath(newData);
                        },
                        callback: function (tree, object, data) {
                            var newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateInputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    }
                }
            ],
            output_files: [
                {
                    name: {
                        readonly: false,
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
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateOutputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: function (tree, v) {
                            return !tree.isEnablePath(v);
                        },
                        callback: function (tree, object, data) {
                            var newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateOutputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateOutputFile(object, file);
                        }
                    }
                }
            ],
            send_files: [
                {
                    name: {
                        readonly: false,
                        type: 'string',
                        validation: function (tree, v) {
                            return v.trim() ? true : false;
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string'
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        validation: function (tree, v) {
                            return !tree.isEnablePath(v);
                        },
                        callback: function (tree, oldFile, newFile) {
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            oldFile.type = newFile.type;
                        }
                    },
                }
            ],
            receive_files: [
                {
                    name: {
                        readonly: false,
                        type: 'string',
                        validation: function (tree, v) {
                            return v.trim() ? true : false;
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string'
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        validation: function (tree, v) {
                            return !tree.isEnablePath(v);
                        },
                        callback: function (tree, oldFile, newFile) {
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            oldFile.type = newFile.type;
                        }
                    },
                }
            ],
            script_param: {
                ishash: true,
                cores: {
                    readonly: false,
                    type: 'number',
                    validation: function (tree, v) {
                        return parseInt(v) > 0;
                    }
                },
                nodes: {
                    readonly: false,
                    type: 'number',
                    validation: function (tree, v) {
                        return parseInt(v) > 0;
                    }
                }
            },
            host: {
                ishash: true,
                host: {
                    readonly: false,
                    type: 'host'
                }
            },
            clean_up: {
                readonly: false,
                type: 'boolean'
            },
            max_size_recieve_file: {
                readonly: false,
                type: 'number'
            }
        };
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
        _this.propertyInfo = {
            name: {
                readonly: false,
                type: 'string',
                isUpdateUI: true
            },
            description: {
                readonly: false,
                type: 'string'
            },
            path: {
                readonly: false,
                type: 'string',
                validation: function (tree, v) {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: function (tree, object, dirname) {
                    var file = new SwfFile({
                        name: tree.name,
                        description: tree.description,
                        path: dirname,
                        type: 'file',
                        required: true
                    });
                    tree.updateChildren(file);
                }
            },
            script: {
                ishash: true,
                name: {
                    readonly: false,
                    type: 'string'
                },
                description: {
                    readonly: false,
                    type: 'string'
                },
                path: {
                    readonly: false,
                    type: 'string',
                }
            },
            input_files: [
                {
                    name: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: function (tree, v) {
                            return v.trim() ? true : false;
                        },
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: function (tree, newData, oldData) {
                            if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                                return true;
                            }
                            return !tree.isEnablePath(newData);
                        },
                        callback: function (tree, object, data) {
                            var newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateInputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    }
                }
            ],
            output_files: [
                {
                    name: {
                        readonly: false,
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
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateOutputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: function (tree, v) {
                            return !tree.isEnablePath(v);
                        },
                        callback: function (tree, object, data) {
                            var newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateOutputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateOutputFile(object, file);
                        }
                    }
                }
            ],
            send_files: [
                {
                    name: {
                        readonly: false,
                        type: 'string',
                        validation: function (tree, v) {
                            return v.trim() ? true : false;
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string'
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        validation: function (tree, v) {
                            return !tree.isEnablePath(v);
                        },
                        callback: function (tree, oldFile, newFile) {
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            oldFile.type = newFile.type;
                        }
                    },
                }
            ],
            receive_files: [
                {
                    name: {
                        readonly: false,
                        type: 'string',
                        validation: function (tree, v) {
                            return v.trim() ? true : false;
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string'
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        validation: function (tree, v) {
                            return !tree.isEnablePath(v);
                        },
                        callback: function (tree, oldFile, newFile) {
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            oldFile.type = newFile.type;
                        }
                    },
                }
            ],
            host: {
                ishash: true,
                host: {
                    readonly: false,
                    type: 'host'
                }
            },
            clean_up: {
                readonly: false,
                type: 'boolean'
            },
            max_size_recieve_file: {
                readonly: false,
                type: 'number'
            }
        };
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
        _this.propertyInfo = {
            name: {
                readonly: false,
                type: 'string',
                isUpdateUI: true
            },
            description: {
                readonly: false,
                type: 'string'
            },
            path: {
                readonly: false,
                type: 'string',
                validation: function (tree, v) {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: function (tree, object, dirname) {
                    var file = new SwfFile({
                        name: tree.name,
                        description: tree.description,
                        path: dirname,
                        type: 'file',
                        required: true
                    });
                    tree.updateChildren(file);
                }
            },
            forParam: {
                ishash: true,
                start: {
                    readonly: false,
                    type: 'number',
                    validation: function (tree, v) {
                        var num = parseInt(v);
                        if (tree.forParam !== undefined) {
                            return num < tree.forParam.end;
                        }
                        return true;
                    }
                },
                end: {
                    readonly: false,
                    type: 'number',
                    validation: function (tree, v) {
                        var num = parseInt(v);
                        if (tree.forParam !== undefined) {
                            return tree.forParam.start < num;
                        }
                        return true;
                    }
                },
                step: {
                    readonly: false,
                    type: 'number',
                    validation: function (tree, v) {
                        return parseInt(v) > 0;
                    }
                }
            },
            clean_up: {
                readonly: false,
                type: 'boolean'
            },
            max_size_recieve_file: {
                readonly: false,
                type: 'number'
            }
        };
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
        _this.propertyInfo = {
            name: {
                readonly: false,
                type: 'string',
                isUpdateUI: true
            },
            description: {
                readonly: false,
                type: 'string'
            },
            path: {
                readonly: false,
                type: 'string',
                validation: function (tree, v) {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: function (tree, object, dirname) {
                    var file = new SwfFile({
                        name: tree.name,
                        description: tree.description,
                        path: dirname,
                        type: 'file',
                        required: true
                    });
                    tree.updateChildren(file);
                }
            },
            clean_up: {
                readonly: false,
                type: 'boolean'
            },
            max_size_recieve_file: {
                readonly: false,
                type: 'number'
            }
        };
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
        _this.propertyInfo = {
            name: {
                readonly: false,
                type: 'string',
                isUpdateUI: true
            },
            description: {
                readonly: false,
                type: 'string'
            },
            path: {
                readonly: false,
                type: 'string',
                validation: function (tree, v) {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: function (tree, object, dirname) {
                    var file = new SwfFile({
                        name: tree.name,
                        description: tree.description,
                        path: dirname,
                        type: 'file',
                        required: true
                    });
                    tree.updateChildren(file);
                }
            },
            clean_up: {
                readonly: false,
                type: 'boolean'
            },
            max_size_recieve_file: {
                readonly: false,
                type: 'number'
            }
        };
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
        _this.propertyInfo = {
            name: {
                readonly: false,
                type: 'string',
                isUpdateUI: true
            },
            description: {
                readonly: false,
                type: 'string'
            },
            path: {
                readonly: false,
                type: 'string',
                validation: function (tree, v) {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: function (tree, object, dirname) {
                    var file = new SwfFile({
                        name: tree.name,
                        description: tree.description,
                        path: dirname,
                        type: 'file',
                        required: true
                    });
                    tree.updateChildren(file);
                }
            },
            script: {
                ishash: true,
                name: {
                    readonly: false,
                    type: 'string'
                },
                description: {
                    readonly: false,
                    type: 'string'
                },
                path: {
                    readonly: false,
                    type: 'string',
                }
            },
            input_files: [
                {
                    name: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: function (tree, v) {
                            return v.trim() ? true : false;
                        },
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: function (tree, newData, oldData) {
                            if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                                return true;
                            }
                            return !tree.isEnablePath(newData);
                        },
                        callback: function (tree, object, data) {
                            var newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateInputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    }
                }
            ],
            clean_up: {
                readonly: false,
                type: 'boolean'
            },
            max_size_recieve_file: {
                readonly: false,
                type: 'number'
            }
        };
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
        _this.propertyInfo = {
            name: {
                readonly: false,
                type: 'string',
                isUpdateUI: true
            },
            description: {
                readonly: false,
                type: 'string'
            },
            path: {
                readonly: false,
                type: 'string',
                validation: function (tree, v) {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: function (tree, object, dirname) {
                    var file = new SwfFile({
                        name: tree.name,
                        description: tree.description,
                        path: dirname,
                        type: 'file',
                        required: true
                    });
                    tree.updateChildren(file);
                }
            },
            script: {
                ishash: true,
                name: {
                    readonly: false,
                    type: 'string'
                },
                description: {
                    readonly: false,
                    type: 'string'
                },
                path: {
                    readonly: false,
                    type: 'string',
                }
            },
            input_files: [
                {
                    name: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: function (tree, v) {
                            return v.trim() ? true : false;
                        },
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: function (tree, newData, oldData) {
                            if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                                return true;
                            }
                            return !tree.isEnablePath(newData);
                        },
                        callback: function (tree, object, data) {
                            var newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateInputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: function (tree, object, name) {
                            var file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    }
                }
            ],
            clean_up: {
                readonly: false,
                type: 'boolean'
            },
            max_size_recieve_file: {
                readonly: false,
                type: 'number'
            }
        };
        return _this;
    }
    return TypeBreak;
}(JsonFileTypeBase));
//# sourceMappingURL=jsonFileType.js.map