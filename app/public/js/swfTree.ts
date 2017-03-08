
/**
 *
 */
class SwfTree extends SwfWorkflow implements SwfTreeJson {
    private static root: SwfTree;

    public children: SwfTree[] = [];
    public forParam: ForParam;
    public condition: SwfFile;
    public else_file: SwfFile;
    public host: SwfHost;
    public job_script: SwfFile;
    public oldPath: string;

    private indexes: number[] = [];
    private script_param: {
        cores: number;
        nodes: number;
    };

    /**
     *
     * @param treeJson
     */
    private constructor(treeJson: (SwfTree | SwfTreeJson)) {
        super(treeJson);

        this.oldPath = treeJson.oldPath;
        if (treeJson.children) {
            const children = JSON.parse(JSON.stringify(treeJson.children));
            this.children = children.map(child => new SwfTree(child));
        }
        if (treeJson.forParam) {
            this.forParam = JSON.parse(JSON.stringify(treeJson.forParam));
        }
        if (treeJson.condition) {
            this.condition = new SwfFile(treeJson.condition);
        }
        if (treeJson.else_file) {
            this.else_file = new SwfFile(treeJson.else_file);
        }
        if (treeJson.host) {
            this.host = new SwfHost(treeJson.host);
        }
        if (treeJson.job_script) {
            this.job_script = new SwfFile(treeJson.job_script);
        }

        if (ClientUtility.checkFileType(treeJson.type, JsonFileType.Job)) {
            this.script_param = {
                cores: 1,
                nodes: 1
            };
        }
    }

    /**
     *
     */
    public getIndexString(): string {
        return this.indexes.join('_');
    }

    /**
     *
     */
    public getHierarchy(): number {
        return this.indexes.length - 1;
    }

    /**
     *
     */
    public getAbsoluteIndex(): number {
        let index = 0;
        const search = (tree: SwfTree): number => {
            if (tree === this) {
                return index;
            }
            index++;
            return tree.children.map(child => search(child)).filter(num => num)[0];
        };
        return search(SwfTree.root);
    }

    /**
     *
     */
    public getTaskIndex(): number {
        return this.indexes[this.indexes.length - 1];
    }

    /**
     *
     * @param treeJson
     * @returns created SwfTree instance
     */
    public static create(treeJson: (SwfTree | SwfTreeJson)): SwfTree {
        this.root = new SwfTree(treeJson);
        const tree = this.renumberingIndex(this.root);
        return tree;
    }

    /**
     *
     * @param tree
     * @param hierarchy
     */
    private static renumberingIndex(tree: SwfTree, indexes: number[] = [0]): SwfTree {
        tree.indexes = indexes;
        tree.oldPath = tree.path;
        tree.children.forEach((child, index) => {
            const newIndexes: number[] = JSON.parse(JSON.stringify(indexes));
            newIndexes.push(index);
            this.renumberingIndex(child, newIndexes);
        });
        return tree;
    }

    /**
     *
     * @param treeJson
     * @param dirname
     * @param fileType
     */
    public addChild(treeJson: SwfTreeJson, dirname: string, fileType: JsonFileType): SwfTree {
        const tree = new SwfTree(treeJson);
        tree.path = dirname;
        tree.oldPath = dirname;
        this.children.push(tree);
        this.children_file.push(new SwfFile({
            name: tree.name,
            description: tree.description,
            path: `./${dirname}/${ClientUtility.getDefaultName(fileType)}`,
            required: true,
            type: 'file'
        }));
        this.positions.push({ x: 0, y: 0 });
        SwfTree.renumberingIndex(SwfTree.root);
        return tree;
    }

