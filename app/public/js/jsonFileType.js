/**
 * json file base class
 */
class JsonFileTypeBase {
    /**
     * create new instance
     * @param type SwfType
     */
    constructor(type) {
        /**
         * property information
         */
        this.propertyInfo = [
            {
                key: 'name',
                readonly: () => { return false; },
                type: 'string',
                isUpdateUI: true,
                order: 0,
                validation: (tree, v) => {
                    return v.trim().length > 0;
                },
                callback: (tree, object, name) => {
                    const file = tree.toSwfFile();
                    file.name = name;
                    tree.updatePath(file);
                }
            },
            {
                key: 'description',
                readonly: () => { return false; },
                type: 'string',
                order: 10,
                callback: (tree, object, description) => {
                    const file = tree.toSwfFile();
                    file.description = description;
                    tree.updatePath(file);
                }
            },
            {
                key: 'path',
                readonly: () => { return false; },
                type: 'string',
                order: 20,
                validation: (tree, v) => {
                    return ClientUtility.isValidDirectoryName(v) && !tree.getParent().isDirnameDuplicate(v);
                },
                callback: (tree, object, path) => {
                    const file = tree.toSwfFile();
                    file.path = path;
                    tree.updatePath(file);
                }
            },
            {
                key: 'clean_up',
                readonly: () => { return false; },
                type: 'boolean',
                order: 300
            },
            {
                key: 'max_size_receive_file',
                readonly: () => { return false; },
                type: 'number',
                order: 310
            }
        ];
        this.type = type;
    }
    /**
     * get extension string
     * @return get extension string
     */
    getExtension() {
        return config.extension[this.type.toLowerCase()];
    }
    /**
     * get json file type string
     * @return get json file type string
     */
    getType() {
        return this.type;
    }
    /**
     * get default json file name
     * @return get default json file name
     */
    getDefaultName() {
        return `${config.default_filename}${this.getExtension()}`;
    }
    /**
     * add script property information
     */
    addScript() {
        this.propertyInfo.push({
            key: 'script',
            ishash: true,
            order: 30,
            item: [
                {
                    key: 'name',
                    readonly: () => { return false; },
                    type: 'string'
                },
                {
                    key: 'description',
                    readonly: () => { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: (tree) => { return tree.isExistUploadScript(); },
                    type: 'string',
                }
            ],
            button: [{
                    key: 'Upload...',
                    title: 'script',
                    callback: (tree) => {
                        $(document).trigger('selectFile', {
                            isMultiple: false,
                            callback: (files) => {
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
    addJobScript() {
        this.propertyInfo.push({
            key: 'job_script',
            ishash: true,
            order: 40,
            item: [
                {
                    key: 'name',
                    readonly: () => { return false; },
                    type: 'string'
                },
                {
                    key: 'description',
                    readonly: () => { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: () => { return true; },
                    type: 'string'
                }
            ],
            button: [{
                    key: 'Upload...',
                    title: 'job_script',
                    callback: (tree) => {
                        $(document).trigger('selectFile', {
                            isMultiple: false,
                            callback: (files) => {
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
    addForParam() {
        this.propertyInfo.push({
            key: 'forParam',
            ishash: true,
            order: 50,
            item: [
                {
                    key: 'start',
                    readonly: () => { return false; },
                    type: 'number',
                    validation: (tree, v) => {
                        const forWorkflow = tree;
                        const num = parseInt(v);
                        if (forWorkflow.forParam !== undefined) {
                            return num < forWorkflow.forParam.end;
                        }
                        return true;
                    }
                },
                {
                    key: 'end',
                    readonly: () => { return false; },
                    type: 'number',
                    validation: (tree, v) => {
                        const forWorkflow = tree;
                        const num = parseInt(v);
                        if (forWorkflow.forParam !== undefined) {
                            return forWorkflow.forParam.start < num;
                        }
                        return true;
                    }
                },
                {
                    key: 'step',
                    readonly: () => { return false; },
                    type: 'number',
                    validation: (tree, v) => {
                        return parseInt(v) > 0;
                    }
                }
            ]
        });
    }
    /**
     * add input files property information
     */
    addInputFile() {
        this.propertyInfo.push({
            key: 'input_files',
            ishash: true,
            order: 100,
            button: [{
                    key: 'Add',
                    title: 'input_files',
                    isUpdateUI: true,
                    callback: (tree) => {
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
                    readonly: () => { return false; },
                    type: 'string',
                    isUpdateUI: true,
                    validation: (tree, v) => {
                        return v.trim().length > 0;
                    },
                    callback: (tree, object, name) => {
                        const file = new SwfFile(object);
                        file.name = name;
                        tree.updateInputFile(object, file);
                    }
                },
                {
                    key: 'description',
                    readonly: () => { return false; },
                    type: 'string',
                    callback: (tree, object, description) => {
                        const file = new SwfFile(object);
                        file.description = description;
                        tree.updateInputFile(object, file);
                    }
                },
                {
                    key: 'path',
                    readonly: () => { return false; },
                    type: 'string',
                    isUpdateUI: true,
                    validation: (tree, newData, oldData) => {
                        if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                            return true;
                        }
                        return !tree.isEnablePath(newData);
                    },
                    callback: (tree, object, path) => {
                        const newFile = new SwfFile(object);
                        newFile.path = path;
                        newFile.type = SwfFileType.getFileType(newFile);
                        tree.updateInputFile(object, newFile);
                        object.type = newFile.type;
                    }
                },
                {
                    key: 'required',
                    readonly: () => { return false; },
                    type: 'boolean',
                    callback: (tree, object, value) => {
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
                    callback: (tree, object) => {
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
    addOutputFile() {
        this.propertyInfo.push({
            key: 'output_files',
            ishash: true,
            order: 110,
            button: [{
                    key: 'Add',
                    title: 'output_files',
                    isUpdateUI: true,
                    callback: (tree) => {
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
                    readonly: () => { return false; },
                    type: 'string',
                    isUpdateUI: true,
                    validation: (tree, v) => {
                        return v.trim() ? true : false;
                    },
                    callback: (tree, object, name) => {
                        const file = new SwfFile(object);
                        file.name = name;
                        tree.updateOutputFile(object, file);
                    }
                },
                {
                    key: 'description',
                    readonly: () => { return false; },
                    type: 'string',
                    callback: (tree, object, description) => {
                        const file = new SwfFile(object);
                        file.description = description;
                        tree.updateOutputFile(object, file);
                    }
                },
                {
                    key: 'path',
                    readonly: () => { return false; },
                    type: 'string',
                    isUpdateUI: true,
                    validation: (tree, newData, oldData) => {
                        if (ClientUtility.normalize(newData) === ClientUtility.normalize(oldData)) {
                            return true;
                        }
                        return !tree.isEnablePath(newData);
                    },
                    callback: (tree, object, path) => {
                        const newFile = new SwfFile(object);
                        newFile.path = path;
                        newFile.type = SwfFileType.getFileType(newFile);
                        tree.updateOutputFile(object, newFile);
                        object.type = newFile.type;
                    }
                },
                {
                    key: 'required',
                    readonly: () => { return false; },
                    type: 'boolean',
                    callback: (tree, object, value) => {
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
                    callback: (tree, object) => {
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
    addSendFile() {
        this.propertyInfo.push({
            key: 'send_files',
            ishash: true,
            order: 120,
            button: [
                {
                    key: 'Upload...',
                    title: 'send_files',
                    isUpdateUI: true,
                    callback: (tree) => {
                        $(document).trigger('selectFile', {
                            isMultiple: true,
                            callback: (files) => {
                                tree.addSendFile(files);
                            }
                        });
                    }
                },
                {
                    key: 'Add',
                    title: 'send_files',
                    isUpdateUI: true,
                    callback: (tree) => {
                        const rtask = tree;
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
                    readonly: () => { return false; },
                    type: 'string',
                    validation: (tree, v) => {
                        return v.trim() ? true : false;
                    }
                },
                {
                    key: 'description',
                    readonly: () => { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    type: 'string',
                    readonly: (tree, sendFile) => {
                        return tree.isExistSendfile(sendFile);
                    },
                    callback: (tree, object, path) => {
                        object.type = SwfFileType.getFileType(path);
                    }
                }
            ],
            button: [{
                    key: 'Delete',
                    title: 'send_file',
                    isUpdateUI: true,
                    callback: (tree, object, name) => {
                        tree.deleteSendfile(object);
                    }
                }]
        });
    }
    /**
     * add receive files property information
     */
    addReceiveFile() {
        this.propertyInfo.push({
            key: 'receive_files',
            ishash: true,
            order: 130,
            button: [{
                    key: 'Add',
                    title: 'receive_files',
                    isUpdateUI: true,
                    callback: (tree) => {
                        const rtask = tree;
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
                    readonly: () => { return false; },
                    type: 'string',
                    validation: (tree, v) => {
                        return v.trim() ? true : false;
                    }
                },
                {
                    key: 'description',
                    readonly: () => { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: () => { return false; },
                    type: 'string',
                    callback: (tree, object, path) => {
                        object.type = SwfFileType.getFileType(path);
                    }
                },
                {
                    key: 'required',
                    readonly: () => { return false; },
                    type: 'boolean'
                }
            ],
            button: [{
                    key: 'Delete',
                    title: 'receive_file',
                    isUpdateUI: true,
                    callback: (tree, object, name) => {
                        const rtask = tree;
                        const index = rtask.receive_files.indexOf(object);
                        rtask.receive_files.splice(index, 1);
                    }
                }]
        });
    }
    /**
     * add script parameter property information
     */
    addScriptParam() {
        this.propertyInfo.push({
            key: 'script_param',
            ishash: true,
            order: 140,
            item: [
                {
                    key: 'cores',
                    readonly: () => { return false; },
                    type: 'number',
                    validation: (tree, v) => {
                        return parseInt(v) > 0;
                    }
                },
                {
                    key: 'nodes',
                    readonly: () => { return false; },
                    type: 'number',
                    validation: (tree, v) => {
                        return parseInt(v) > 0;
                    }
                }
            ]
        });
    }
    /**
     * add parameter file property information
     */
    addParameterFile() {
        this.propertyInfo.push({
            key: 'parameter_file',
            ishash: true,
            order: 150,
            item: [
                {
                    key: 'name',
                    readonly: () => { return false; },
                    type: 'string'
                },
                {
                    key: 'description',
                    readonly: () => { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: () => { return true; },
                    type: 'string',
                }
            ],
            button: [{
                    key: 'Upload...',
                    title: 'parameter_file',
                    callback: (tree) => {
                        $(document).trigger('selectFile', {
                            isMultiple: false,
                            callback: (files) => {
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
    addHost() {
        this.propertyInfo.push({
            key: 'remote',
            ishash: true,
            order: 200,
            item: [
                {
                    key: 'host',
                    readonly: () => { return false; },
                    type: 'host'
                }
            ]
        });
    }
    /**
     * add upload property information
     */
    addUpload() {
        this.propertyInfo.push({
            key: 'upload_files',
            ishash: true,
            order: 400,
            button: [{
                    key: 'Upload...',
                    title: 'upload_files',
                    isUpdateUI: true,
                    callback: (tree) => {
                        $(document).trigger('selectFile', {
                            isMultiple: true,
                            callback: (files) => {
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
                    readonly: () => { return true; }
                }
            ],
            button: [{
                    key: 'Delete',
                    title: 'upload_file',
                    isUpdateUI: true,
                    callback: (tree, object, name) => {
                        tree.deleteUploadfile(object);
                    }
                }]
        });
    }
    /**
     * sort property info
     */
    sortPropertyInfo() {
        this.propertyInfo.sort((a, b) => a.order < b.order ? -1 : 1);
    }
    /**
     * get property information
     * @returns property information
     */
    getPropertyInfo() {
        return this.propertyInfo;
    }
}
/**
 * type of project class
 */
class TypeProject extends JsonFileTypeBase {
    /**
     * create new instance for project
     */
    constructor() {
        super(SwfType.PROJECT);
    }
}
/**
 * type of task class
 */
class TypeTask extends JsonFileTypeBase {
    /**
     * create new instance for task
     */
    constructor() {
        super(SwfType.TASK);
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
    constructor() {
        super(SwfType.WORKFLOW);
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
    constructor() {
        super(SwfType.JOB);
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
    addScrip() {
        this.propertyInfo.push({
            key: 'script',
            ishash: true,
            order: 30,
            item: [
                {
                    key: 'name',
                    readonly: () => { return false; },
                    type: 'string'
                },
                {
                    key: 'description',
                    readonly: () => { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: () => { return true; },
                    type: 'string'
                }
            ],
            button: [{
                    key: 'Edit',
                    title: 'submit_script',
                    validation: (tree) => {
                        const jobTask = tree;
                        if (jobTask.job_script.path) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    },
                    callback: (tree) => {
                        $(document).trigger('editScript');
                    }
                }]
        });
    }
    /**
     * add host property information for job
     */
    addHost() {
        this.propertyInfo.push({
            key: 'remote',
            ishash: true,
            order: 200,
            item: [
                {
                    key: 'host',
                    readonly: () => { return false; },
                    type: 'host'
                },
                {
                    key: 'job_scheduler',
                    readonly: () => { return false; },
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
    constructor() {
        super(SwfType.REMOTETASK);
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
    constructor() {
        super(SwfType.FOR);
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
    constructor() {
        super(SwfType.IF);
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
    constructor() {
        super(SwfType.ELSE);
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
    constructor() {
        super(SwfType.CONDITION);
        this.addScript();
        this.addInputFile();
        this.addOutputFile();
        this.addUpload();
        this.sortPropertyInfo();
    }
    /**
     * add output files property information for condition
     */
    addOutputFile() {
        this.propertyInfo.push({
            key: 'output_files',
            ishash: true,
            order: 110,
            button: [{
                    key: 'Add',
                    title: 'output_files',
                    isUpdateUI: true,
                    callback: (tree) => {
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
                    readonly: () => { return false; },
                    type: 'string',
                    isUpdateUI: true,
                    validation: (tree, v) => {
                        return v.trim() ? true : false;
                    }
                },
                {
                    key: 'description',
                    readonly: () => { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: () => { return false; },
                    type: 'string',
                    validation: (tree, v) => {
                        return !tree.isEnablePath(v);
                    },
                    callback: (tree, object, path) => {
                        object.type = SwfFileType.getFileType(path);
                    }
                },
                {
                    key: 'required',
                    readonly: () => { return false; },
                    type: 'boolean'
                }
            ],
            button: [{
                    key: 'Delete',
                    title: 'output_file',
                    isUpdateUI: true,
                    callback: (tree, object) => {
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
    constructor() {
        super(SwfType.BREAK);
        this.addScript();
        this.addInputFile();
        this.addOutputFile();
        this.addUpload();
        this.sortPropertyInfo();
    }
    /**
     * add output files property information for break
     */
    addOutputFile() {
        this.propertyInfo.push({
            key: 'output_files',
            ishash: true,
            order: 110,
            button: [{
                    key: 'Add',
                    title: 'output_files',
                    isUpdateUI: true,
                    callback: (tree) => {
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
                    readonly: () => { return false; },
                    type: 'string',
                    isUpdateUI: true,
                    validation: (tree, v) => {
                        return v.trim() ? true : false;
                    }
                },
                {
                    key: 'description',
                    readonly: () => { return false; },
                    type: 'string'
                },
                {
                    key: 'path',
                    readonly: () => { return false; },
                    type: 'string',
                    validation: (tree, v) => {
                        return !tree.isEnablePath(v);
                    },
                    callback: (tree, object, path) => {
                        object.type = SwfFileType.getFileType(path);
                    }
                },
                {
                    key: 'required',
                    readonly: () => { return false; },
                    type: 'boolean'
                }
            ],
            button: [{
                    key: 'Delete',
                    title: 'output_file',
                    isUpdateUI: true,
                    callback: (tree, object) => {
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
    constructor() {
        super(SwfType.PSTUDY);
        this.addParameterFile();
        this.addUpload();
        this.sortPropertyInfo();
    }
}
//# sourceMappingURL=jsonFileType.js.map