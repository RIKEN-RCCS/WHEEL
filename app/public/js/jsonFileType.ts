
/**
 * json file type
 */
enum JsonFileType {
    /**
     * Project
     */
    Project,
    /**
     * WorkFlow
     */
    WorkFlow,
    /**
     * Task
     */
    Task,
    /**
     * RemoteTask
     */
    RemoteTask,
    /**
     * Job
     */
    Job,
    /**
     * For
     */
    For,
    /**
     * If
     */
    If,
    /**
     * Else
     */
    Else,
    /**
     * Condition
     */
    Condition,
    /**
     * Break
     */
    Break,
    /**
     * PStudy
     */
    PStudy
}

/**
 * property information
 */
interface PropertyInfo {
    /**
     * property name of class
     */
    key: string;
    /**
     * display order number
     */
    order: number;
    /**
     * readonly or not function
     */
    readonly: Function;
    /**
     * property type string ('string', 'number', 'boolean', 'host' or 'scheduler')
     */
    type: string;
    /**
     * update user interface flag
     */
    isUpdateUI?: boolean;
    /**
     * input data validation function
     */
    validation?: Function;
    /**
     * callback function for event fired
     */
    callback?: Function;
    /**
     * highlighting text
     */
    title?: string;
}

/**
 * json file base class
 */
class JsonFileTypeBase {
    /**
     * json file extension
     */
    protected extension: string;
    /**
     * json file type
     */
    protected type: string;
    /**
     * property information
     */
    protected propertyInfo: any = [
        {
            key: 'name',
            readonly: () => { return false },
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
            readonly: () => { return false },
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
            readonly: () => { return false },
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
            readonly: () => { return false },
            type: 'boolean',
            order: 300
        },
        {
            key: 'max_size_receive_file',
            readonly: () => { return false },
            type: 'number',
            order: 310
        }
    ];

    /**
     * get extension string
     * @return get extension string
     */
    public getExtension(): string {
        return this.extension;
    }

    /**
     * get json file type string
     * @return get json file type string
     */
    public getType(): string {
        return this.type;
    }

    /**
     * whether specified string or SwfTree instance type is matched or not
     * @param target file type string or SwfTree instance
     * @return whether specified string or SwfTree instance type is matched or not
     */
    public checkFileType(target: (string | SwfTree | SwfTreeJson)): boolean {
        let type: string;
        if (typeof target === 'string') {
            type = target;
        }
        else {
            type = target.type;
        }
        return type === this.type;
    }

    /**
     * add script property information
     */
    protected addScript() {
        this.propertyInfo.push({
            key: 'script',
            ishash: true,
            order: 30,
            item: [
                {
                    key: 'name',
                    readonly: () => { return false },
                    type: 'string'
                },
                {
                    key: 'description',
                    readonly: () => { return false },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: (tree: SwfTree) => { return tree.isExistUploadScript() },
                    type: 'string',
                }
            ],
            button: [{
                key: 'Upload...',
                title: 'script',
                callback: (tree: SwfTree) => {
                    $(document).trigger('selectFile', {
                        isMultiple: false,
                        callback: (files: FileList) => {
                            tree.addScriptFile(files[0]);
                        }
                    });
                }
            }]
        });
    }

    /**
     * add job script property information
     */
    protected addJobScript() {
        this.propertyInfo.push({
            key: 'job_script',
            ishash: true,
            order: 40,
            item: [
                {
                    key: 'name',
                    readonly: () => { return false },
                    type: 'string'
                },
                {
                    key: 'description',
                    readonly: () => { return false },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: () => { return true },
                    type: 'string'
                }
            ],
            button: [{
                key: 'Upload...',
                title: 'job_script',
                callback: (tree: SwfTree) => {
                    $(document).trigger('selectFile', {
                        isMultiple: false,
                        callback: (files: FileList) => {
                            tree.addJobScriptFile(files[0]);
                        }
                    });
                }
            }]
        });
    }

