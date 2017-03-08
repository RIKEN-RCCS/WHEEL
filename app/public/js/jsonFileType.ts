
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
 *
 */
interface PropertyInfo {
    readonly: boolean;
    type: string;
    isUpdateUI: boolean,
    validation: Function;
    callback: Function;
}

/**
 *
 */
class JsonFileTypeBase {
    protected propertyInfo: Object;
    protected extension: string;
    protected path: string;
    protected type: string;
    public getExtension(): string {
        return this.extension;
    }
    public getType(): string {
        return this.type;
    }
    public checkExtension(target: (string | SwfTree | SwfTreeJson)) {
        let filename: string;
        if (typeof target === 'string') {
            filename = target;
        }
        else {
            filename = target.path;
        }

        if (filename.match(new RegExp(`${this.extension.replace(/\./, '\\.')}$`))) {
            return true;
        }
        else {
            return false;
        }
    }
    public checkFileType(target: (string | SwfTree | SwfTreeJson)) {
        let type: string;
        if (typeof target === 'string') {
            type = target;
        }
        else {
            type = target.type;
        }
        return type === this.type;
    }
    public getPropertyInfo(): Object {
        return this.propertyInfo;
    }
}

/**
 *
 */
class TypeProject extends JsonFileTypeBase {
    public constructor() {
        super();
        this.extension = config.extension.project;
    }
}

/**
 *
 */