    /**
     *
     * @param dirname
     */
    public isDirnameDuplicate(dirname: string): boolean {
        if (this.children.filter(child => child.path === dirname)[0]) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
     *
     * @param index
     * @return SwfTree instance of selected index
     */
    public static getSwfTree(index: string): SwfTree {
        const notSeachedList: SwfTree[] = [this.root];
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
     *
     * @param tree
     * @param path
     */
    public getCurrentDirectory(): string {

        const searchDirectory = (tree: SwfTree, path: string = ''): string => {
            path = ClientUtility.normalize(`${tree.path}/${path}`);
            const parent = tree.getParent();
            if (parent == null) {
                return path;
            }
            else {
                return searchDirectory(parent, path);
            }
        };

        return searchDirectory(this);
    }

    /**
     *
     */

    public getParent(): SwfTree {
        if (this.isRoot()) {
            return null;
        }

        const searchParent = (tree: SwfTree, indexes: number[]): SwfTree => {
            if (indexes.length == 0) {
                return tree;
            }
            const index: number = indexes.shift();
            return searchParent(tree.children[index], indexes);
        };

        const length = this.indexes.length;
        const parentIndexes: number[] = this.indexes.slice(1, length - 1);
        return searchParent(SwfTree.root, parentIndexes);
    }

    /**
     *
     */
    public isRoot(): boolean {
        return this === SwfTree.root;
    }

    /**
     *
    */
    public toSwfTreeJson(): SwfTreeJson {
        const root = new SwfTree(this);
        const notSeachedList: SwfTree[] = [root];
        while (true) {
            const tree = notSeachedList.shift();
            if (!tree) {
                break;
            }
            tree.children.forEach(child => {
                notSeachedList.push(child);
            });

            delete tree.indexes;
            delete tree.script_param;
            Object.keys(this).forEach(key => {
                if (this[key] == null) {
                    delete this[key];
                }
            });
        }
        return root;
    }

    /**
     *
     * @param path
     */
    public isEnablePath(path: string): boolean {
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
    }

    /**
     *
     * @param to
     */
    public getFullpath(to: (SwfFile | SwfFileJson | string)) {
        let path: string;
        if (typeof to === 'string') {
            path = to;
        }
        else {
            path = to.path;
        }
        const directory = this.getCurrentDirectory();
        const basename = ClientUtility.basename(path);
        return ClientUtility.normalize(`${directory}/${path}`);
    }

    /**
     *
     * @param to
     */
    public getRelativePath(to: (SwfFile | SwfFileJson | string)) {
        let path: string;
        if (typeof to === 'string') {
            path = to;
        }
        else {
            path = this.getFullpath(to);
        }
        const directory = this.getCurrentDirectory();
        return `./${path.replace(new RegExp(`${directory}`), '')}`;
    }

    /**
     *
     * @param tree
     * @param taskIndex
     * @param filepath
     */
    public addInputFileToParent(task: (number | SwfTree), filepath: string) {
        let child: SwfTree;
        if (typeof task === 'number') {
            child = this.children[task];
        }
        else {
            child = task;
        }
        const file = new SwfFile(child.getInputFile(filepath));
        const fullpath = child.getFullpath(file);
        SwfTree.addFileToParent(this, new SwfFile(file), fullpath, true);
    }

    /**
     *
     * @param tree
     * @param taskIndex
     * @param filepath
     */
    public addOutputFileToParent(task: (number | SwfTree), filepath: string) {
        let child: SwfTree;
        if (typeof task === 'number') {
            child = this.children[task];
        }
        else {
            child = task;
        }
        const file = new SwfFile(child.getOutputFile(filepath));
        const fullpath = child.getFullpath(file);
        SwfTree.addFileToParent(this, new SwfFile(file), fullpath, false);
    }

    /**
     *
     * @param tree
     * @param file
     * @param fullpath
     */
    private static addFileToParent(tree: SwfTree, file: SwfFile, fullpath: string, isInput: boolean) {
        if (tree.isRoot()) {
            return;
        }
        const files: SwfFile[] = isInput ? tree.input_files : tree.output_files;
        this.deleteFileFromParent(tree, fullpath, isInput);
        file.path = tree.getRelativePath(fullpath);
        files.push(file);
        console.log(`add parent path ${file.path}`);
        const parent = tree.getParent();
        this.addFileToParent(parent, new SwfFile(file), fullpath, isInput);
    }

    /**
     *
     * @param tree
     * @param taskIndex
     * @param filepath
     */
    public deleteInputFileFromParent(task: (number | SwfTree), filepath: string) {
        let child: SwfTree;
        if (typeof task === 'number') {
            child = this.children[task];
        }
        else {
            child = task;
        }
        const file = new SwfFile(child.getInputFile(filepath));
        const fullpath = child.getFullpath(file);
        SwfTree.deleteFileFromParent(this, fullpath, true);
    }

    /**
     *
     * @param tree
     * @param taskIndex
     * @param filepath
     */
    public deleteOutputFileFromParent(task: (number | SwfTree), filepath: string) {
        let child: SwfTree;
        if (typeof task === 'number') {
            child = this.children[task];
        }
        else {
            child = task;
        }
        const file = new SwfFile(child.getOutputFile(filepath));
        const fullpath = child.getFullpath(file);
        SwfTree.deleteFileFromParent(this, fullpath, false);
    }

    /**
     *
     * @param tree
     * @param fullpath
     * @param isInput
     */
    private static deleteFileFromParent(tree: SwfTree, fullpath: string, isInput: boolean) {
        if (tree == null || tree.isRoot()) {
            return;
        }

        const files: SwfFile[] = isInput ? tree.input_files : tree.output_files;

        files.forEach((file, index) => {
            const relativePath = ClientUtility.normalize(`./${tree.getRelativePath(fullpath)}`);
            if (relativePath === file.path) {
                console.log(`delete parent path ${file.path}`);
                files.splice(index, 1);
            }
        });

        const parent = tree.getParent();
        parent.file_relations.forEach((relation, index) => {
            const relativePath = ClientUtility.normalize(`./${tree.getRelativePath(fullpath)}`);

            if (isInput) {
                if (relativePath === ClientUtility.normalize(relation.path_input_file)) {
                    console.log(`delete parent relation ${relation.path_input_file}`);
                    parent.file_relations.splice(index, 1);
                }
            }
            else {
                if (relativePath === ClientUtility.normalize(relation.path_output_file)) {
                    console.log(`delete parent relation ${relation.path_output_file}`);
                    parent.file_relations.splice(index, 1);
                }
            }
        });

        this.deleteFileFromParent(parent, fullpath, isInput);
    }

    /**
     *
     * @param oldFile
     * @param newFile
     */
    public updateInputFile(oldFile: SwfFile, newFile: SwfFile) {
        const file = new SwfFile(this.getInputFile(oldFile.path));
        const oldFullpath = this.getFullpath(file.path);
        const newFullpath = this.getFullpath(newFile.path);
        SwfTree.updateChildFile(this, oldFile, newFile, oldFullpath, newFullpath, true);
    }

    /**
     *
     * @param oldFile
     * @param newFile
     */
    public updateOutputFile(oldFile: SwfFile, newFile: SwfFile) {
        const file = new SwfFile(this.getOutputFile(oldFile.path));
        const oldFullpath = this.getFullpath(file.path);
        const newFullpath = this.getFullpath(newFile.path);
        SwfTree.updateChildFile(this, oldFile, newFile, oldFullpath, newFullpath, false);
    }

    /**
     *
     * @param tree
     * @param oldFile
     * @param newFile
     * @param oldFullpath
     * @param newFullpath
     * @param isInput
     */
    private static updateChildFile(tree: SwfTree, oldFile: SwfFile, newFile: SwfFile, oldFullpath: string, newFullpath: string, isInput: boolean) {

        const parent = tree.getParent();
        parent.file_relations.forEach((relation, index) => {
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

        const files: SwfFile[] = isInput ? parent.input_files : parent.output_files;

        files.forEach(input => {
            console.log(`oldfull=${oldFullpath}, newfull=${newFullpath}`);
            const oldRelative = parent.getRelativePath(oldFullpath);
            const newRelative = parent.getRelativePath(newFullpath);
            console.log(`old=${oldRelative}, new=${newRelative}`);

            if (input.path === oldRelative) {
                const regexp = new RegExp(`${oldFile.getPath()}$`);
                const old = new SwfFile(input);
                input.path = newRelative;
                input.name = newFile.name;
                input.description = newFile.description;
                input.required = newFile.required;
                input.type = newFile.type;
                // console.log(`convert ${oldRelative} to ${newRelative}`);
                this.updateChildFile(parent, old, new SwfFile(input), oldFullpath, newFullpath, isInput);
            }
        });
    }

    /**
     *
     * @param dirname
     */
    public updateChildren(file: SwfFile) {
        const oldFullpath = this.getFullpath(`${ClientUtility.getDefaultName(this)}`);
        this.path = file.path;
        const newFullpath = this.getFullpath(`${ClientUtility.getDefaultName(this)}`);
        console.log(`old=${oldFullpath} new=${newFullpath}`);
        const parent = this.getParent();
        if (parent == null) {
            return;
        }

        parent.children_file.forEach(child => {
            const fullpath = parent.getFullpath(child);
            if (fullpath === oldFullpath) {
                child.name = file.name;
                child.description = file.description;
                child.path = parent.getRelativePath(newFullpath);
                child.type = file.type;
                child.required = file.required;
            }
        });
    }
}