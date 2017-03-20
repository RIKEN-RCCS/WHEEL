$(() => {
    // socket io
    const socket = io('/swf/workflow');
    const readTreeJsonSocket = new ReadTreeJsonSocket(socket);
    const writeTreeJsonSocket = new WriteTreeJsonSocket(socket);
    const getFileStatSocket = new GetFileStatSocket(socket);
    const getTemplateJsonFileSocket = new GetTemplateJsonFileSocket(socket);
    const getRemoteHostListSocket = new GetRemoteHostListSocket(socket);
    const fileUploadSocket = new UploadFileSocket(socket);

    // property
    const jsonProperty = new JsonProperty();

    // yes no dialog
    const resetDialog = new YesNoDialog('Are you sure you want to reset ?');
    const saveDialog = new YesNoDialog('Are you sure you want to save ?');
    const editDialog = new YesNoDialog('Are you sure you want to save for editing script ?');

    // elements
    const rootWorkflow = $('#root_workflow');
    const addressBar = $('#address_bar');
    const workflowName = $('#workflow_name');
    const workflowBirth = $('#workflow_birthday');
    const workflowUpdate = $('#workflow_update');
    const workflowDesc = $('#workflow_desc');
    const saveButton = $('#save_button');
    const resetButton = $('#reset_button');
    const fileSelect = $('#file_select');

    // cookies
    const cookies = ClientUtility.getCookies();
    const projectFilePath = cookies['project'];
    const rootFilePath = cookies['root'];

    const projectDirectory = ClientUtility.dirname(ClientUtility.dirname(projectFilePath));

    let taskIndex: string = cookies['index'];
    let hostInfos: SwfHostJson[];
    let rootTree: SwfTree;
    let parentTree: SwfTree;
    let selectedTree: SwfTree;

    // connect flag to server
    let isConnect: boolean = false;

    /**
     * initialize
     */
    (function init() {
        readTreeJson();
        setUpdateDisplayEvent();
        setSelectFileEvent();
        setEditScriptEvent();
        setClickEventForMoveToProjectManagePage();
        setSaveDialogEventsForScriptEdit();
        setContextMenuEnvets();
        setKeyupEventForRenameWorkflowName();
        setKeyupEventForRenameWorkflowDescription();
        setSaveDialogEvents();
        setResetDialogEvents();
        setClickEventForSaveWorkflow();
        setClickEventForResetWorkflow();
    })();

    /**
     * set update display event to recreate a new tree
     */
    function setUpdateDisplayEvent() {
        $(document).on('updateDisplay', () => {
            updateDisplay(taskIndex);
        });
    }

    /**
     * set select file event by browse to upload file selection
     */
    function setSelectFileEvent() {
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
                showProperty(selectedTree);
            });
        });
    }

    /**
     * set edit script file event to modify submit job script
     */
    function setEditScriptEvent() {
        $(document).on('editScript', () => {
            editDialog.show();
        });
    }

    /**
     * set click event to move to project manager page
     */
    function setClickEventForMoveToProjectManagePage() {
        rootWorkflow.click(() => {
            ClientUtility.moveWorkflowLink(projectFilePath);
        });
    }

    /**
     * set several events for yes no dialog to open script file
     */
    function setSaveDialogEventsForScriptEdit() {
        editDialog
            .onClickCancel()
            .onClickOK(() => {
                window.open('', 'editor');
                writeTreeJsonSocket.emit(projectDirectory, rootTree, () => {
                    uploadFiles(() => {
                        readTreeJson();
                        moveToScriptEditPage();
                    });
                });
            });
    }

    /**
     * movet to script edit page
     */
    function moveToScriptEditPage() {
        const fullpath = `${projectDirectory}/${selectedTree.getFullpath(config.submit_script)}`;
        $('<form/>', { action: '/swf/editor.html', method: 'post', target: 'editor' })
            .append($('<input/>', { type: 'hidden', name: 'edit', value: fullpath }))
            .appendTo(document.body)
            .submit();
    }

    /**
     * set key up event for rename workflow name
     */
    function setKeyupEventForRenameWorkflowName() {
        workflowName.on('keyup', (eventObject) => {
            const name = workflowName.val().trim();
            if (parentTree.name !== name) {
                parentTree.name = name;
                updateDisplay(taskIndex);
            }
        });
    }

    /**
     * set key up event for rename description name
     */
    function setKeyupEventForRenameWorkflowDescription() {
        workflowDesc.on('keyup', (eventObject) => {
            const description = workflowDesc.val().trim()
            if (parentTree.description !== description) {
                parentTree.description = description;
            }
        });
    }

    /**
     * set several events for yes no dialog for save workflow
     */
    function setSaveDialogEvents() {
        saveDialog
            .onClickCancel()
            .onClickOK(() => {
                writeTreeJsonSocket.emit(projectDirectory, rootTree, () => {
                    uploadFiles(() => {
                        readTreeJson();
                    });
                });
            });
    }

    /**
     * set several events for yes no dialog for reset workflow
     */
    function setResetDialogEvents() {
        resetDialog
            .onClickCancel()
            .onClickOK(() => {
                readTreeJson();
                resetDialog.hide();
            });
    }

    /**
     * set click event for save workflow
     */
    function setClickEventForSaveWorkflow() {
        saveButton.click(() => {
            if (ClientUtility.isValidDirectoryName(parentTree.name)) {
                saveDialog.show();
            }
        });
    }

    /**
     * set click event for reset workflow
     */
    function setClickEventForResetWorkflow() {
        resetButton.click(() => {
            resetDialog.show();
        });
    }

    /**
     * read tree json file from server
     */
    function readTreeJson() {
        if (!isConnect) {
            isConnect = true;
            readTreeJsonSocket.onConnect(rootFilePath, (treeJson: SwfTreeJson) => {
                rootTree = SwfTree.create(treeJson);
                hideProperty();
            });
        }
        else {
            readTreeJsonSocket.emit(rootFilePath);
        }
    }

    /**
     * set contextmenu events
     */
    function setContextMenuEnvets() {
        $.contextMenu({
            selector: '#node_svg',
            autoHide: true,
            reposition: false,
            items: {
                new: {
                    name: 'New...',
                    items: {
                        workflow: {
                            name: "Workflow",
                            callback: () => {
                                createChildTree(JsonFileType.WorkFlow, parentTree, (child: SwfTree) => {
                                    hideProperty();
                                });
                            }
                        },
                        sep1: '---------',
                        task: {
                            name: 'Task',
                            callback: () => {
                                createChildTree(JsonFileType.Task, parentTree, (child: SwfTree) => {
                                    hideProperty();
                                });
                            }
                        },
                        sep2: '---------',
                        rtask: {
                            name: 'Remote Task',
                            callback: () => {
                                createChildTree(JsonFileType.RemoteTask, parentTree, (child: SwfTree) => {
                                    getHostList(() => {
                                        child.host = new SwfHost(hostInfos[0]);
                                    });
                                    hideProperty();
                                });
                            }
                        },
                        sep3: '---------',
                        job: {
                            name: 'Job',
                            callback: () => {
                                createChildTree(JsonFileType.Job, parentTree, (child: SwfTree) => {
                                    getHostList(() => {
                                        child.host = new SwfHost(hostInfos[0]);
                                        child.host.job_scheduler = config.scheduler.TCS;
                                    });
                                    hideProperty();
                                });
                            }
                        },
                        sep4: '---------',
                        sep5: '---------',
                        loop: {
                            name: 'Loop',
                            callback: () => {
                                createChildTree(JsonFileType.Loop, parentTree, (child: SwfTree) => {
                                    hideProperty();
                                });
                            }
                        },
                        sep6: '---------',
                        if: {
                            name: 'If',
                            callback: () => {
                                createChildTree(JsonFileType.If, parentTree, (ifChild: SwfTree) => {
                                    createChildTree(JsonFileType.Condition, ifChild, (ifGrandson: SwfTree) => {
                                        createChildTree(JsonFileType.Else, parentTree, (elseChild: SwfTree) => {
                                            createChildTree(JsonFileType.Condition, elseChild, (elseGrandson: SwfTree) => {
                                                parentTree.relations.push(new SwfRelation(ifChild.getTaskIndex(), elseChild.getTaskIndex()));
                                                hideProperty();
                                            });
                                        });
                                    });
                                });
                            }
                        },
                        sep7: '---------',
                        break: {
                            name: 'Break',
                            callback: () => {
                                createChildTree(JsonFileType.Break, parentTree, (child: SwfTree) => {
                                    hideProperty();
                                });
                            },
                            disabled: () => {
                                return !ClientUtility.checkFileType(parentTree, JsonFileType.Loop);
                            }
                        },
                        sep8: '---------',
                        pstudy: {
                            name: 'Parameter Study',
                            callback: () => {
                                createChildTree(JsonFileType.PStudy, parentTree, (child: SwfTree) => {
                                    hideProperty();
                                });
                            },
                        }
                    }
                }
            }
        });

    }

    /**
     * update display
     * @param index tree index string
     */
    function updateDisplay(index: string): void;

    /**
     * update display
     * @param tree SwfTree instance
     */
    function updateDisplay(tree: SwfTree): void;

    /**
     * update display
     * @param object tree index string or SwfTree instance
     */
    function updateDisplay(object: (string | SwfTree)): void {
        if (typeof object === 'string') {
            taskIndex = object;
        }
        else {
            taskIndex = object.getIndexString();
        }

        SvgNodePane.create(rootTree, taskIndex, 'tree_svg', (tree: SwfTree) => {
            jsonProperty.hide();
            selectedTree = null;
            updateDisplay(tree);
        });
        createRelationNode();
    }

    /**
     * create relation node
     */
    function createRelationNode(): void {
        const tree = SwfTree.getSwfTree(taskIndex);
        parentTree = tree;
        const filepath = getFullpath(tree);
        addressBar.val(filepath);
        workflowName.val(tree.name);
        workflowDesc.val(tree.description);
        SvgNodeUI.create(tree, selectedTree, 'node_svg',
            (child: SwfTree) => {
                if (child == null) {
                    jsonProperty.hide();
                    selectedTree = null;
                    return;
                }
                selectedTree = child;
                showProperty(child);
            },
            (parent: SwfTree) => {
                parent = parent || parentTree.getParent();
                if (parent == null) {
                    return;
                }

                if (ClientUtility.isImplimentsWorkflow(parent)) {
                    jsonProperty.hide();
                    selectedTree = null;
                    updateDisplay(parent);
                }
            });
    }

    /**
     * show display
     * @param tree display tree
     */
    function showProperty(tree: SwfTree) {
        getHostList(() => {
            jsonProperty.show(tree, hostInfos);
        });
    }

    /**
     * hide display
     */
    function hideProperty() {
        jsonProperty.hide();
        selectedTree = null;
        updateDisplay(taskIndex);
    }

    /**
     * create child tree
     * @param fileType json file type
     * @param parent parent tree added child
     * @param callback function
     */
    function createChildTree(fileType: JsonFileType, parent: SwfTree, callback?: ((child: SwfTree) => void)) {
        getTemplateJsonFileSocket.emit(fileType, (json: SwfTreeJson) => {
            const child = parent.addChild(json, fileType);
            if (callback) {
                callback(child);
            }
        });
    }

    /**
     * get file status
     * @param filepath file path string
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
     * get host list
     * @param callback function
     */
    function getHostList(callback: Function) {
        if (hostInfos == null) {
            getRemoteHostListSocket.emit((hosts: SwfHostJson[]) => {
                hostInfos = hosts;
                callback();
            });
        }
        else {
            callback();
        }
    }

    /**
     * get absolute filepath from root workflow to selected SwfTree instance
     * @param tree SwfTree instance
     * @return absolute path
     */
    function getFullpath(tree: SwfTree): string {
        const filename = ClientUtility.getDefaultName(tree);
        const currentDirectory = tree.getCurrentDirectory();
        return ClientUtility.normalize(`${projectDirectory}/${currentDirectory}/${filename}`);
    }

    /**
     * upload files
     * @param callback function
     */
    function uploadFiles(callback: Function) {
        const files = SwfTree.getUploadFiles(projectDirectory);
        const fileCount = files.length;
        let sendCount = 0;

        if (fileCount === 0) {
            callback();
            return;
        }

        fileUploadSocket.onEvent((isUpload: boolean, filename: string) => {
            sendCount++;
            if (sendCount === fileCount) {
                fileUploadSocket.offEvent();
                callback();
            }
        });

        files.forEach(data => {
            fileUploadSocket.emit(data);
        });
    }
});
