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
     *
     * @param treeJson
     */
    function SwfTree(treeJson) {
        var _this = _super.call(this, treeJson) || this;
        _this.children = [];
        _this.uploadSendfiles = [];
        _this.upload_files = [];
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
     *
     */
    SwfTree.prototype.getIndexString = function () {
        return this.indexes.join('_');
    };
    /**
     *
     */
    SwfTree.prototype.getHierarchy = function () {
        return this.indexes.length - 1;
    };
    /**
     *
     */
    SwfTree.prototype.getAbsoluteIndex = function () {
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
     *
     */
    SwfTree.prototype.getTaskIndex = function () {
        return this.indexes[this.indexes.length - 1];
    };
    /**
     *
     * @param treeJson
     * @returns created SwfTree instance
     */
    SwfTree.create = function (treeJson) {
        this.root = new SwfTree(treeJson);
        var tree = this.renumberingIndex(this.root);
        return tree;
    };
    /**
     *
     * @param tree
     * @param hierarchy
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
     *
     * @param treeJson
     * @param fileType
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
     *
     * @param dirname
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
     *
     * @param index
     * @return SwfTree instance of selected index
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
     *
     * @param tree
     * @param path
     */
    SwfTree.prototype.getCurrentDirectory = function () {
        var searchDirectory = function (tree, path) {
            if (path === void 0) { path = ''; }
            path = ClientUtility.normalize(tree.path + "/" + path);
            var parent = tree.getParent();
            if (parent == null) {
                return path;
            }
            else {
                return searchDirectory(parent, path);
            }
        };
        return searchDirectory(this);
    };
    /**
     *
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
     *
     */
    SwfTree.prototype.isRoot = function () {
        return this === SwfTree.root;
    };
    /**
     *
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
     *
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
     *
     * @param path
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
     *
     * @param to
     */
    SwfTree.prototype.getFullpath = function (to) {
        var path;
        if (typeof to === 'string') {
            path = to;
        }
        else {
            path = to.path;
        }
        var directory = this.getCurrentDirectory();
        var basename = ClientUtility.basename(path);
        return ClientUtility.normalize(directory + "/" + path);
    };
    /**
     *
     * @param to
     */
    SwfTree.prototype.getRelativePath = function (to) {
        var path;
        if (typeof to === 'string') {
            path = to;
        }
        else {
            path = this.getFullpath(to);
        }
        var directory = this.getCurrentDirectory();
        return "./" + path.replace(new RegExp("" + directory), '');
    };
    /**
     *
     * @param tree
     * @param taskIndex
     * @param filepath
     */
    SwfTree.prototype.addInputFileToParent = function (task, filepath) {
        var child;
        if (typeof task === 'number') {
            child = this.children[task];
        }
        else {
            child = task;
        }
        var file = child.findInputFile(filepath).clone();
        var fullpath = child.getFullpath(file);
        SwfTree.addFileToParent(this, file, fullpath, true);
    };
    /**
     *
     * @param tree
     * @param taskIndex
     * @param filepath
     */
    SwfTree.prototype.addOutputFileToParent = function (task, filepath) {
        var child;
        if (typeof task === 'number') {
            child = this.children[task];
        }
        else {
            child = task;
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
     *
     * @param tree
     * @param taskIndex
     * @param filepath
     */
    SwfTree.prototype.deleteInputFileFromParent = function (task, filepath) {
        var child;
        if (typeof task === 'number') {
            child = this.children[task];
        }
        else {
            child = task;
        }
        var file = child.findInputFile(filepath).clone();
        var fullpath = child.getFullpath(file);
        SwfTree.deleteFileFromParent(this, fullpath, true);
    };
    /**
     *
     * @param tree
     * @param taskIndex
     * @param filepath
     */
    SwfTree.prototype.deleteOutputFileFromParent = function (task, filepath) {
        var child;
        if (typeof task === 'number') {
            child = this.children[task];
        }
        else {
            child = task;
        }
        var file = child.findOutputFile(filepath).clone();
        var fullpath = child.getFullpath(file);
        SwfTree.deleteFileFromParent(this, fullpath, false);
    };
    /**
     *
     * @param tree
     * @param fullpath
     * @param isInput
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
     *
     * @param oldFile
     * @param newFile
     */
    SwfTree.prototype.updateInputFile = function (oldFile, newFile) {
        var file = this.findInputFile(oldFile.path).clone();
        var oldFullpath = this.getFullpath(file.path);
        var newFullpath = this.getFullpath(newFile.path);
        SwfTree.updateChildFile(this, oldFile, newFile, oldFullpath, newFullpath, true);
    };
    /**
     *
     * @param oldFile
     * @param newFile
     */
    SwfTree.prototype.updateOutputFile = function (oldFile, newFile) {
        var file = this.findOutputFile(oldFile.path).clone();
        var oldFullpath = this.getFullpath(file.path);
        var newFullpath = this.getFullpath(newFile.path);
        SwfTree.updateChildFile(this, oldFile, newFile, oldFullpath, newFullpath, false);
    };
    /**
     *
     * @param tree
     * @param oldFile
     * @param newFile
     * @param oldFullpath
     * @param newFullpath
     * @param isInput
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
    SwfTree.prototype.updatePath = function (file) {
        // const oldFile :SwfFile =
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
        // this.input_files.forEach(input => {
        //     // console.log(input.path);
        // });
    };
    SwfTree.prototype.findInputFile = function (path) {
        var _this = this;
        var file = this.getInputFile(path);
        if (file) {
            return file;
        }
        else {
            return this.input_files.filter(function (file) { return _this.path + "/" + file.getPath() === ClientUtility.normalize(path); })[0];
        }
    };
    SwfTree.prototype.findOutputFile = function (path) {
        var _this = this;
        var file = this.getOutputFile(path);
        if (file) {
            return file;
        }
        else {
            return this.output_files.filter(function (file) { return _this.path + "/" + file.getPath() === ClientUtility.normalize(path); })[0];
        }
    };
    SwfTree.prototype.findSendFile = function (path) {
        var _this = this;
        var file = this.getSendFile(path);
        if (file) {
            return file;
        }
        else {
            return this.send_files.filter(function (file) { return _this.path + "/" + file.getPath() === ClientUtility.normalize(path); })[0];
        }
    };
    SwfTree.prototype.findReceiveFile = function (path) {
        var _this = this;
        var file = this.getReceiveFile(path);
        if (file) {
            return file;
        }
        else {
            return this.receive_files.filter(function (file) { return _this.path + "/" + file.getPath() === ClientUtility.normalize(path); })[0];
        }
    };
    SwfTree.prototype.setScriptPath = function (file) {
        this.uploadScript = file;
        this.script.path = file.name;
    };
    SwfTree.prototype.setJobScriptPath = function (file) {
        this.uploadScript = file;
        this.job_script.path = file.name;
    };
    SwfTree.prototype.setParameterFilePath = function (file) {
        this.uploadParamFile = file;
        this.parameter_file.path = file.name;
    };
    SwfTree.prototype.setSendFilepath = function (files) {
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
    SwfTree.prototype.deleteSendfile = function (target) {
        var filepath;
        if (typeof target === 'string') {
            filepath = target;
        }
        else {
            filepath = target.path;
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
    SwfTree.prototype.setUploadFilePath = function (files) {
        this.upload_files = [];
        for (var index = 0; index < files.length; index++) {
            this.upload_files.push(files[index]);
        }
    };
    SwfTree.prototype.deleteUploadfile = function (file) {
        for (var index = this.upload_files.length - 1; index >= 0; index--) {
            if (this.upload_files[index].name === file.name) {
                this.upload_files.splice(index, 1);
            }
        }
    };
    SwfTree.prototype.isExistSendfile = function (sendFile) {
        var target = this.uploadSendfiles.filter(function (file) { return file.name === sendFile.path; })[0];
        if (target) {
            return true;
        }
        else {
            return false;
        }
    };
    SwfTree.prototype.isExistUploadScript = function () {
        return this.uploadScript != null;
    };
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
                    path: ClientUtility.normalize(projectDirectory + "/" + tree.getFullpath(tree.uploadScript.name)),
                    file: tree.uploadScript
                });
            }
            if (tree.uploadParamFile) {
                files.push({
                    path: ClientUtility.normalize(projectDirectory + "/" + tree.getFullpath(tree.uploadParamFile.name)),
                    file: tree.uploadParamFile
                });
            }
            tree.uploadSendfiles.forEach(function (file) {
                files.push({
                    path: ClientUtility.normalize(projectDirectory + "/" + tree.getFullpath(file.name)),
                    file: file
                });
            });
            tree.upload_files.forEach(function (file) {
                files.push({
                    path: ClientUtility.normalize(projectDirectory + "/" + tree.getFullpath(file.name)),
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