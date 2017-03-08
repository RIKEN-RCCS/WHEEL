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
        if (treeJson.else_file) {
            _this.else_file = new SwfFile(treeJson.else_file);
        }
        if (treeJson.host) {
            _this.host = new SwfHost(treeJson.host);
        }
        if (treeJson.job_script) {
            _this.job_script = new SwfFile(treeJson.job_script);
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
     * @param dirname
     * @param fileType
     */
    SwfTree.prototype.addChild = function (treeJson, dirname, fileType) {
        var tree = new SwfTree(treeJson);
        tree.path = dirname;
        tree.oldPath = dirname;
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
            delete tree.script_param;
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
        if (input[0]) {
            return true;
        }
        else {
            if (output[0]) {
                return true;
            }
            else {
                return false;
            }
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
        var file = new SwfFile(child.getInputFile(filepath));
        var fullpath = child.getFullpath(file);
        SwfTree.addFileToParent(this, new SwfFile(file), fullpath, true);
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
        var file = new SwfFile(child.getOutputFile(filepath));
        var fullpath = child.getFullpath(file);
        SwfTree.addFileToParent(this, new SwfFile(file), fullpath, false);
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
        this.addFileToParent(parent, new SwfFile(file), fullpath, isInput);
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
        var file = new SwfFile(child.getInputFile(filepath));
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
        var file = new SwfFile(child.getOutputFile(filepath));
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
        files.forEach(function (file, index) {
            var relativePath = ClientUtility.normalize("./" + tree.getRelativePath(fullpath));
            if (relativePath === file.path) {
                console.log("delete parent path " + file.path);
                files.splice(index, 1);
            }
        });
        var parent = tree.getParent();
        parent.file_relations.forEach(function (relation, index) {
            var relativePath = ClientUtility.normalize("./" + tree.getRelativePath(fullpath));
            if (isInput) {
                if (relativePath === ClientUtility.normalize(relation.path_input_file)) {
                    console.log("delete parent relation " + relation.path_input_file);
                    parent.file_relations.splice(index, 1);
                }
            }
            else {
                if (relativePath === ClientUtility.normalize(relation.path_output_file)) {
                    console.log("delete parent relation " + relation.path_output_file);
                    parent.file_relations.splice(index, 1);
                }
            }
        });
        this.deleteFileFromParent(parent, fullpath, isInput);
    };
    /**
     *
     * @param oldFile
     * @param newFile
     */
    SwfTree.prototype.updateInputFile = function (oldFile, newFile) {
        var file = new SwfFile(this.getInputFile(oldFile.path));
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
        var file = new SwfFile(this.getOutputFile(oldFile.path));
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
        parent.file_relations.forEach(function (relation, index) {
            if (isInput) {
                if (relation.path_input_file === oldFile.path) {
                    relation.path_input_file = newFile.path;
                    if (oldFile.type !== newFile.type) {
                        parent.file_relations.splice(index, 1);
                    }
                }
            }
            else {
                if (relation.path_output_file === oldFile.path) {
                    relation.path_output_file = newFile.path;
                    if (oldFile.type !== newFile.type) {
                        parent.file_relations.splice(index, 1);
                    }
                }
            }
        });
        if (parent.isRoot()) {
            return;
        }
        var files = isInput ? parent.input_files : parent.output_files;
        files.forEach(function (input) {
            console.log("oldfull=" + oldFullpath + ", newfull=" + newFullpath);
            var oldRelative = parent.getRelativePath(oldFullpath);
            var newRelative = parent.getRelativePath(newFullpath);
            console.log("old=" + oldRelative + ", new=" + newRelative);
            if (input.path === oldRelative) {
                var regexp = new RegExp(oldFile.getPath() + "$");
                var old = new SwfFile(input);
                input.path = newRelative;
                input.name = newFile.name;
                input.description = newFile.description;
                input.required = newFile.required;
                input.type = newFile.type;
                // console.log(`convert ${oldRelative} to ${newRelative}`);
                _this.updateChildFile(parent, old, new SwfFile(input), oldFullpath, newFullpath, isInput);
            }
        });
    };
    /**
     *
     * @param dirname
     */
    SwfTree.prototype.updateChildren = function (file) {
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
                child.name = file.name;
                child.description = file.description;
                child.path = parent.getRelativePath(newFullpath);
                child.type = file.type;
                child.required = file.required;
            }
        });
    };
    return SwfTree;
}(SwfWorkflow));
//# sourceMappingURL=swfTree.js.map