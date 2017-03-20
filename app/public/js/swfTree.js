var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
 *
 */
var SwfTree = (function (_super) {
    __extends(SwfTree, _super);
    /**
     * create new instance
     * @param treeJson tree json data
     */
    function SwfTree(treeJson) {
        var _this = _super.call(this, treeJson) || this;
        /**
         * children tree
         */
        _this.children = [];
        /**
         * upload send files
         */
        _this.uploadSendfiles = [];
        /**
         * other upload files
         */
        _this.upload_files = [];
        /**
         * indexes are local task index array from root tree
         */
        _this.indexes = [];
        _this.oldPath = treeJson.oldPath;
        if (treeJson.children) {
            var children = JSON.parse(JSON.stringify(treeJson.children));
            _this.children = children.map(function (child) { return new SwfTree(child); });
        }
        if (treeJson.forParam) {
            _this.forParam = JSON.parse(JSON.stringify(treeJson.forParam));
        }
        if (treeJson.condition) {
            _this.condition = new SwfFile(treeJson.condition);
        }
        if (treeJson.host) {
            _this.host = new SwfHost(treeJson.host);
        }
        if (treeJson.job_script) {
            _this.job_script = new SwfFile(treeJson.job_script);
        }
        if (treeJson.parameter_file) {
            _this.parameter_file = new SwfFile(treeJson.parameter_file);
        }
        if (ClientUtility.checkFileType(treeJson.type, JsonFileType.Job)) {
            _this.script_param = {
                cores: 1,
                nodes: 1
            };
        }
        return _this;
    }
    /**
     * get index string
     * @return index string
     */
    SwfTree.prototype.getIndexString = function () {
        return this.indexes.join('_');
    };
    /**
     * get hierarchy number
     * @return hierarchy number
     */
    SwfTree.prototype.getHierarchy = function () {
        return this.indexes.length - 1;
    };
    /**
     * get unique index number
     * @return unique index number
     */
    SwfTree.prototype.getUniqueIndex = function () {
        var _this = this;
        var index = 0;
        var search = function (tree) {
            if (tree === _this) {
                return index;
            }
            index++;
            return tree.children.map(function (child) { return search(child); }).filter(function (num) { return num; })[0];
        };
        return search(SwfTree.root);
    };
    /**
     * get task index (task index is local index)
     * @return task index
     */
    SwfTree.prototype.getTaskIndex = function () {
        return this.indexes[this.indexes.length - 1];
    };
    /**
     * create tree json instance
     * @param treeJson tree json data
     */
    SwfTree.create = function (treeJson) {
        this.root = new SwfTree(treeJson);
        var tree = this.renumberingIndex(this.root);
        return tree;
    };
    /**
     * renumbering index
     * @param tree SwfTree instance
     * @param indexes parent index array
     * @param renumbering tree instance
     */
    SwfTree.renumberingIndex = function (tree, indexes) {
        var _this = this;
        if (indexes === void 0) { indexes = [0]; }
        tree.indexes = indexes;
        tree.oldPath = tree.path;
        tree.children.forEach(function (child, index) {
            var newIndexes = JSON.parse(JSON.stringify(indexes));
            newIndexes.push(index);
            _this.renumberingIndex(child, newIndexes);
        });
        return tree;
    };
    /**
     * add child date to this tree
     * @param treeJson json data
     * @param fileType json file type
     * @param added child data
     */
    SwfTree.prototype.addChild = function (treeJson, fileType) {
        var rand = Math.floor(Date.now() / 100) % 100000;
        var dirname = treeJson.type + "Dir" + ("00000" + rand).slice(-5);
        var tree = new SwfTree(treeJson);
        tree.path = dirname;
        this.children.push(tree);
        this.children_file.push(new SwfFile({
            name: tree.name,
            description: tree.description,
            path: "./" + dirname + "/" + ClientUtility.getDefaultName(fileType),
            required: true,
            type: 'file'
        }));
        this.positions.push({ x: 0, y: 0 });
        SwfTree.renumberingIndex(SwfTree.root);
        tree.oldPath = '';
        return tree;
    };
    /**
     * whether specified directory name is duplicate or not
     * @param dirname directory name
     * @return whether specified directory name is duplicate or not
     */
    SwfTree.prototype.isDirnameDuplicate = function (dirname) {
        if (this.children.filter(function (child) { return child.path === dirname; })[0]) {
            return true;
        }
        else {
            return false;
        }
    };
    /**
     * get SwfTree instance
     * @param index index string (ex '0_1_0')
     * @return SwfTree instance
     */
    SwfTree.getSwfTree = function (index) {
        var notSeachedList = [this.root];
        while (true) {
            var tree = notSeachedList.shift();
            if (!tree) {
                break;
            }
            if (tree.getIndexString() === index) {
                return tree;
            }
            tree.children.forEach(function (child) {
                notSeachedList.push(child);
            });
        }
    };
    /**
     * get relative directory from root workflow
     * @return relative directory path
     */
    SwfTree.prototype.getCurrentDirectory = function () {
        return (function searchDirectory(tree, path) {
            if (path === void 0) { path = ''; }
            path = ClientUtility.normalize(tree.path + "/" + path);
            var parent = tree.getParent();
            if (parent == null) {
                return path;
            }
            else {
                return searchDirectory(parent, path);
            }
        })(this);
    };
    /**
     * get parent tree instance
     * @return parent instance
     */
    SwfTree.prototype.getParent = function () {
        if (this.isRoot()) {
            return null;
        }
        var searchParent = function (tree, indexes) {
            if (indexes.length == 0) {
                return tree;
            }
            var index = indexes.shift();
            return searchParent(tree.children[index], indexes);
        };
        var length = this.indexes.length;
        var parentIndexes = this.indexes.slice(1, length - 1);
        return searchParent(SwfTree.root, parentIndexes);
    };
    /**
     * whether this instance is root or not
     * @return whether this instance is root or not
     */
    SwfTree.prototype.isRoot = function () {
        return this === SwfTree.root;
    };
    /**
     * convet SwfTreeJson object
     * @return SwfTreeJson object
     */
    SwfTree.prototype.toSwfTreeJson = function () {
        var _this = this;
        var root = new SwfTree(this);
        var notSeachedList = [root];
        while (true) {
            var tree = notSeachedList.shift();
            if (!tree) {
                break;
            }
            tree.children.forEach(function (child) {
                notSeachedList.push(child);
            });
            delete tree.indexes;
            delete tree.uploadScript;
            delete tree.uploadSendfiles;
            delete tree.uploadParamFile;
            delete tree.upload_files;
            Object.keys(this).forEach(function (key) {
                if (_this[key] == null) {
                    delete _this[key];
                }
            });
        }
        return root;
    };
    /**
     * convet SwfFile object
     * @return SwfFile object
     */
    SwfTree.prototype.toSwfFile = function () {
        return new SwfFile({
            name: this.name,
            description: this.description,
            path: this.path,
            type: 'file',
            required: true
        });
    };
    /**
     * whether specified path name is valid or not
     * @param path path name
     * @return whether specified path name is valid or not
     */
    SwfTree.prototype.isEnablePath = function (path) {
        var _this = this;
        if (!path) {
            return true;
        }
        var fullpath = this.getFullpath(path);
        var input = this.input_files.filter(function (file) {
            return _this.getFullpath(file.path) === fullpath;
        });
        var output = this.output_files.filter(function (file) {
            return _this.getFullpath(file.path) === fullpath;
        });
        var send = this.send_files.filter(function (file) {
            return _this.getFullpath(file.path) === fullpath;
        });
        var receive = this.receive_files.filter(function (file) {
            return _this.getFullpath(file.path) === fullpath;
        });
        if (input[0] || output[0] || send[0] || receive[0]) {
            return true;
        }
        else {
            return false;
        }
    };
    /**
     * get relative path from root workflow to specified path name
     * @param object path string or SwfFile instance
     * @return relative path from root workflow
     */
    SwfTree.prototype.getFullpath = function (object) {
        var path;
        if (typeof object === 'string') {
            path = object;
        }
        else {
            path = object.path;
        }
        var directory = this.getCurrentDirectory();
        var basename = ClientUtility.basename(path);
        return ClientUtility.normalize(directory + "/" + path);
    };
    /**
     * get relative path from this directory to specified path name
     * @param object path string or SwfFile instance
     * @return relative path from this directory
     */
    SwfTree.prototype.getRelativePath = function (object) {
        var path;
        if (typeof object === 'string') {
            path = object;
        }
        else {
            path = this.getFullpath(object);
        }
        var directory = this.getCurrentDirectory();
        return "./" + path.replace(new RegExp("" + directory), '');
    };
    /**
     * add input file to parent tree
     * @param object child task index number or add target tree
     * @param filepath filepath string
     */
    SwfTree.prototype.addInputFileToParent = function (object, filepath) {
        var child;
        if (typeof object === 'number') {
            child = this.children[object];
        }
        else {
            child = object;
        }
        var file = child.findInputFile(filepath).clone();
        var fullpath = child.getFullpath(file);
        SwfTree.addFileToParent(this, file, fullpath, true);
    };
    /**
     * add output file to parent tree
     * @param object child task index number or add target tree
     * @param filepath filepath string
     */
    SwfTree.prototype.addOutputFileToParent = function (object, filepath) {
        var child;
        if (typeof object === 'number') {
            child = this.children[object];
        }
        else {
            child = object;
        }
        var file = child.findOutputFile(filepath).clone();
        var fullpath = child.getFullpath(file);
        SwfTree.addFileToParent(this, file, fullpath, false);
    };
    /**
     *
     * @param tree
     * @param file
     * @param fullpath
     * @param isInput
     */
    SwfTree.addFileToParent = function (tree, file, fullpath, isInput) {
        if (tree.isRoot()) {
            return;
        }
        var files = isInput ? tree.input_files : tree.output_files;
        this.deleteFileFromParent(tree, fullpath, isInput);
        file.path = tree.getRelativePath(fullpath);
        files.push(file);
        console.log("add parent path " + file.path);
        var parent = tree.getParent();
        this.addFileToParent(parent, file.clone(), fullpath, isInput);
    };
    /**
     * delete input file from parent tree
     * @param object child task index number or delete target tree
     * @param filepath filepath string
     */
    SwfTree.prototype.deleteInputFileFromParent = function (object, filepath) {
        var child;
        if (typeof object === 'number') {
            child = this.children[object];
        }
        else {
            child = object;
        }
        var file = child.findInputFile(filepath).clone();
        var fullpath = child.getFullpath(file);
        SwfTree.deleteFileFromParent(this, fullpath, true);
    };
    /**
     * delete output file from parent tree
     * @param object child task index number or delete target tree
     * @param filepath filepath string
     */
    SwfTree.prototype.deleteOutputFileFromParent = function (object, filepath) {
        var child;
        if (typeof object === 'number') {
            child = this.children[object];
        }
        else {
            child = object;
        }
        var file = child.findOutputFile(filepath).clone();
        var fullpath = child.getFullpath(file);
        SwfTree.deleteFileFromParent(this, fullpath, false);
    };
    /**
     * delete input files or output files from parent tree
     * @param tree target tree
     * @param fullpath delete target relative path from root workflow
     * @param isInput whether input files or not
     */
    SwfTree.deleteFileFromParent = function (tree, fullpath, isInput) {
        if (tree == null || tree.isRoot()) {
            return;
        }
        var files = isInput ? tree.input_files : tree.output_files;
        for (var index = files.length - 1; index >= 0; index--) {
            if (fullpath === tree.getFullpath(files[index].path)) {
                console.log("delete parent path " + files[index].path);
                files.splice(index, 1);
            }
        }
        var parent = tree.getParent();
        for (var index = parent.file_relations.length - 1; index >= 0; index--) {
            var relation = parent.file_relations[index];
            if (isInput) {
                if (fullpath === parent.getFullpath(relation.path_input_file)) {
                    console.log("delete parent relation " + relation.path_input_file);
                    if (!parent.isExistDuplicateOutputFilePath(relation.path_output_file)) {
                        parent.addOutputFileToParent(relation.index_before_task, relation.path_output_file);
                    }
                    parent.file_relations.splice(index, 1);
                }
            }
            else {
                if (fullpath === parent.getFullpath(relation.path_output_file)) {
                    console.log("delete parent relation " + relation.path_output_file);
                    parent.addInputFileToParent(relation.index_after_task, relation.path_input_file);
                    parent.file_relations.splice(index, 1);
                }
            }
        }
        this.deleteFileFromParent(parent, fullpath, isInput);
    };
    /**
     * update child input files
     * @param oldFile old file data
     * @param newFile new file data
     */
    SwfTree.prototype.updateInputFile = function (oldFile, newFile) {
        var file = this.findInputFile(oldFile.path).clone();
        var oldFullpath = this.getFullpath(file.path);
        var newFullpath = this.getFullpath(newFile.path);
        SwfTree.updateChildFile(this, oldFile, newFile, oldFullpath, newFullpath, true);
    };
    /**
     * update child output files
     * @param oldFile old file data
     * @param newFile new file data
     */
    SwfTree.prototype.updateOutputFile = function (oldFile, newFile) {
        var file = this.findOutputFile(oldFile.path).clone();
        var oldFullpath = this.getFullpath(file.path);
        var newFullpath = this.getFullpath(newFile.path);
        SwfTree.updateChildFile(this, oldFile, newFile, oldFullpath, newFullpath, false);
    };
    /**
     * update child input files or output files
     * @param tree target tree
     * @param oldFile old file data
     * @param newFile new file data
     * @param oldFullpath old relative path from root workflow
     * @param newFullpath new relative path from root workflow
     * @param isInput whether input files or not
     */
    SwfTree.updateChildFile = function (tree, oldFile, newFile, oldFullpath, newFullpath, isInput) {
        var _this = this;
        var parent = tree.getParent();
        var newPath = "./" + ClientUtility.normalize(tree.path + "/" + newFile.path);
        if (oldFile.path !== newFile.path) {
            for (var index = parent.file_relations.length - 1; index >= 0; index--) {
                var relation = parent.file_relations[index];
                if (isInput) {
                    if (oldFullpath === parent.getFullpath(relation.path_input_file)) {
                        console.log("update relation path " + relation.path_input_file + " to " + newPath);
                        relation.path_input_file = newPath;
                        if (oldFile.type !== newFile.type) {
                            parent.file_relations.splice(index, 1);
                        }
                    }
                }
                else {
                    if (oldFullpath === parent.getFullpath(relation.path_output_file)) {
                        console.log("update relation path " + relation.path_output_file + " to " + newPath);
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
        var files = isInput ? parent.input_files : parent.output_files;
        files.forEach(function (input) {
            console.log("oldfull=" + oldFullpath + ", newfull=" + newFullpath);
            var newRelative = parent.getRelativePath(newFullpath);
            if (oldFullpath === parent.getFullpath(input.path)) {
                console.log("convert " + input.path + " to " + newRelative);
                var old = new SwfFile(input);
                input.path = newRelative;
                input.name = newFile.name;
                input.description = newFile.description;
                input.required = newFile.required;
                input.type = newFile.type;
                _this.updateChildFile(parent, old, new SwfFile(input), oldFullpath, newFullpath, isInput);
            }
        });
    };
    /**
     * update path name
     * @param file updated file data
     */
    SwfTree.prototype.updatePath = function (file) {
        var oldFullpath = this.getFullpath("" + ClientUtility.getDefaultName(this));
        this.path = file.path;
        var newFullpath = this.getFullpath("" + ClientUtility.getDefaultName(this));
        console.log("old=" + oldFullpath + " new=" + newFullpath);
        var parent = this.getParent();
        if (parent == null) {
            return;
        }
        parent.children_file.forEach(function (child) {
            var fullpath = parent.getFullpath(child);
            if (fullpath === oldFullpath) {
                child.set(file);
                child.path = parent.getRelativePath(newFullpath);
            }
        });
    };
    /**
     * get the file with the same input file path name as the specified path name
     * @param path path name
     * @returns get the file with the same input file path name as the specified path name
     */
    SwfTree.prototype.findInputFile = function (path) {
        var _this = this;
        var file = this.getInputFile(path);
        if (file) {
            return file;
        }
        else {
            return this.input_files.filter(function (file) { return _this.path + "/" + file.getNormalPath() === ClientUtility.normalize(path); })[0];
        }
    };
    /**
     * get the file with the same output file path name as the specified path name
     * @param path path name
     * @returns get the file with the same output file path name as the specified path name
     */
    SwfTree.prototype.findOutputFile = function (path) {
        var _this = this;
        var file = this.getOutputFile(path);
        if (file) {
            return file;
        }
        else {
            return this.output_files.filter(function (file) { return _this.path + "/" + file.getNormalPath() === ClientUtility.normalize(path); })[0];
        }
    };
    /**
     * get the file with the same send file path name as the specified path name
     * @param path path name
     * @returns get the file with the same send file path name as the specified path name
     */
    SwfTree.prototype.findSendFile = function (path) {
        var _this = this;
        var file = this.getSendFile(path);
        if (file) {
            return file;
        }
        else {
            return this.send_files.filter(function (file) { return _this.path + "/" + file.getNormalPath() === ClientUtility.normalize(path); })[0];
        }
    };
    /**
     * get the file with the same receive file path name as the specified path name
     * @param path path name
     * @returns get the file with the same receive file path name as the specified path name
     */
    SwfTree.prototype.findReceiveFile = function (path) {
        var _this = this;
        var file = this.getReceiveFile(path);
        if (file) {
            return file;
        }
        else {
            return this.receive_files.filter(function (file) { return _this.path + "/" + file.getNormalPath() === ClientUtility.normalize(path); })[0];
        }
    };
    /**
     * add script file for upload
     * @param file upload script file
     */
    SwfTree.prototype.addScriptFile = function (file) {
        this.uploadScript = file;
        this.script.path = file.name;
    };
    /**
     * add job script file for upload
     * @param file upload job script file
     */
    SwfTree.prototype.addJobScriptFile = function (file) {
        this.uploadScript = file;
        this.job_script.path = file.name;
    };
    /**
     * add parameter file for upload
     * @param file upload parameter file
     */
    SwfTree.prototype.addParameterFile = function (file) {
        this.uploadParamFile = file;
        this.parameter_file.path = file.name;
    };
    /**
     * add send file for upload
     * @param files upload send file list
     */
    SwfTree.prototype.addSendFile = function (files) {
        for (var index = 0; index < files.length; index++) {
            this.deleteSendfile(files[index].name);
            this.uploadSendfiles.push(files[index]);
            this.send_files.push(new SwfFile({
                name: 'name',
                description: '',
                path: files[index].name,
                type: 'file',
                required: true
            }));
        }
    };
    /**
     * delete specified file from send files
     * @param object path name or delete file
     */
    SwfTree.prototype.deleteSendfile = function (object) {
        var filepath;
        if (typeof object === 'string') {
            filepath = object;
        }
        else {
            filepath = object.path;
        }
        for (var index = this.send_files.length - 1; index >= 0; index--) {
            if (this.send_files[index].path === filepath) {
                this.send_files.splice(index, 1);
            }
        }
        for (var index = this.uploadSendfiles.length - 1; index >= 0; index--) {
            if (this.uploadSendfiles[index].name === filepath) {
                this.uploadSendfiles.splice(index, 1);
            }
        }
    };
    /**
     * add scpecified files to upload files
     * @param files upload files
     */
    SwfTree.prototype.addUploadFile = function (files) {
        this.upload_files = [];
        for (var index = 0; index < files.length; index++) {
            this.upload_files.push(files[index]);
        }
    };
    /**
     * delete specified file in upload files
     * @param file file instance
     */
    SwfTree.prototype.deleteUploadfile = function (file) {
        for (var index = this.upload_files.length - 1; index >= 0; index--) {
            if (this.upload_files[index].name === file.name) {
                this.upload_files.splice(index, 1);
            }
        }
    };
    /**
     * whether specified file is exist in upload send files or not
     * @param sendFile send file
     * @return whether specified file is exist in upload send files or not
     */
    SwfTree.prototype.isExistSendfile = function (sendFile) {
        var target = this.uploadSendfiles.filter(function (file) { return file.name === sendFile.path; })[0];
        if (target) {
            return true;
        }
        else {
            return false;
        }
    };
    /**
     * whether upload script is exist or not
     * @return whether upload script is exist or not
     */
    SwfTree.prototype.isExistUploadScript = function () {
        return this.uploadScript != null;
    };
    /**
     * get upload files
     * @param projectDirectory project directory name
     * @return upload files
     */
    SwfTree.getUploadFiles = function (projectDirectory) {
        var files = [];
        var notSeachedList = [this.root];
        var _loop_1 = function () {
            var tree = notSeachedList.shift();
            if (!tree) {
                return "break";
            }
            if (tree.uploadScript) {
                files.push({
                    filepath: ClientUtility.normalize(projectDirectory + "/" + tree.getFullpath(tree.uploadScript.name)),
                    file: tree.uploadScript
                });
            }
            if (tree.uploadParamFile) {
                files.push({
                    filepath: ClientUtility.normalize(projectDirectory + "/" + tree.getFullpath(tree.uploadParamFile.name)),
                    file: tree.uploadParamFile
                });
            }
            tree.uploadSendfiles.forEach(function (file) {
                files.push({
                    filepath: ClientUtility.normalize(projectDirectory + "/" + tree.getFullpath(file.name)),
                    file: file
                });
            });
            tree.upload_files.forEach(function (file) {
                files.push({
                    filepath: ClientUtility.normalize(projectDirectory + "/" + tree.getFullpath(file.name)),
                    file: file
                });
            });
            tree.children.forEach(function (child) {
                notSeachedList.push(child);
            });
        };
        while (true) {
            var state_1 = _loop_1();
            if (state_1 === "break")
                break;
        }
        return files;
    };
    return SwfTree;
}(SwfWorkflow));
//# sourceMappingURL=swfTree.js.map