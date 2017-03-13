
/**
 *
 */
class SwfTree extends SwfWorkflow implements SwfTreeJson {
    private static root: SwfTree;

    public children: SwfTree[] = [];
    public forParam: ForParam;
    public condition: SwfFile;
    public host: SwfHost;
    public job_script: SwfFile;
    public parameter_file: SwfFile;
    public oldPath: string;

    private uploadScript: File;
    private uploadParamFile: File;
    private uploadSendfiles: File[] = [];
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
        if (treeJson.host) {
            this.host = new SwfHost(treeJson.host);
        }
        if (treeJson.job_script) {
            this.job_script = new SwfFile(treeJson.job_script);
        }
        if (treeJson.parameter_file) {
            this.parameter_file = new SwfFile(treeJson.parameter_file);
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
        tree.oldPath = '';
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
            delete tree.uploadScript;
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
     */
    public toSwfFile(): SwfFile {
        return new SwfFile({
            name: this.name,
            description: this.description,
            path: this.path,
            type: 'file',
            required: true
        });
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
        const file = child.findInputFile(filepath).clone();
        const fullpath = child.getFullpath(file);
        SwfTree.addFileToParent(this, file, fullpath, true);
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
        const file = child.findOutputFile(filepath).clone();
        const fullpath = child.getFullpath(file);
        SwfTree.addFileToParent(this, file, fullpath, false);
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
        this.addFileToParent(parent, file.clone(), fullpath, isInput);
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
        const file = child.findInputFile(filepath).clone();
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
        const file = child.findOutputFile(filepath).clone();
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
     *
     * @param oldFile
     * @param newFile
     */
    public updateInputFile(oldFile: SwfFile, newFile: SwfFile) {
        const file = this.findInputFile(oldFile.path).clone();
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
        const file = this.findOutputFile(oldFile.path).clone();
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
        const newPath = `./${ClientUtility.normalize(`${tree.path}/${newFile.path}`)}`;

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

        const files: SwfFile[] = isInput ? parent.input_files : parent.output_files;

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

    public updatePath(file: SwfFile) {
        // const oldFile :SwfFile =
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
                child.set(file);
                child.path = parent.getRelativePath(newFullpath);
            }
        });

        // this.input_files.forEach(input => {
        //     // console.log(input.path);

        // });
    }

    public findInputFile(path: string): SwfFile {
        const file: SwfFile = this.getInputFile(path);
        if (file) {
            return file;
        }
        else {
            return this.input_files.filter(file => `${this.path}/${file.getPath()}` === ClientUtility.normalize(path))[0];
        }
    }

    public findOutputFile(path: string): SwfFile {
        const file: SwfFile = this.getOutputFile(path);
        if (file) {
            return file;
        }
        else {
            return this.output_files.filter(file => `${this.path}/${file.getPath()}` === ClientUtility.normalize(path))[0];
        }
    }

    public findSendFile(path: string): SwfFile {
        const file: SwfFile = this.getSendFile(path);
        if (file) {
            return file;
        }
        else {
            return this.send_files.filter(file => `${this.path}/${file.getPath()}` === ClientUtility.normalize(path))[0];
        }
    }

    public findReceiveFile(path: string): SwfFile {
        const file: SwfFile = this.getReceiveFile(path);
        if (file) {
            return file;
        }
        else {
            return this.receive_files.filter(file => `${this.path}/${file.getPath()}` === ClientUtility.normalize(path))[0];
        }
    }

    public setScriptPath(file: File) {
        this.uploadScript = file;
        this.script.path = file.name;
    }

    public setParameterFile(file: File) {
        this.uploadParamFile = file;
        this.parameter_file.path = file.name;
    }

    public setSendFilepath(files: FileList) {
        this.uploadSendfiles = [];
        this.send_files = [];
        for (let index = 0; index < files.length; index++) {
            this.uploadSendfiles.push(files[index]);
            this.send_files.push(new SwfFile({
                name: 'name',
                description: '',
                path: files[index].name,
                type: 'file',
                required: true
            }));
        }
    }

    public deleteSendfile(file: SwfFile) {
        const index = this.send_files.indexOf(file);
        this.send_files.splice(index, 1);
        for (let index = this.uploadSendfiles.length - 1; index >= 0; index--) {
            this.uploadSendfiles.forEach(send => {
                if (send.name === file.path) {
                    this.uploadSendfiles.splice(index, 1);
                }
            });
        }
    }

    public static getUploadFiles(projectDirectory: string): UploadFileData[] {
        const files: UploadFileData[] = [];
        const notSeachedList: SwfTree[] = [this.root];
        while (true) {
            const tree = notSeachedList.shift();
            if (!tree) {
                break;
            }
            if (tree.uploadScript) {
                files.push({
                    path: ClientUtility.normalize(`${projectDirectory}/${tree.getFullpath(tree.uploadScript.name)}`),
                    file: tree.uploadScript
                });
            }
            if (tree.uploadParamFile) {
                files.push({
                    path: ClientUtility.normalize(`${projectDirectory}/${tree.getFullpath(tree.uploadParamFile.name)}`),
                    file: tree.uploadParamFile
                });
            }
            tree.uploadSendfiles.forEach(file => {
                files.push({
                    path: ClientUtility.normalize(`${projectDirectory}/${tree.getFullpath(file.name)}`),
                    file: file
                });
            });

            tree.children.forEach(child => {
                notSeachedList.push(child);
            });
        }
        return files;
    }
}