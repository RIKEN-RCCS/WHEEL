$(() => {
    const socket = io('/swf/workflow');
    const readTreeJsonSocket = new ReadTreeJsonSocket(socket);
    const writeTreeJsonSocket = new WriteTreeJsonSocket(socket);
    const getFileStatSocket = new GetFileStatSocket(socket);
    const getTemplateJsonFileSocket = new GetTemplateJsonFileSocket(socket);
    const getRemoteHostListSocket = new GetRemoteHostListSocket(socket);
    const fileUploadSocket = new UploadFileSocket(socket);

    const jsonProperty = new JsonProperty();

    const resetDialog = new YesNoDialog('Are you sure you want to reset ?');
    const saveDialog = new YesNoDialog('Are you sure you want to save ?');

    const rootWorkflow = $('#root_workflow');
    const addressBar = $('#address_bar');
    const workflowName = $('#workflow_name');
    const workflowBirth = $('#workflow_birthday');
    const workflowUpdate = $('#workflow_update');
    const workflowDesc = $('#workflow_desc');

    const saveButton = $('#save_button');
    const resetButton = $('#reset_button');
    const fileSelect = $('#file_select');

    const cookies = ClientUtility.getCookies();
    const projectFilePath = cookies['project'];
    const projectDirectory = ClientUtility.dirname(ClientUtility.dirname(projectFilePath));
    const rootFilePath = cookies['root'];

    let taskIndex: string = cookies['index'];
    let hostInfos: SwfHostJson[];
    let rootTree: SwfTree;
    let parentTree: SwfTree;
    let childTree: SwfTree;

    /**
     *
     */
    $(document).on('updateDisplay', () => {
        display(taskIndex);
    });

    /**
     *
     */
    $(document).on('selectFile', (eventObject, value: { isMultiple: boolean, callback: Function }) => {
        if (value.isMultiple) {
            fileSelect.prop('multiple', 'multiple');
        }
        else {
            fileSelect.removeProp('multiple');
        }
        fileSelect.click();
        fileSelect.off('change');
        fileSelect.one('change', (eventObject) => {
            const target: any = eventObject.target;
            const files: FileList = target.files;
            value.callback(files);
            showProperty(childTree);
        });
    });

    /**
     * move to workflow manager page
     */
    rootWorkflow.click(() => {
        ClientUtility.moveWorkflowLink(projectFilePath);
    });

    /**
     * task name changed event
     */
    workflowName.change(() => {
        if (parentTree.name = workflowName.val().trim()) {
            display(taskIndex);
        }
        else {
            workflowName.borderInvalid();
        }
    });

    /**
     * task description changed event
     */
    workflowDesc.change(() => {
        parentTree.description = workflowDesc.val().trim();
    });

    /**
     * reset dialog
     */
    resetDialog
        .onClickCancel()
        .onClickOK(() => {
            readTreeJsonSocket.emit(rootFilePath);
            resetDialog.hide();
        });

    /**
     * save dialog
     */
    saveDialog
        .onClickCancel()
        .onClickOK(() => {
            writeTreeJsonSocket.emit(projectDirectory, rootTree, () => {
                uploadFiles(() => {
                    readTreeJsonSocket.emit(rootFilePath);
                });
            });
        });

    /**
     * save button click event
     */
    saveButton.click(() => {
        if (ClientUtility.isValidDirectoryName(parentTree.name)) {
            saveDialog.show();
        }
    });

    /**
     * reset button click event
     */
    resetButton.click(() => {
        resetDialog.show();
    });

    /**
     * open .tree.json or open .wf.json and create .tree.json
     */
    readTreeJsonSocket.onConnect(rootFilePath, (treeJson: SwfTreeJson) => {
        rootTree = SwfTree.create(treeJson);
        jsonProperty.hide();
        childTree = null;
        display(taskIndex);
    });

    /**
     * context menu
     */
    $.contextMenu({
        selector: '#node_svg',
        autoHide: true,
        reposition: false,
        items: {
            new: {
                name: 'New',
                items: {
                    workflow: {
                        name: "Workflow",
                        callback: () => {
                            createChildTree(JsonFileType.WorkFlow);
                        }
                    },
                    sep1: '---------',
                    task: {
                        name: 'Task',
                        callback: () => {
                            createChildTree(JsonFileType.Task);
                        }
                    },
                    sep2: '---------',
                    rtask: {
                        name: 'RemoteTask',
                        callback: () => {
                            createChildTree(JsonFileType.RemoteTask);
                        }
                    },
                    sep3: '---------',
                    job: {
                        name: 'Job',
                        callback: () => {
                            createChildTree(JsonFileType.Job);
                        }
                    },
                    sep4: '---------',
                    sep5: '---------',
                    loop: {
                        name: 'Loop',
                        callback: () => {
                            createChildTree(JsonFileType.Loop);
                        }
                    },
                    sep6: '---------',
                    if: {
                        name: 'If',
                        callback: () => {
                            createChildTree(JsonFileType.If);
                        }
                    },
                    sep7: '---------',
                    break: {
                        name: 'Break',
                        callback: () => {
                            createChildTree(JsonFileType.Break);
                        },
                        disabled: () => {
                            return !ClientUtility.checkFileType(parentTree, JsonFileType.Loop);
                        }
                    },
                    sep8: '---------',
                    pstudy: {
                        name: 'PStudy',
                        callback: () => {
                            createChildTree(JsonFileType.PStudy);
                        },
                    }
                }
            }
        }
    });

    /**
     *
     * @param object
     */
    function display(object: (string | SwfTree)): void {
        if (typeof object === 'string') {
            taskIndex = object;
        }
        else {
            taskIndex = object.getIndexString();
        }

        SvgNodePain.create(rootTree, taskIndex, 'tree_svg', display);
        createNode();
    }

    /**
     *
     */
    function createNode(): void {
        const tree = SwfTree.getSwfTree(taskIndex);
        parentTree = tree;
        const filepath = getFullpath(tree);
        addressBar.val(filepath);
        workflowName.val(tree.name);
        workflowDesc.val(tree.description);
        getFileStat(filepath);
        SvgNodeUI.create(tree, childTree, 'node_svg',
            (child: SwfTree) => {
                if (child == null) {
                    jsonProperty.hide();
                    childTree = null;
                    return;
                }
                childTree = child;
                showProperty(child);
            },
            (parent: SwfTree) => {
                parent = parent || parentTree.getParent();
                if (parent == null) {
                    return;
                }

                if (ClientUtility.isImplimentsWorkflow(parent.type)) {
                    jsonProperty.hide();
                    childTree = null;
                    display(parent);
                }
            });
    }

    /**
     *
     * @param child
     */
    function showProperty(child: SwfTree) {
        if (hostInfos == null) {
            getRemoteHostListSocket.emit((hosts: SwfHostJson[]) => {
                hostInfos = hosts;
                jsonProperty.show(child, hostInfos);
            });
        }
        else {
            jsonProperty.show(child, hostInfos);
        }
    }

    /**
     *
     * @param fileType
     * @param tree
     */
    function createChildTree(fileType: JsonFileType, tree?: SwfTree) {
        if (tree == null) {
            tree = SwfTree.getSwfTree(taskIndex);
        }

        getTemplateJsonFileSocket.emit(fileType, (json: SwfTreeJson) => {
            const rand = Math.floor(Date.now() / 100) % 100000;
            const dirname = `${json.type}Dir${`00000${rand}`.slice(-5)}`;
            const child = tree.addChild(json, dirname, fileType);

            if (fileType === JsonFileType.If) {
                createChildTree(JsonFileType.Condition, child);
            }
            else if (fileType === JsonFileType.Condition) {
                createChildTree(JsonFileType.Else);
            }
            else {
                jsonProperty.hide();
                childTree = null;
                display(taskIndex);
            }
        });
    }

    /**
     *
     * @param filepath
     */
    function getFileStat(filepath: string): void {
        getFileStatSocket.emit(filepath, (stat: FileStat) => {
            if (stat) {
                workflowUpdate.text(new Date(stat.mtime).toLocaleString());
                workflowBirth.text(new Date(stat.birthtime).toLocaleString());
            }
            else {
                workflowUpdate.text('----/--/-- --:--:--');
                workflowBirth.text('----/--/-- --:--:--');
            }
        });
    }

    /**
     *
     * @param tree
     */
    function getFullpath(tree: SwfTree): string {
        const filename = ClientUtility.getDefaultName(tree);
        const currentDirectory = tree.getCurrentDirectory();
        return ClientUtility.normalize(`${projectDirectory}/${currentDirectory}/${filename}`);
    }

    /**
     *
     * @param callback
     */
    function uploadFiles(callback: Function) {
        const files = SwfTree.getUploadFiles(projectDirectory);
        const loop = () => {
            const data = files.shift();
            if (!data) {
                callback();
                return;
            }

            fileUploadSocket.emit(data, (isUpload: boolean) => {
                loop();
            });
        }
        loop();
    }
});
