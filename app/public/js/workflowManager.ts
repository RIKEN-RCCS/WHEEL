$(() => {
    // socket io
    const socket = io('/swf/workflow');
    const readTreeJsonSocket = new ReadTreeJsonSocket(socket);
    const writeTreeJsonSocket = new WriteTreeJsonSocket(socket);
    const getFileStatSocket = new GetFileStatSocket(socket);
    const getTemplateJsonFileSocket = new GetTemplateJsonFileSocket(socket);
    const getRemoteHostListSocket = new GetRemoteHostListSocket(socket);
    const fileUploadSocket = new UploadFileSocket(socket);
    const deleteDirectorySocket = new DeleteDirectorySocket(socket);

    // property
    const jsonProperty = new JsonProperty();

    // yes no dialog
    const revertDialog = new YesNoDialog('Are you sure you want to revert ?');
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

    // svg
    const treeSvg = $('#tree_svg');
    const nodeSvg = $('#node_svg');

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
        if (rootFilePath == null) {
            throw new Error('illegal access');
        }
        readTreeJson();
        setResizeEventForTreePane();
        setUpdateDisplayEvent();
        setSelectFileEvent();
        setEditScriptEvent();
        setClickEventForMoveToProjectManagePage();
        setSaveDialogEventsForScriptEdit();
        setContextMenuEvents();
        setKeyupEventForRenameWorkflowName();
        setKeyupEventForRenameWorkflowDescription();
        setSaveDialogEvents();
        setRevertDialogEvents();
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
     * resize node svg width
     */
    function resizeNodeSvg() {
        nodeSvg.css('width', `calc(100% - ${treeSvg.outerWidth()}px`);
    }

    /**
     * set resize event to resize tree pane panel
     */
    function setResizeEventForTreePane() {
        treeSvg.resizable({
            handles: 'e',
            minWidth: 1,
            maxWidth: 512,
            stop: setScrollBar
        });

        $(window).resize(resizeNodeSvg);
        resizeNodeSvg();
    }

    /**
     * set scrollbar to tree svg
     */
    function setScrollBar() {
        if (treeSvg.width() < SvgNodePane.getWidth()) {
            treeSvg.css('overflow-x', 'auto');
        }
        else {
            treeSvg.css('overflow-x', 'hidden');
        }
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
                deleteDirectorys(() => {
                    writeTreeJsonSocket.emit(projectDirectory, rootTree, () => {
                        uploadFiles(() => {
                            readTreeJson();
                            moveToScriptEditPage();
                        });
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
                deleteDirectorys(() => {
                    writeTreeJsonSocket.emit(projectDirectory, rootTree, () => {
                        uploadFiles(() => {
                            readTreeJson();
                        });
                    });
                });
            });
    }

    /**
     * delete directorys
     * @param callback The function to call when we delete directorys
     */
    function deleteDirectorys(callback: (() => void)) {
        const directorys = SwfTree
            .getDeleteDirectorys()
            .map(dir => ClientUtility.normalize(projectDirectory, dir));

        if (directorys[0]) {
            deleteDirectorySocket.emit(directorys, callback);
        }
        else {
            callback();
        }
    }

    /**
     * set several events for yes no dialog for reset workflow
     */
    function setRevertDialogEvents() {
        revertDialog
            .onClickCancel()
            .onClickOK(() => {
                readTreeJson();
                revertDialog.hide();
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
            revertDialog.show();
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
                if (!SwfTree.getSwfTree(taskIndex)) {
                    taskIndex = SwfTree.getRootIndex();
                }
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
    function setContextMenuEvents() {

        function getClickPosition(option): Position2D {
            const parentOffset: JQueryCoordinates = $(option.selector).offset();
            const clickPosition: JQueryCoordinates = option.$menu.position();
            const position: Position2D = {
                x: Math.round(clickPosition.left - parentOffset.left),
                y: Math.round(clickPosition.top - parentOffset.top)
            };
            return position;
        }

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
                            callback: (name, option) => {
                                const position = getClickPosition(option);
                                createChildTree(SwfType.WORKFLOW, parentTree, position, (child) => {
                                    hideProperty();
                                });
                            }
                        },
                        sep1: '---------',
                        task: {
                            name: 'Task',
                            callback: (name, option) => {
                                const position = getClickPosition(option);
                                createChildTree(SwfType.TASK, parentTree, position, (child) => {
                                    hideProperty();
                                });
                            }
                        },
                        sep2: '---------',
                        rtask: {
                            name: 'Remote Task',
                            callback: (name, option) => {
                                const position = getClickPosition(option);
                                createChildTree(SwfType.REMOTETASK, parentTree, position, (child) => {
                                    getHostList(() => {
                                        const rtask = <SwfRemoteTask><any>child;
                                        rtask.remote = new SwfHost(hostInfos[0]);
                                    });
                                    hideProperty();
                                });
                            }
                        },
                        sep3: '---------',
                        job: {
                            name: 'Job',
                            callback: (name, option) => {
                                const position = getClickPosition(option);
                                createChildTree(SwfType.JOB, parentTree, position, (child) => {
                                    getHostList(() => {
                                        const job = <SwfJobJson><any>child;
                                        job.remote = new SwfHost(hostInfos[0]);
                                        job.remote.job_scheduler = SwfJobScheduler.TCS;
                                    });
                                    hideProperty();
                                });
                            }
                        },
                        sep4: '---------',
                        loop: {
                            name: 'For',
                            callback: (name, option) => {
                                const position = getClickPosition(option);
                                createChildTree(SwfType.FOR, parentTree, position, (child) => {
                                    hideProperty();
                                });
                            }
                        },
                        sep5: '---------',
                        if: {
                            name: 'If',
                            callback: (name, option) => {
                                const position = getClickPosition(option);
                                createChildTree(SwfType.IF, parentTree, position, (ifChild) => {
                                    createChildTree(SwfType.CONDITION, ifChild, position, (ifGrandson) => {
                                        createChildTree(SwfType.ELSE, parentTree, position, (elseChild) => {
                                            createChildTree(SwfType.CONDITION, elseChild, position, (elseGrandson) => {
                                                parentTree.relations.push(new SwfRelation(ifChild.getHashCode(), elseChild.getHashCode()));
                                                hideProperty();
                                            });
                                        });
                                    });
                                });
                            }
                        },
                        sep6: '---------',
                        break: {
                            name: 'Break',
                            callback: (name, option) => {
                                const position = getClickPosition(option);
                                createChildTree(SwfType.BREAK, parentTree, position, (child) => {
                                    hideProperty();
                                });
                            },
                            disabled: () => {
                                return !parentTree.isExistForWorkflowAtParent();
                            }
                        },
                        sep7: '---------',
                        pstudy: {
                            name: 'Parameter Study',
                            callback: (name, option) => {
                                const position = getClickPosition(option);
                                createChildTree(SwfType.PSTUDY, parentTree, position, (child) => {
                                    hideProperty();
                                });
                            },
                        }
                    }
                },
                sep1: '---------',
                delete: {
                    name: 'Delete',
                    callback: () => {
                        selectedTree.remove();
                        hideProperty();
                        updateDisplay(taskIndex);
                    },
                    disabled: () => {
                        return selectedTree == null;
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
        setScrollBar();
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

                if (SwfType.isImplimentsWorkflow(parent)) {
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
     * @param callback The function to call when we create new child tree
     */
    function createChildTree(fileType: SwfType, parent: SwfTree, position: Position2D, callback?: ((child: SwfTree) => void)) {
        getTemplateJsonFileSocket.emit(fileType, (json: SwfTree) => {
            const child = parent.addChild(json, fileType, position);
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
        const filename = ClientUtility.getTemplate(tree).getDefaultName();
        const currentDirectory = tree.getCurrentDirectory();
        return ClientUtility.normalize(projectDirectory, currentDirectory, filename);
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

        fileUploadSocket.onEvent((isUpload: boolean, filepath: string) => {
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
