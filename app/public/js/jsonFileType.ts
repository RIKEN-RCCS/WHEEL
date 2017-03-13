
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
    Break,
    PStudy
}

/**
 *
 */
interface PropertyInfo {
    key: string;
    readonly: boolean;
    type: string;
    isUpdateUI: boolean,
    validation: Function;
    callback: Function;
    order: number;
    title: string;
}

/**
 *
 */
class JsonFileTypeBase {
    protected extension: string;
    protected path: string;
    protected type: string;
    protected propertyInfo: any = [
        {
            key: 'name',
            readonly: false,
            type: 'string',
            isUpdateUI: true,
            order: 0,
            validation: (tree: SwfTree, v: string): boolean => {
                return v.trim().length > 0;
            },
            callback: (tree: SwfTree, object: any, name: string) => {
                const file = tree.toSwfFile();
                file.name = name;
                tree.updatePath(file);
            }
        },
        {
            key: 'description',
            readonly: false,
            type: 'string',
            order: 10,
            callback: (tree: SwfTree, object: any, description: string) => {
                const file = tree.toSwfFile();
                file.description = description;
                tree.updatePath(file);
            }
        },
        {
            key: 'path',
            readonly: false,
            type: 'string',
            order: 20,
            validation: (tree: SwfTree, v: string): boolean => {
                return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
            },
            callback: (tree: SwfTree, object: any, path: string) => {
                const file = tree.toSwfFile();
                file.path = path;
                tree.updatePath(file);
            }
        },
        {
            key: 'clean_up',
            title: 'property',
            readonly: false,
            type: 'boolean',
            order: 300
        },
        {
            key: 'max_size_receive_file',
            readonly: false,
            type: 'number',
            order: 310
        }
    ];
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
    protected addScript() {
        this.propertyInfo.push({
            key: 'script',
            ishash: true,
            order: 30,
            item: [
                {
                    key: 'name',
                    readonly: false,
                    type: 'string'
                },
                {
                    key: 'description',
                    readonly: false,
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: true,
                    type: 'string',
                }
            ],
            button: {
                key: 'Browse',
                title: 'script',
                callback: (tree: SwfTree) => {
                    $(document).trigger('selectFile', {
                        isMultiple: false,
                        callback: (files: FileList) => {
                            tree.setScriptPath(files[0]);
                        }
                    });
                }
            }
        });
    }
    protected addJobScript() {
        this.propertyInfo.push({
            key: 'job_script',
            ishash: true,
            order: 40,
            item: [
                {
                    key: 'name',
                    readonly: true
                },
                {
                    key: 'description',
                    readonly: true
                },
                {
                    key: 'path',
                    readonly: true
                }
            ]
        });
    }
    protected addForParam() {
        this.propertyInfo.push({
            key: 'forParam',
            ishash: true,
            order: 50,
            item: [
                {
                    key: 'start',
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
                {
                    key: 'end',
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
                {
                    key: 'step',
                    readonly: false,
                    type: 'number',
                    validation: (tree: SwfTree, v: string): boolean => {
                        return parseInt(v) > 0;
                    }
                }
            ]
        });
    }
    protected addInputFile() {
        this.propertyInfo.push({
            key: 'input_files',
            ishash: true,
            order: 100,
            button: {
                key: 'Add',
                title: 'input_files',
                isUpdateUI: true,
                callback: (tree: SwfTree) => {
                    const file = SwfFile.getDefault();
                    const parent = tree.getParent();
                    tree.input_files.push(file);
                    parent.addInputFileToParent(tree, file.path);
                }
            }
        });
        this.propertyInfo.push({
            key: 'input_files',
            isarray: true,
            order: 101,
            item: [
                {
                    key: 'name',
                    readonly: false,
                    type: 'string',
                    isUpdateUI: true,
                    validation: (tree: SwfTree, v: string): boolean => {
                        return v.trim().length > 0;
                    },
                    callback: (tree: SwfTree, object: any, name: string) => {
                        const file = new SwfFile(object);
                        file.name = name;
                        tree.updateInputFile(object, file);
                    }
                },
                {
                    key: 'description',
                    readonly: false,
                    type: 'string',
                    callback: (tree: SwfTree, object: any, description: string) => {
                        const file = new SwfFile(object);
                        file.description = description;
                        tree.updateInputFile(object, file);
                    }
                },
                {
                    key: 'path',
                    readonly: false,
                    type: 'string',
                    isUpdateUI: true,
                    validation: (tree: SwfTree, newData: string, oldData: string): boolean => {
                        if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                            return true;
                        }
                        return !tree.isEnablePath(newData);
                    },
                    callback: (tree: SwfTree, object: any, path: string) => {
                        const newFile = new SwfFile(object);
                        newFile.path = path;
                        newFile.type = ClientUtility.getIOFileType(newFile.path);
                        tree.updateInputFile(object, newFile);
                        object.type = newFile.type;
                    }
                },
                {
                    key: 'required',
                    readonly: false,
                    type: 'boolean',
                    callback: (tree: SwfTree, object: any, value: string) => {
                        const file = new SwfFile(object);
                        file.required = value === 'true';
                        tree.updateInputFile(object, file);
                    }
                }
            ],
            button: {
                key: 'Delete',
                title: 'input_file',
                isUpdateUI: true,
                callback: (tree: SwfTree, object: SwfFile) => {
                    const filepath = object.path;
                    const parent = tree.getParent();
                    parent.deleteInputFileFromParent(tree, filepath);
                    const index = tree.input_files.indexOf(object);
                    tree.input_files.splice(index, 1);
                }
            }
        });
    }
    protected addOutputFile() {
        this.propertyInfo.push({
            key: 'output_files',
            ishash: true,
            order: 110,
            button: {
                key: 'Add',
                title: 'output_files',
                isUpdateUI: true,
                callback: (tree: SwfTree) => {
                    const file = SwfFile.getDefault();
                    const parent = tree.getParent();
                    tree.output_files.push(file);
                    parent.addOutputFileToParent(tree, file.path);
                }
            }
        });
        this.propertyInfo.push({
            key: 'output_files',
            isarray: true,
            order: 111,
            item: [
                {
                    key: 'name',
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
                {
                    key: 'description',
                    readonly: false,
                    type: 'string',
                    callback: (tree: SwfTree, object: any, description: string) => {
                        const file = new SwfFile(object);
                        file.description = description;
                        tree.updateOutputFile(object, file);
                    }
                },
                {
                    key: 'path',
                    readonly: false,
                    type: 'string',
                    isUpdateUI: true,
                    validation: (tree: SwfTree, newData: string, oldData: string): boolean => {
                        if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                            return true;
                        }
                        return !tree.isEnablePath(newData);
                    },
                    callback: (tree: SwfTree, object: any, path: string) => {
                        const newFile = new SwfFile(object);
                        newFile.path = path;
                        newFile.type = ClientUtility.getIOFileType(newFile.path);
                        tree.updateOutputFile(object, newFile);
                        object.type = newFile.type;
                    }
                },
                {
                    key: 'required',
                    readonly: false,
                    type: 'boolean',
                    callback: (tree: SwfTree, object: any, value: string) => {
                        const file = new SwfFile(object);
                        file.required = value === 'true';
                        tree.updateOutputFile(object, file);
                    }
                }
            ],
            button: {
                key: 'Delete',
                title: 'output_file',
                isUpdateUI: true,
                callback: (tree: SwfTree, object: SwfFile) => {
                    const filepath = object.path;
                    const parent = tree.getParent();
                    parent.deleteOutputFileFromParent(tree, filepath);
                    const index = tree.output_files.indexOf(object);
                    tree.output_files.splice(index, 1);
                }
            }
        });
    }
    protected addSendFile() {
        this.propertyInfo.push({
            key: 'send_files',
            ishash: true,
            order: 120,
            button: {
                key: 'Browse',
                title: 'send_files',
                isUpdateUI: true,
                callback: (tree: SwfTree) => {
                    $(document).trigger('selectFile', {
                        isMultiple: true,
                        callback: (files: FileList) => {
                            tree.setSendFilepath(files);
                        }
                    });
                }
            }
        });
        this.propertyInfo.push({
            key: 'send_files',
            isarray: true,
            order: 121,
            item: [
                {
                    key: 'name',
                    readonly: false,
                    type: 'string',
                    validation: (tree: SwfTree, v: string): boolean => {
                        return v.trim() ? true : false;
                    }
                },
                {
                    key: 'description',
                    readonly: false,
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: true
                }
            ],
            button: {
                key: 'Delete',
                title: 'send_file',
                isUpdateUI: true,
                callback: (tree: SwfTree, object: SwfFile, name: string) => {
                   tree.deleteSendfile(object);
                }
            }
        });
    }
    protected addReceiveFile() {
        this.propertyInfo.push({
            key: 'receive_files',
            ishash: true,
            order: 130,
            button: {
                key: 'Add',
                title: 'receive_files',
                isUpdateUI: true,
                callback: (tree: SwfTree) => {
                    const file = SwfFile.getDefault();
                    tree.receive_files.push(file);
                }
            }
        });
        this.propertyInfo.push({
            key: 'receive_files',
            isarray: true,
            order: 131,
            item: [
                {
                    key: 'name',
                    readonly: false,
                    type: 'string',
                    validation: (tree: SwfTree, v: string): boolean => {
                        return v.trim() ? true : false;
                    }
                },
                {
                    key: 'description',
                    readonly: false,
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: false,
                    type: 'string',
                    validation: (tree: SwfTree, v: string): boolean => {
                        return !tree.isEnablePath(v);
                    },
                    callback: (tree: SwfTree, object: any, path: string) => {
                        object.type = ClientUtility.getIOFileType(path);
                    }
                }
            ],
            button: {
                key: 'Delete',
                title: 'receive_file',
                isUpdateUI: true,
                callback: (tree: SwfTree, object: SwfFile, name: string) => {
                    const filepath = object.path;
                    const parent = tree.getParent();
                    const index = tree.receive_files.indexOf(object);
                    tree.receive_files.splice(index, 1);
                }
            }
        });
    }
    protected addScriptParam() {
        this.propertyInfo.push({
            key: 'script_param',
            ishash: true,
            order: 140,
            item: [
                {
                    key: 'cores',
                    readonly: false,
                    type: 'number',
                    validation: (tree: SwfTree, v: string): boolean => {
                        return parseInt(v) > 0;
                    }
                },
                {
                    key: 'nodes',
                    readonly: false,
                    type: 'number',
                    validation: (tree: SwfTree, v: string): boolean => {
                        return parseInt(v) > 0;
                    }
                }
            ]
        });
    }
    protected addParameterFile() {
        this.propertyInfo.push({
            key: 'parameter_file',
            ishash: true,
            order: 150,
            item: [
                {
                    key: 'name',
                    readonly: false,
                    type: 'string'
                },
                {
                    key: 'description',
                    readonly: false,
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: true,
                    type: 'string',
                }
            ],
            button: {
                key: 'Browse',
                title: 'parameter_file',
                callback: (tree: SwfTree) => {
                    $(document).trigger('selectFile', {
                        isMultiple: false,
                        callback: (files: FileList) => {
                            tree.setParameterFile(files[0]);
                        }
                    });
                }
            }
        });
    }
    protected addHost() {
        this.propertyInfo.push({
            key: 'host',
            ishash: true,
            order: 200,
            item: [
                {
                    key: 'host',
                    readonly: false,
                    type: 'host'
                },
                {
                    key: 'job_scheduler',
                    readonly: false,
                    type: 'scheduler'
                }
            ]
        });
    }
    public getPropertyInfo(): any {
        this.propertyInfo.sort((a, b) => {
            if (a.order < b.order) {
                return -1;
            }
            else {
                return 1;
            }
        });
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
        this.addScript();
        this.addInputFile();
        this.addOutputFile();
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
        this.addScript();
        this.addJobScript();
        this.addInputFile();
        this.addOutputFile();
        this.addSendFile();
        this.addReceiveFile();
        this.addScriptParam();
        this.addHost();
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
        this.addScript();
        this.addInputFile();
        this.addOutputFile();
        this.addSendFile();
        this.addReceiveFile();
        this.addHost();
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
        this.addForParam();
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
        this.addScript();
        this.addInputFile();
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
        this.addScript();
        this.addInputFile();
    }
}

/**
 *
 */
class TypePStudy extends JsonFileTypeBase {
    public constructor() {
        super();
        this.extension = config.extension.pstudy;
        this.type = config.json_types.pstudy;
        this.addParameterFile();
    }
}