    /**
     * add for loop property information
     */
    protected addForParam() {
        this.propertyInfo.push({
            key: 'forParam',
            ishash: true,
            order: 50,
            item: [
                {
                    key: 'start',
                    readonly: () => { return false },
                    type: 'number',
                    validation: (tree: SwfTree, v: string): boolean => {
                        const forWorkflow = <SwfForJson><any>tree;
                        const num: number = parseInt(v);
                        if (forWorkflow.forParam !== undefined) {
                            return num < forWorkflow.forParam.end;
                        }
                        return true;
                    }
                },
                {
                    key: 'end',
                    readonly: () => { return false },
                    type: 'number',
                    validation: (tree: SwfTree, v: string): boolean => {
                        const forWorkflow = <SwfForJson><any>tree;
                        const num: number = parseInt(v);
                        if (forWorkflow.forParam !== undefined) {
                            return forWorkflow.forParam.start < num;
                        }
                        return true;
                    }
                },
                {
                    key: 'step',
                    readonly: () => { return false },
                    type: 'number',
                    validation: (tree: SwfTree, v: string): boolean => {
                        return parseInt(v) > 0;
                    }
                }
            ]
        });
    }

    /**
     * add input files property information
     */
    protected addInputFile() {
        this.propertyInfo.push({
            key: 'input_files',
            ishash: true,
            order: 100,
            button: [{
                key: 'Add',
                title: 'input_files',
                isUpdateUI: true,
                callback: (tree: SwfTree) => {
                    const file = SwfFile.getDefault();
                    const parent = tree.getParent();
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
                    readonly: () => { return false },
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
                    readonly: () => { return false },
                    type: 'string',
                    callback: (tree: SwfTree, object: any, description: string) => {
                        const file = new SwfFile(object);
                        file.description = description;
                        tree.updateInputFile(object, file);
                    }
                },
                {
                    key: 'path',
                    readonly: () => { return false },
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
                    readonly: () => { return false },
                    type: 'boolean',
                    callback: (tree: SwfTree, object: any, value: string) => {
                        const file = new SwfFile(object);
                        file.required = value === 'true';
                        tree.updateInputFile(object, file);
                    }
                }
            ],
            button: [{
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
            }]
        });
    }

    /**
     * add output files property information
     */
    protected addOutputFile() {
        this.propertyInfo.push({
            key: 'output_files',
            ishash: true,
            order: 110,
            button: [{
                key: 'Add',
                title: 'output_files',
                isUpdateUI: true,
                callback: (tree: SwfTree) => {
                    const file = SwfFile.getDefault();
                    const parent = tree.getParent();
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
                    readonly: () => { return false },
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
                    readonly: () => { return false },
                    type: 'string',
                    callback: (tree: SwfTree, object: any, description: string) => {
                        const file = new SwfFile(object);
                        file.description = description;
                        tree.updateOutputFile(object, file);
                    }
                },
                {
                    key: 'path',
                    readonly: () => { return false },
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
                    readonly: () => { return false },
                    type: 'boolean',
                    callback: (tree: SwfTree, object: any, value: string) => {
                        const file = new SwfFile(object);
                        file.required = value === 'true';
                        tree.updateOutputFile(object, file);
                    }
                }
            ],
            button: [{
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
            }]
        });
    }

    /**
     * add send files property information
     */
    protected addSendFile() {
        this.propertyInfo.push({
            key: 'send_files',
            ishash: true,
            order: 120,
            button: [
                {
                    key: 'Upload...',
                    title: 'send_files',
                    isUpdateUI: true,
                    callback: (tree: SwfTree) => {
                        $(document).trigger('selectFile', {
                            isMultiple: true,
                            callback: (files: FileList) => {
                                tree.addSendFile(files);
                            }
                        });
                    }
                },
                {
                    key: 'Add',
                    title: 'send_files',
                    isUpdateUI: true,
                    callback: (tree: SwfTree) => {
                        const rtask = <SwfRemoteTask><any>tree;
                        const file = SwfFile.getDefault();
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
                    readonly: () => { return false },
                    type: 'string',
                    validation: (tree: SwfTree, v: string): boolean => {
                        return v.trim() ? true : false;
                    }
                },
                {
                    key: 'description',
                    readonly: () => { return false },
                    type: 'string'
                },
                {
                    key: 'path',
                    type: 'string',
                    readonly: (tree: SwfTree, sendFile: SwfFile) => {
                        return tree.isExistSendfile(sendFile);
                    },
                    validation: (tree: SwfTree, v: string): boolean => {
                        return !tree.isEnablePath(v);
                    },
                    callback: (tree: SwfTree, object: any, path: string) => {
                        object.type = ClientUtility.getIOFileType(path);
                    }
                }
            ],
            button: [{
                key: 'Delete',
                title: 'send_file',
                isUpdateUI: true,
                callback: (tree: SwfTree, object: SwfFile, name: string) => {
                    tree.deleteSendfile(object);
                }
            }]
        });
    }

    /**
     * add receive files property information
     */
    protected addReceiveFile() {
        this.propertyInfo.push({
            key: 'receive_files',
            ishash: true,
            order: 130,
            button: [{
                key: 'Add',
                title: 'receive_files',
                isUpdateUI: true,
                callback: (tree: SwfTree) => {
                    const rtask = <SwfRemoteTask><any>tree;
                    const file = SwfFile.getDefault();
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
                    readonly: () => { return false },
                    type: 'string',
                    validation: (tree: SwfTree, v: string): boolean => {
                        return v.trim() ? true : false;
                    }
                },
                {
                    key: 'description',
                    readonly: () => { return false },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: () => { return false },
                    type: 'string',
                    validation: (tree: SwfTree, v: string): boolean => {
                        return !tree.isEnablePath(v);
                    },
                    callback: (tree: SwfTree, object: any, path: string) => {
                        object.type = ClientUtility.getIOFileType(path);
                    }
                },
                {
                    key: 'required',
                    readonly: () => { return false },
                    type: 'boolean'
                }
            ],
            button: [{
                key: 'Delete',
                title: 'receive_file',
                isUpdateUI: true,
                callback: (tree: SwfTree, object: SwfFile, name: string) => {
                    const rtask = <SwfRemoteTask><any>tree;
                    const index = rtask.receive_files.indexOf(object);
                    rtask.receive_files.splice(index, 1);
                }
            }]
        });
    }

    /**
     * add script parameter property information
     */
    protected addScriptParam() {
        this.propertyInfo.push({
            key: 'script_param',
            ishash: true,
            order: 140,
            item: [
                {
                    key: 'cores',
                    readonly: () => { return false },
                    type: 'number',
                    validation: (tree: SwfTree, v: string): boolean => {
                        return parseInt(v) > 0;
                    }
                },
                {
                    key: 'nodes',
                    readonly: () => { return false },
                    type: 'number',
                    validation: (tree: SwfTree, v: string): boolean => {
                        return parseInt(v) > 0;
                    }
                }
            ]
        });
    }

    /**
     * add parameter file property information
     */
    protected addParameterFile() {
        this.propertyInfo.push({
            key: 'parameter_file',
            ishash: true,
            order: 150,
            item: [
                {
                    key: 'name',
                    readonly: () => { return false },
                    type: 'string'
                },
                {
                    key: 'description',
                    readonly: () => { return false },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: () => { return true },
                    type: 'string',
                }
            ],
            button: [{
                key: 'Upload...',
                title: 'parameter_file',
                callback: (tree: SwfTree) => {
                    $(document).trigger('selectFile', {
                        isMultiple: false,
                        callback: (files: FileList) => {
                            tree.addParameterFile(files[0]);
                        }
                    });
                }
            }]
        });
    }

    /**
     * add host property information
     */
    protected addHost() {
        this.propertyInfo.push({
            key: 'remote',
            ishash: true,
            order: 200,
            item: [
                {
                    key: 'host',
                    readonly: () => { return false },
                    type: 'host'
                }
            ]
        });
    }

    /**
     * add upload property information
     */
    protected addUpload() {
        this.propertyInfo.push({
            key: 'upload_files',
            ishash: true,
            order: 400,
            button: [{
                key: 'Upload...',
                title: 'upload_files',
                isUpdateUI: true,
                callback: (tree: SwfTree) => {
                    $(document).trigger('selectFile', {
                        isMultiple: true,
                        callback: (files: FileList) => {
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
                    readonly: () => { return true }
                }
            ],
            button: [{
                key: 'Delete',
                title: 'upload_file',
                isUpdateUI: true,
                callback: (tree: SwfTree, object: File, name: string) => {
                    tree.deleteUploadfile(object);
                }
            }]
        });
    }

    /**
     * sort property info
     */
    protected sortPropertyInfo() {
        this.propertyInfo.sort((a, b) => a.order < b.order ? -1 : 1);
    }

    /**
     * get property information
     * @returns property information
     */
    public getPropertyInfo(): any {

        return this.propertyInfo;
    }
}

/**
 * type of project class
 */
class TypeProject extends JsonFileTypeBase {
    /**
     *
     */
    public constructor() {
        super();
        this.extension = config.extension.project;
    }
}

/**
 * type of task class
 */
class TypeTask extends JsonFileTypeBase {
    /**
     * create new instance for task
     */
    public constructor() {
        super();
        this.extension = config.extension.task;
        this.type = config.json_types.task;
        this.addScript();
        this.addInputFile();
        this.addOutputFile();
        this.addUpload();
        this.sortPropertyInfo();
    }
}

/**
 * type of workflow class
 */
class TypeWorkflow extends JsonFileTypeBase {
    /**
     * create new instance for workflow
     */
    public constructor() {
        super();
        this.extension = config.extension.workflow;
        this.type = config.json_types.workflow;
        this.addUpload();
    }
}

/**
 * type of job class
 */
class TypeJob extends JsonFileTypeBase {
    /**
     * create new instance for job
     */
    public constructor() {
        super();
        this.extension = config.extension.job;
        this.type = config.json_types.job;
        this.addScrip();
        this.addJobScript();
        this.addInputFile();
        this.addOutputFile();
        this.addSendFile();
        this.addReceiveFile();
        this.addScriptParam();
        this.addHost();
        this.sortPropertyInfo();
    }

    /**
     * add script property information for job
     */
    protected addScrip() {
        this.propertyInfo.push({
            key: 'script',
            ishash: true,
            order: 30,
            item: [
                {
                    key: 'name',
                    readonly: () => { return false },
                    type: 'string'
                },
                {
                    key: 'description',
                    readonly: () => { return false },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: () => { return true },
                    type: 'string'
                }
            ],
            button: [{
                key: 'Edit',
                title: 'submit_script',
                validation: (tree: SwfTree) => {
                    const jobTask = <SwfJobJson><any>tree;
                    if (jobTask.job_script.path) {
                        return true;
                    }
                    else {
                        return false;
                    }
                },
                callback: (tree: SwfTree) => {
                    $(document).trigger('editScript');
                }
            }]
        });
    }

    /**
     * add host property information for job
     */
    protected addHost() {
        this.propertyInfo.push({
            key: 'remote',
            ishash: true,
            order: 200,
            item: [
                {
                    key: 'host',
                    readonly: () => { return false },
                    type: 'host'
                },
                {
                    key: 'job_scheduler',
                    readonly: () => { return false },
                    type: 'scheduler'
                }
            ]
        });
    }
}

/**
 * type of remote task class
 */
class TypeRemoteTask extends JsonFileTypeBase {
    /**
     * create new instance for remote task
     */
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
        this.sortPropertyInfo();
    }
}

/**
 * type of for class
 */
class TypeFor extends JsonFileTypeBase {
    /**
     * create new instance for loop
     */
    public constructor() {
        super();
        this.extension = config.extension.for;
        this.type = config.json_types.for;
        this.addForParam();
        this.addUpload();
        this.sortPropertyInfo();
    }
}

/**
 * type of if class
 */
class TypeIf extends JsonFileTypeBase {
    /**
     * create new instance for if
     */
    public constructor() {
        super();
        this.extension = config.extension.if;
        this.type = config.json_types.if;
        this.addUpload();
    }
}

/**
 * type of else class
 */
class TypeElse extends JsonFileTypeBase {
    /**
     * create new instance for else
     */
    public constructor() {
        super();
        this.extension = config.extension.else;
        this.type = config.json_types.else;
        this.addUpload();
    }
}

/**
 * type of condition class
 */
class TypeCondition extends JsonFileTypeBase {
    /**
     * create new instance for condition
     */
    public constructor() {
        super();
        this.extension = config.extension.condition;
        this.type = config.json_types.condition;
        this.addScript();
        this.addInputFile();
        this.addOutputFile();
        this.addUpload();
        this.sortPropertyInfo();
    }

    /**
     * add output files property information for condition
     */
    protected addOutputFile() {
        this.propertyInfo.push({
            key: 'output_files',
            ishash: true,
            order: 110,
            button: [{
                key: 'Add',
                title: 'output_files',
                isUpdateUI: true,
                callback: (tree: SwfTree) => {
                    const file = SwfFile.getDefault();
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
                    readonly: () => { return false },
                    type: 'string',
                    isUpdateUI: true,
                    validation: (tree: SwfTree, v: string): boolean => {
                        return v.trim() ? true : false;
                    }
                },
                {
                    key: 'description',
                    readonly: () => { return false },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: () => { return false },
                    type: 'string',
                    validation: (tree: SwfTree, v: string): boolean => {
                        return !tree.isEnablePath(v);
                    },
                    callback: (tree: SwfTree, object: SwfFile, path: string) => {
                        object.type = ClientUtility.getIOFileType(path);
                    }
                },
                {
                    key: 'required',
                    readonly: () => { return false },
                    type: 'boolean'
                }
            ],
            button: [{
                key: 'Delete',
                title: 'output_file',
                isUpdateUI: true,
                callback: (tree: SwfTree, object: SwfFile) => {
                    const index = tree.output_files.indexOf(object);
                    tree.output_files.splice(index, 1);
                }
            }]
        });
    }
}

/**
 * type of break class
 */
class TypeBreak extends JsonFileTypeBase {
    /**
     * create new instance for break
     */
    public constructor() {
        super();
        this.extension = config.extension.break;
        this.type = config.json_types.break;
        this.addScript();
        this.addInputFile();
        this.addOutputFile();
        this.addUpload();
        this.sortPropertyInfo();
    }

    /**
     * add output files property information for break
     */
    protected addOutputFile() {
        this.propertyInfo.push({
            key: 'output_files',
            ishash: true,
            order: 110,
            button: [{
                key: 'Add',
                title: 'output_files',
                isUpdateUI: true,
                callback: (tree: SwfTree) => {
                    const file = SwfFile.getDefault();
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
                    readonly: () => { return false },
                    type: 'string',
                    isUpdateUI: true,
                    validation: (tree: SwfTree, v: string): boolean => {
                        return v.trim() ? true : false;
                    }
                },
                {
                    key: 'description',
                    readonly: () => { return false },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: () => { return false },
                    type: 'string',
                    validation: (tree: SwfTree, v: string): boolean => {
                        return !tree.isEnablePath(v);
                    },
                    callback: (tree: SwfTree, object: SwfFile, path: string) => {
                        object.type = ClientUtility.getIOFileType(path);
                    }
                },
                {
                    key: 'required',
                    readonly: () => { return false },
                    type: 'boolean'
                }
            ],
            button: [{
                key: 'Delete',
                title: 'output_file',
                isUpdateUI: true,
                callback: (tree: SwfTree, object: SwfFile) => {
                    const index = tree.output_files.indexOf(object);
                    tree.output_files.splice(index, 1);
                }
            }]
        });
    }
}

/**
 * type of parameter study class
 */
class TypePStudy extends JsonFileTypeBase {
    /**
     * create new instance for parameter study
     */
    public constructor() {
        super();
        this.extension = config.extension.pstudy;
        this.type = config.json_types.pstudy;
        this.addParameterFile();
        this.addUpload();
        this.sortPropertyInfo();
    }
}