class TypeTask extends JsonFileTypeBase {
    public constructor() {
        super();
        this.extension = config.extension.task;
        this.type = config.json_types.task;
        this.propertyInfo = {
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
                validation: (tree: SwfTree, v: string): boolean => {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: (tree: SwfTree, object: any, dirname: string) => {
                    const file = new SwfFile({
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
                        validation: (tree: SwfTree, v: string): boolean => {
                            return v.trim() ? true : false;
                        },
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: (tree: SwfTree, newData: string, oldData: string): boolean => {
                            if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                                return true;
                            }
                            return !tree.isEnablePath(newData);
                        },
                        callback: (tree: SwfTree, object: any, data: string) => {
                            const newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateInputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
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
                        validation: (tree: SwfTree, v: string): boolean => {
                            return v.trim() ? true : false;
                        },
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateOutputFile(object, file);
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateOutputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: (tree: SwfTree, v: string): boolean => {
                            return !tree.isEnablePath(v);
                        },
                        callback: (tree: SwfTree, object: any, data: string) => {
                            const newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateOutputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
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
    }
}

/**
 *
 */
class TypeWorkflow extends JsonFileTypeBase {
    public constructor() {
        super();
        this.extension = config.extension.workflow;
        this.type = config.json_types.workflow;
        this.propertyInfo = {
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
                validation: (tree: SwfTree, v: string): boolean => {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: (tree: SwfTree, object: any, dirname: string) => {
                    const file = new SwfFile({
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
    }
}

/**
 *
 */
class TypeJob extends JsonFileTypeBase {
    public constructor() {
        super();
        this.extension = config.extension.job;
        this.type = config.json_types.job;
        this.propertyInfo = {
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
                validation: (tree: SwfTree, v: string): boolean => {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: (tree: SwfTree, object: any, dirname: string) => {
                    const file = new SwfFile({
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
                        validation: (tree: SwfTree, v: string): boolean => {
                            return v.trim() ? true : false;
                        },
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: (tree: SwfTree, newData: string, oldData: string): boolean => {
                            if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                                return true;
                            }
                            return !tree.isEnablePath(newData);
                        },
                        callback: (tree: SwfTree, object: any, data: string) => {
                            const newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateInputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
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
                        validation: (tree: SwfTree, v: string): boolean => {
                            return v.trim() ? true : false;
                        },
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateOutputFile(object, file);
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateOutputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: (tree: SwfTree, v: string): boolean => {
                            return !tree.isEnablePath(v);
                        },
                        callback: (tree: SwfTree, object: any, data: string) => {
                            const newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateOutputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
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
                        validation: (tree: SwfTree, v: string): boolean => {
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
                        validation: (tree: SwfTree, v: string): boolean => {
                            return !tree.isEnablePath(v);
                        },
                        callback: (tree: SwfTree, oldFile: SwfFile, newFile: SwfFile) => {
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
                        validation: (tree: SwfTree, v: string): boolean => {
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
                        validation: (tree: SwfTree, v: string): boolean => {
                            return !tree.isEnablePath(v);
                        },
                        callback: (tree: SwfTree, oldFile: SwfFile, newFile: SwfFile) => {
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
                    validation: (tree: SwfTree, v: string): boolean => {
                        return parseInt(v) > 0;
                    }
                },
                nodes: {
                    readonly: false,
                    type: 'number',
                    validation: (tree: SwfTree, v: string): boolean => {
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
    }
}

/**
 *
 */
class TypeRemoteTask extends JsonFileTypeBase {
    public constructor() {
        super();
        this.extension = config.extension.remotetask;
        this.type = config.json_types.remotetask;
        this.propertyInfo = {
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
                validation: (tree: SwfTree, v: string): boolean => {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: (tree: SwfTree, object: any, dirname: string) => {
                    const file = new SwfFile({
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
                        validation: (tree: SwfTree, v: string): boolean => {
                            return v.trim() ? true : false;
                        },
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: (tree: SwfTree, newData: string, oldData: string): boolean => {
                            if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                                return true;
                            }
                            return !tree.isEnablePath(newData);
                        },
                        callback: (tree: SwfTree, object: any, data: string) => {
                            const newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateInputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
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
                        validation: (tree: SwfTree, v: string): boolean => {
                            return v.trim() ? true : false;
                        },
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateOutputFile(object, file);
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateOutputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: (tree: SwfTree, v: string): boolean => {
                            return !tree.isEnablePath(v);
                        },
                        callback: (tree: SwfTree, object: any, data: string) => {
                            const newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateOutputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
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
                        validation: (tree: SwfTree, v: string): boolean => {
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
                        validation: (tree: SwfTree, v: string): boolean => {
                            return !tree.isEnablePath(v);
                        },
                        callback: (tree: SwfTree, oldFile: SwfFile, newFile: SwfFile) => {
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
                        validation: (tree: SwfTree, v: string): boolean => {
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
                        validation: (tree: SwfTree, v: string): boolean => {
                            return !tree.isEnablePath(v);
                        },
                        callback: (tree: SwfTree, oldFile: SwfFile, newFile: SwfFile) => {
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
    }
}

/**
 *
 */
class TypeLoop extends JsonFileTypeBase {
    public constructor() {
        super();
        this.extension = config.extension.loop;
        this.type = config.json_types.loop;
        this.propertyInfo = {
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
                validation: (tree: SwfTree, v: string): boolean => {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: (tree: SwfTree, object: any, dirname: string) => {
                    const file = new SwfFile({
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
                    validation: (tree: SwfTree, v: string): boolean => {
                        const num: number = parseInt(v);
                        if (tree.forParam !== undefined) {
                            return num < tree.forParam.end;
                        }
                        return true;
                    }
                },
                end: {
                    readonly: false,
                    type: 'number',
                    validation: (tree: SwfTree, v: string): boolean => {
                        const num: number = parseInt(v);
                        if (tree.forParam !== undefined) {
                            return tree.forParam.start < num;
                        }
                        return true;
                    }
                },
                step: {
                    readonly: false,
                    type: 'number',
                    validation: (tree: SwfTree, v: string): boolean => {
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
    }
}

/**
 *
 */
class TypeIf extends JsonFileTypeBase {
    public constructor() {
        super();
        this.extension = config.extension.if;
        this.type = config.json_types.if;
        this.propertyInfo = {
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
                validation: (tree: SwfTree, v: string): boolean => {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: (tree: SwfTree, object: any, dirname: string) => {
                    const file = new SwfFile({
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
    }
}

/**
 *
 */
class TypeElse extends JsonFileTypeBase {
    public constructor() {
        super();
        this.extension = config.extension.else;
        this.type = config.json_types.else;
        this.propertyInfo = {
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
                validation: (tree: SwfTree, v: string): boolean => {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: (tree: SwfTree, object: any, dirname: string) => {
                    const file = new SwfFile({
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
    }
}

/**
 *
 */
class TypeCondition extends JsonFileTypeBase {
    public constructor() {
        super();
        this.extension = config.extension.condition;
        this.type = config.json_types.condition;
        this.propertyInfo = {
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
                validation: (tree: SwfTree, v: string): boolean => {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: (tree: SwfTree, object: any, dirname: string) => {
                    const file = new SwfFile({
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
                        validation: (tree: SwfTree, v: string): boolean => {
                            return v.trim() ? true : false;
                        },
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: (tree: SwfTree, newData: string, oldData: string): boolean => {
                            if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                                return true;
                            }
                            return !tree.isEnablePath(newData);
                        },
                        callback: (tree: SwfTree, object: any, data: string) => {
                            const newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateInputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
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
    }
}

/**
 *
 */
class TypeBreak extends JsonFileTypeBase {
    public constructor() {
        super();
        this.extension = config.extension.break;
        this.type = config.json_types.break;
        this.propertyInfo = {
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
                validation: (tree: SwfTree, v: string): boolean => {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: (tree: SwfTree, object: any, dirname: string) => {
                    const file = new SwfFile({
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
                        validation: (tree: SwfTree, v: string): boolean => {
                            return v.trim() ? true : false;
                        },
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    description: {
                        readonly: false,
                        type: 'string',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
                            file.name = name;
                            tree.updateInputFile(object, file);
                        }
                    },
                    path: {
                        readonly: false,
                        type: 'string',
                        isUpdateUI: true,
                        validation: (tree: SwfTree, newData: string, oldData: string): boolean => {
                            if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                                return true;
                            }
                            return !tree.isEnablePath(newData);
                        },
                        callback: (tree: SwfTree, object: any, data: string) => {
                            const newFile = new SwfFile(object);
                            newFile.path = data;
                            newFile.type = ClientUtility.getIOFileType(newFile.path);
                            tree.updateInputFile(object, newFile);
                            object.type = newFile.type;
                        }
                    },
                    required: {
                        readonly: false,
                        type: 'boolean',
                        callback: (tree: SwfTree, object: any, name: string) => {
                            const file = new SwfFile(object);
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
    }
}