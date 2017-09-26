/**
 *
 */
class SwfTree extends SwfWorkflow {
    /**
     * create new instance
     * @param treeJson tree json data
     */
    constructor(treeJson) {
        super(treeJson);
        /**
         * children tree
         */
        this.children = [];
        /**
         * upload send files
         */
        this.uploadSendfiles = [];
        /**
         * other upload files
         */
        this.upload_files = [];
        /**
         * indexes are local task index array from root tree
         */
        this.indexes = [];
        this.oldPath = treeJson.oldPath;
        if (treeJson.children) {
            const children = JSON.parse(JSON.stringify(treeJson.children));
            this.children = children.map(child => new SwfTree(child));
        }
        Object.keys(treeJson).forEach(key => {
            if (this[key] === undefined && treeJson[key] !== undefined) {
                if (typeof treeJson[key] === 'object') {
                    this[key] = JSON.parse(JSON.stringify(treeJson[key]));
                }
                else {
                    this[key] = treeJson[key];
                }
            }
        });
        if (SwfType.isJob(treeJson)) {
            this.script_param = {
                cores: 1,
                nodes: 1
            };
        }
    }
    /**
     * get root index
     * @return root index
     */
    static getRootIndex() {
        return this.rootIndex.toString();
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
     * get delete directorys
     * @return delete directorys
     */
    static getDeleteDirectorys() {
        return JSON.parse(JSON.stringify(this.deleteDirectorys));
    }
    /**
     * get unique index number
     * @return unique index number
     */
    getUniqueIndex() {
        let index = 0;
        const search = (tree) => {
            if (tree === this) {
                return index;
            }
            index++;
            return tree.children.map(child => search(child)).filter(num => num)[0];
        };
        return search(SwfTree.root);
    }
    /**
     * get task index (task index is local index)
     * @return task index
     */
    getTaskIndex() {
        return this.indexes[this.indexes.length - 1];
    }
    /**
     * get hash code
     * @return hash code
     */
    getHashCode() {
        return this.birth;
    }
    /**
     * create tree json instance
     * @param treeJson tree json data
     */
    static create(treeJson) {
        this.root = new SwfTree(treeJson);
        this.deleteDirectorys = [];
        this.renumberingIndex(this.root);
        return this.root;
    }
    /**
     * renumbering index
     * @param tree SwfTree instance
     * @param indexes parent index array
     */
    static renumberingIndex(tree, indexes = [this.rootIndex]) {
        tree.indexes = indexes;
        tree.oldPath = tree.path;
        tree.children.forEach((child, index) => {
            const newIndexes = JSON.parse(JSON.stringify(indexes));
            newIndexes.push(index);
            this.renumberingIndex(child, newIndexes);
        });
    }
    /**
     * add child date to this tree
     * @param treeJson json data
     * @param fileType json file type
     * @param position display position
     * @return added child data
     */
    addChild(treeJson, fileType, position) {
        const rand = Math.floor(Date.now() / 100) % 100000;
        const dirname = `${treeJson.type}Dir${`00000${rand}`.slice(-5)}`;
        treeJson.birth = Date.now();
        const tree = new SwfTree(treeJson);
        tree.name = SwfTree.getSerialNumberName(tree.name);
        tree.path = dirname;
        this.children.push(tree);
        this.children_file.push(new SwfFile({
            name: tree.name,
            description: tree.description,
            path: `./${dirname}/${ClientUtility.getTemplate(fileType).getDefaultName()}`,
            required: true,
            type: 'file'
        }));
        this.positions.push(JSON.parse(JSON.stringify(position)));
        SwfTree.renumberingIndex(SwfTree.root);
        tree.oldPath = '';
        return tree;
    }
    /**
     * get serial number name
     * @param name search name
     * @return serial number name
     */
    static getSerialNumberName(name) {
        let max = 0;
        const notSeachedList = [this.root];
        const regexp = new RegExp(`^${name}(\\d+)$`);
        while (true) {
            const tree = notSeachedList.shift();
            if (!tree) {
                break;
            }
            if (tree.name.match(regexp)) {
                max = Math.max(max, parseInt(RegExp.$1));
            }
            tree.children.forEach(child => {
                notSeachedList.push(child);
            });
        }
        return `${name}${max + 1}`;
    }
    /**
     * whether specified directory name is duplicate or not
     * @param dirname directory name
     * @return whether specified directory name is duplicate or not
     */
    isDirnameDuplicate(dirname) {
        if (this.children.filter(child => child.path === dirname)[0]) {
            return true;
        }
        else {
            return false;
        }
    }
    /**
     * get SwfTree instance
     * @param index index string (ex '0_1_0')
     * @return SwfTree instance
     */
    static getSwfTree(index) {
        const notSeachedList = [this.root];
        while (true) {
            const tree = notSeachedList.shift();
            if (!tree) {
                break;
            }
            if (tree.getIndexString() === index) {
                return tree;
            }
            tree.children.forEach(child => {
                notSeachedList.push(child);
            });
        }
    }
    /**
     * get relative directory from root workflow
     * @return relative directory path
     */
    getCurrentDirectory() {
        return (function searchDirectory(tree, path = '') {
            path = ClientUtility.normalize(tree.path, path);
            const parent = tree.getParent();
            if (parent == null) {
                return path;
            }
            else {
                return searchDirectory(parent, path);
            }
        })(this);
    }
    /**
     * get parent tree instance
     * @return parent instance
     */
    getParent() {
        if (this.isRoot()) {
            return null;
        }
        const searchParent = (tree, indexes) => {
            if (indexes.length == 0) {
                return tree;
            }
            const index = indexes.shift();
            return searchParent(tree.children[index], indexes);
        };
        const length = this.indexes.length;
        const parentIndexes = this.indexes.slice(1, length - 1);
        return searchParent(SwfTree.root, parentIndexes);
    }
    /**
     * whether this instance is root or not
     * @return whether this instance is root or not
     */
    isRoot() {
        return this === SwfTree.root;
    }
    /**
     * convet SwfTreeJson object
     * @return SwfTreeJson object
     */
    toSwfTreeJson() {
        const root = new SwfTree(this);
        const notSeachedList = [root];
        while (true) {
            const tree = notSeachedList.shift();
            if (!tree) {
                break;
            }
            tree.children.forEach(child => {
                notSeachedList.push(child);
            });
            delete tree.indexes;
            delete tree.uploadScript;
            delete tree.uploadSendfiles;
            delete tree.uploadParamFile;
            delete tree.upload_files;
            Object.keys(this).forEach(key => {
                if (this[key] == null) {
                    delete this[key];
                }
            });
        }
        return root;
    }
    /**
     * convet SwfFile object
     * @return SwfFile object
     */
    toSwfFile() {
        return new SwfFile({
            name: this.name,
            description: this.description,
            path: this.path,
            type: 'file',
            required: true
        });
    }
    /**
     * whether specified path name is valid or not
     * @param path path name
     * @return whether specified path name is valid or not
     */
    isEnablePath(path) {
        if (!path) {
            return true;
        }
        const fullpath = this.getFullpath(path);
        const input = this.input_files.filter(file => {
            return this.getFullpath(file.path) === fullpath;
        });
        const output = this.output_files.filter(file => {
            return this.getFullpath(file.path) === fullpath;
        });
        if (input[0] || output[0]) {
            return true;
        }
        else {
            return false;
        }
    }
    /**
     * get relative path from root workflow to specified path name
     * @param object path string or SwfFile instance
     * @return relative path from root workflow
     */
    getFullpath(object) {
        let path;
        if (typeof object === 'string') {
            path = object;
        }
        else {
            path = object.path;
        }
        const directory = this.getCurrentDirectory();
        const basename = ClientUtility.basename(path);
        return ClientUtility.normalize(directory, path);
    }
    /**
     * get relative path from this directory to specified path name
     * @param object path string or SwfFile instance
     * @return relative path from this directory
     */
    getRelativePath(object) {
        let path;
        if (typeof object === 'string') {
            path = object;
        }
        else {
            path = this.getFullpath(object);
        }
        const directory = this.getCurrentDirectory();
        return `./${path.replace(new RegExp(`${directory}`), '')}`;
    }
    /**
     * add input file to parent tree
     * @param object child task index number or add target tree
     * @param filepath filepath string
     */
    addInputFileToParent(object, filepath) {
        if (this.isRoot()) {
            return;
        }
        let child;
        if (typeof object === 'number') {
            child = this.children[object];
        }
        else {
            child = object;
        }
        const file = child.findInputFile(filepath).clone();
        const fullpath = child.getFullpath(file);
        SwfTree.addFileToParent(this, file, fullpath, true);
    }
    /**
     * add output file to parent tree
     * @param object child task index number or add target tree
     * @param filepath filepath string
     */
    addOutputFileToParent(object, filepath) {
        if (this.isRoot()) {
            return;
        }
        let child;
        if (typeof object === 'number') {
            child = this.children[object];
        }
        else {
            child = object;
        }
        const file = child.findOutputFile(filepath).clone();
        const fullpath = child.getFullpath(file);
        SwfTree.addFileToParent(this, file, fullpath, false);
    }
    /**
     *　add output file to parent tree
     * @param tree target tree
     * @param file add file
     * @param fullpath add target relative path from root workflow
     * @param isInput whether input files or not
     */
    static addFileToParent(tree, file, fullpath, isInput) {
        if (tree.isRoot()) {
            return;
        }
        const files = isInput ? tree.input_files : tree.output_files;
        this.deleteFileFromParent(tree, fullpath, isInput);
        file.path = tree.getRelativePath(fullpath);
        files.push(file);
        console.log(`add parent path ${file.path}`);
        const parent = tree.getParent();
        this.addFileToParent(parent, file.clone(), fullpath, isInput);
    }
    /**
     * delete input file from parent tree
     * @param object child task index number or delete target tree
     * @param filepath filepath string
     */
    deleteInputFileFromParent(object, filepath) {
        let child;
        if (typeof object === 'number') {
            child = this.children[object];
        }
        else {
            child = object;
        }
        const file = child.findInputFile(filepath);
        if (file) {
            const cloneFile = file.clone();
            const fullpath = child.getFullpath(cloneFile);
            SwfTree.deleteFileFromParent(this, fullpath, true);
        }
    }
    /**
     * delete output file from parent tree
     * @param object child task index number or delete target tree
     * @param filepath filepath string
     */
    deleteOutputFileFromParent(object, filepath) {
        let child;
        if (typeof object === 'number') {
            child = this.children[object];
        }
        else {
            child = object;
        }
        const file = child.findOutputFile(filepath);
        if (file) {
            const cloneFile = file.clone();
            const fullpath = child.getFullpath(cloneFile);
            SwfTree.deleteFileFromParent(this, fullpath, false);
        }
    }
    /**
     * delete input files or output files from parent tree
     * @param tree target tree
     * @param fullpath delete target relative path from root workflow
     * @param isInput whether input files or not
     */
    static deleteFileFromParent(tree, fullpath, isInput) {
        if (tree == null || tree.isRoot()) {
            return;
        }
        const files = isInput ? tree.input_files : tree.output_files;
        for (let index = files.length - 1; index >= 0; index--) {
            if (fullpath === tree.getFullpath(files[index].path)) {
                console.log(`delete parent path ${files[index].path}`);
                files.splice(index, 1);
            }
        }
        const parent = tree.getParent();
        for (let index = parent.file_relations.length - 1; index >= 0; index--) {
            const relation = parent.file_relations[index];
            if (isInput) {
                if (fullpath === parent.getFullpath(relation.path_input_file)) {
                    console.log(`delete parent relation ${relation.path_input_file}`);
                    if (!parent.isExistDuplicateOutputFilePath(relation.path_output_file)) {
                        parent.addOutputFileToParent(relation.index_before_task, relation.path_output_file);
                    }
                    parent.file_relations.splice(index, 1);
                }
            }
            else {
                if (fullpath === parent.getFullpath(relation.path_output_file)) {
                    console.log(`delete parent relation ${relation.path_output_file}`);
                    parent.addInputFileToParent(relation.index_after_task, relation.path_input_file);
                    parent.file_relations.splice(index, 1);
                }
            }
        }
        this.deleteFileFromParent(parent, fullpath, isInput);
    }
    /**
     * update child input files
     * @param oldFile old file data
     * @param newFile new file data
     */
    updateInputFile(oldFile, newFile) {
        const file = this.findInputFile(oldFile.path).clone();
        const oldFullpath = this.getFullpath(file.path);
        const newFullpath = this.getFullpath(newFile.path);
        SwfTree.updateChildFile(this, oldFile, newFile, oldFullpath, newFullpath, true);
    }
    /**
     * update child output files
     * @param oldFile old file data
     * @param newFile new file data
     */
    updateOutputFile(oldFile, newFile) {
        const file = this.findOutputFile(oldFile.path).clone();
        const oldFullpath = this.getFullpath(file.path);
        const newFullpath = this.getFullpath(newFile.path);
        SwfTree.updateChildFile(this, oldFile, newFile, oldFullpath, newFullpath, false);
    }
    /**
     * update child input files or output files
     * @param tree target tree
     * @param oldFile old file data
     * @param newFile new file data
     * @param oldFullpath old relative path from root workflow
     * @param newFullpath new relative path from root workflow
     * @param isInput whether input files or not
     */
    static updateChildFile(tree, oldFile, newFile, oldFullpath, newFullpath, isInput) {
        const parent = tree.getParent();
        const newPath = `./${ClientUtility.normalize(tree.path, newFile.path)}`;
        if (oldFile.path !== newFile.path) {
            for (let index = parent.file_relations.length - 1; index >= 0; index--) {
                const relation = parent.file_relations[index];
                if (isInput) {
                    if (oldFullpath === parent.getFullpath(relation.path_input_file)) {
                        console.log(`update relation path ${relation.path_input_file} to ${newPath}`);
                        relation.path_input_file = newPath;
                        if (oldFile.type !== newFile.type) {
                            parent.file_relations.splice(index, 1);
                        }
                    }
                }
                else {
                    if (oldFullpath === parent.getFullpath(relation.path_output_file)) {
                        console.log(`update relation path ${relation.path_output_file} to ${newPath}`);
                        relation.path_output_file = newPath;
                        if (oldFile.type !== newFile.type) {
                            parent.file_relations.splice(index, 1);
                        }
                    }
                }
            }
        }
        if (parent.isRoot()) {
            return;
        }
        const files = isInput ? parent.input_files : parent.output_files;
        files.forEach(input => {
            console.log(`oldfull=${oldFullpath}, newfull=${newFullpath}`);
            const newRelative = parent.getRelativePath(newFullpath);
            if (oldFullpath === parent.getFullpath(input.path)) {
                console.log(`convert ${input.path} to ${newRelative}`);
                const old = new SwfFile(input);
                input.path = newRelative;
                input.name = newFile.name;
                input.description = newFile.description;
                input.required = newFile.required;
                input.type = newFile.type;
                this.updateChildFile(parent, old, new SwfFile(input), oldFullpath, newFullpath, isInput);
            }
        });
    }
    /**
     * update path name
     * @param file updated file data
     */
    updatePath(file) {
        const oldFullpath = this.getFullpath(`${ClientUtility.getTemplate(this).getDefaultName()}`);
        const oldDirectory = this.getCurrentDirectory();
        this.path = file.path;
        const newFullpath = this.getFullpath(`${ClientUtility.getTemplate(this).getDefaultName()}`);
        const newDirectory = this.getCurrentDirectory();
        console.log(`old=${oldFullpath} new=${newFullpath}`);
        const parent = this.getParent();
        if (parent == null) {
            return;
        }
        parent.children_file.forEach(child => {
            const fullpath = parent.getFullpath(child);
            if (fullpath === oldFullpath) {
                child.set(file);
                child.path = parent.getRelativePath(newFullpath);
            }
        });
        (function renamePath(tree) {
            if (tree == null) {
                return;
            }
            tree.file_relations.forEach(relation => {
                relation.renameInputPath(tree, oldDirectory, newDirectory);
                relation.renameOutputPath(tree, oldDirectory, newDirectory);
            });
            tree.input_files.forEach(file => file.renamePath(tree, oldDirectory, newDirectory));
            tree.output_files.forEach(file => file.renamePath(tree, oldDirectory, newDirectory));
            renamePath(tree.getParent());
        })(parent);
    }
    /**
     * get the file with the same input file path name as the specified path name
     * @param path path name
     * @returns get the file with the same input file path name as the specified path name
     */
    findInputFile(path) {
        const file = this.getInputFile(path);
        if (file) {
            return file;
        }
        else {
            return this.input_files.filter(file => `${this.path}/${file.getNormalPath()}` === ClientUtility.normalize(path))[0];
        }
    }
    /**
     * get the file with the same output file path name as the specified path name
     * @param path path name
     * @returns get the file with the same output file path name as the specified path name
     */
    findOutputFile(path) {
        const file = this.getOutputFile(path);
        if (file) {
            return file;
        }
        else {
            return this.output_files.filter(file => `${this.path}/${file.getNormalPath()}` === ClientUtility.normalize(path))[0];
        }
    }
    /**
     * add script file for upload
     * @param file upload script file
     */
    addScriptFile(file) {
        this.uploadScript = file;
        this.script.path = file.name;
    }
    /**
     * add job script file for upload
     * @param file upload job script file
     */
    addJobScriptFile(file) {
        this.uploadScript = file;
        const job = this;
        job.job_script.path = file.name;
    }
    /**
     * add parameter file for upload
     * @param file upload parameter file
     */
    addParameterFile(file) {
        this.uploadParamFile = file;
        const pstudy = this;
        pstudy.parameter_file.path = file.name;
    }
    /**
     * add send file for upload
     * @param files upload send file list
     */
    addSendFile(files) {
        const rtask = this;
        for (let index = 0; index < files.length; index++) {
            this.deleteSendfile(files[index].name);
            this.uploadSendfiles.push(files[index]);
            rtask.send_files.push(new SwfFile({
                name: 'name',
                description: '',
                path: files[index].name,
                type: 'file',
                required: true
            }));
        }
    }
    /**
     * delete specified file from send files
     * @param object path name or delete file
     */
    deleteSendfile(object) {
        let filepath;
        if (typeof object === 'string') {
            filepath = object;
        }
        else {
            filepath = object.path;
        }
        const rtask = this;
        for (let index = rtask.send_files.length - 1; index >= 0; index--) {
            if (rtask.send_files[index].path === filepath) {
                rtask.send_files.splice(index, 1);
            }
        }
        for (let index = this.uploadSendfiles.length - 1; index >= 0; index--) {
            if (this.uploadSendfiles[index].name === filepath) {
                this.uploadSendfiles.splice(index, 1);
            }
        }
    }
    /**
     * add scpecified files to upload files
     * @param files upload files
     */
    addUploadFile(files) {
        this.upload_files = [];
        for (let index = 0; index < files.length; index++) {
            this.upload_files.push(files[index]);
        }
    }
    /**
     * delete specified file in upload files
     * @param file file instance
     */
    deleteUploadfile(file) {
        for (let index = this.upload_files.length - 1; index >= 0; index--) {
            if (this.upload_files[index].name === file.name) {
                this.upload_files.splice(index, 1);
            }
        }
    }
    /**
     * whether specified file is exist in upload send files or not
     * @param sendFile send file
     * @return whether specified file is exist in upload send files or not
     */
    isExistSendfile(sendFile) {
        const target = this.uploadSendfiles.filter(file => file.name === sendFile.path)[0];
        if (target) {
            return true;
        }
        else {
            return false;
        }
    }
    /**
     * whether upload script is exist or not
     * @return whether upload script is exist or not
     */
    isExistUploadScript() {
        return this.uploadScript != null;
    }
    /**
     * get upload files
     * @param projectDirectory project directory name
     * @return upload files
     */
    static getUploadFiles(projectDirectory) {
        const files = [];
        const notSeachedList = [this.root];
        while (true) {
            const tree = notSeachedList.shift();
            if (!tree) {
                break;
            }
            if (tree.uploadScript) {
                files.push({
                    filepath: ClientUtility.normalize(projectDirectory, tree.getFullpath(tree.uploadScript.name)),
                    file: tree.uploadScript
                });
            }
            if (tree.uploadParamFile) {
                files.push({
                    filepath: ClientUtility.normalize(projectDirectory, tree.getFullpath(tree.uploadParamFile.name)),
                    file: tree.uploadParamFile
                });
            }
            tree.uploadSendfiles.forEach(file => {
                files.push({
                    filepath: ClientUtility.normalize(projectDirectory, tree.getFullpath(file.name)),
                    file: file
                });
            });
            tree.upload_files.forEach(file => {
                files.push({
                    filepath: ClientUtility.normalize(projectDirectory, tree.getFullpath(file.name)),
                    file: file
                });
            });
            tree.children.forEach(child => {
                notSeachedList.push(child);
            });
        }
        return files;
    }
    /**
     * whether circular reference is occurred or not
     * @param before before task index
     * @param after after task index
     * @return whether circular reference is occurred or not
     */
    isExistCircularReference(before, after) {
        if (before === after) {
            return true;
        }
        const relations = this.relations.filter(relation => relation.index_before_task === after);
        const fileRelations = this.file_relations.filter(relation => relation.index_before_task === after);
        if (!relations[0] && !fileRelations[0]) {
            return false;
        }
        else {
            const results1 = relations.filter(relation => this.isExistCircularReference(before, relation.index_after_task));
            const results2 = fileRelations.filter(relation => this.isExistCircularReference(before, relation.index_after_task));
            if (!results1[0] && !results2[0]) {
                return false;
            }
            else {
                return true;
            }
        }
    }
    /**
     * whether there is a For workflow at parent or not
     * @return whether there is a For workflow at parent or not
     */
    isExistForWorkflowAtParent() {
        if (SwfType.isFor(this)) {
            return true;
        }
        else {
            const parent = this.getParent();
            if (parent == null) {
                return false;
            }
            else {
                return parent.isExistForWorkflowAtParent();
            }
        }
    }
    /**
     * remove SwfTree instance from project
     */
    remove() {
        (function removeFileRelation(tree) {
            const parent = tree.getParent();
            parent.input_files.forEach(file => parent.deleteInputFileFromParent(tree, file.path));
            parent.output_files.forEach(file => parent.deleteOutputFileFromParent(tree, file.path));
            if (tree.children) {
                tree.children.forEach(child => removeFileRelation(child));
            }
        })(this);
        const taskIndex = this.getTaskIndex();
        const parent = this.getParent();
        parent.children.splice(taskIndex, 1);
        parent.children_file.splice(taskIndex, 1);
        parent.positions.splice(taskIndex, 1);
        for (let index = parent.relations.length - 1; index >= 0; index--) {
            const relation = parent.relations[index];
            const hashcode = this.getHashCode();
            if (hashcode === relation.index_before_task || hashcode === relation.index_after_task) {
                parent.relations.splice(index, 1);
            }
        }
        if (this.oldPath) {
            const dirname = ClientUtility.dirname(this.getCurrentDirectory());
            SwfTree.deleteDirectorys.push(ClientUtility.normalize(dirname, this.oldPath));
        }
        SwfTree.renumberingIndex(SwfTree.root);
    }
}
/**
 * delete directorys
 */
SwfTree.deleteDirectorys = [];
/**
 * root index
 */
SwfTree.rootIndex = 0;
//# sourceMappingURL=swfTree.js.map