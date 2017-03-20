$(function () {
    // socket io
    var socket = io('/swf/workflow');
    var readTreeJsonSocket = new ReadTreeJsonSocket(socket);
    var writeTreeJsonSocket = new WriteTreeJsonSocket(socket);
    var getFileStatSocket = new GetFileStatSocket(socket);
    var getTemplateJsonFileSocket = new GetTemplateJsonFileSocket(socket);
    var getRemoteHostListSocket = new GetRemoteHostListSocket(socket);
    var fileUploadSocket = new UploadFileSocket(socket);
    // property
    var jsonProperty = new JsonProperty();
    // yes no dialog
    var resetDialog = new YesNoDialog('Are you sure you want to reset ?');
    var saveDialog = new YesNoDialog('Are you sure you want to save ?');
    var editDialog = new YesNoDialog('Are you sure you want to save for editing script ?');
    // elements
    var rootWorkflow = $('#root_workflow');
    var addressBar = $('#address_bar');
    var workflowName = $('#workflow_name');
    var workflowBirth = $('#workflow_birthday');
    var workflowUpdate = $('#workflow_update');
    var workflowDesc = $('#workflow_desc');
    var saveButton = $('#save_button');
    var resetButton = $('#reset_button');
    var fileSelect = $('#file_select');
    // cookies
    var cookies = ClientUtility.getCookies();
    var projectFilePath = cookies['project'];
    var rootFilePath = cookies['root'];
    var projectDirectory = ClientUtility.dirname(ClientUtility.dirname(projectFilePath));
    var taskIndex = cookies['index'];
    var hostInfos;
    var rootTree;
    var parentTree;
    var selectedTree;
    // connect flag to server
    var isConnect = false;
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
        $(document).on('updateDisplay', function () {
            updateDisplay(taskIndex);
        });
    }
    /**
     * set select file event by browse to upload file selection
     */
    function setSelectFileEvent() {
        $(document).on('selectFile', function (eventObject, value) {
            if (value.isMultiple) {
                fileSelect.prop('multiple', 'multiple');
            }
            else {
                fileSelect.removeProp('multiple');
            }
            fileSelect.click();
            fileSelect.off('change');
            fileSelect.one('change', function (eventObject) {
                var target = eventObject.target;
                var files = target.files;
                value.callback(files);
                showProperty(selectedTree);
            });
        });
    }
    /**
     * set edit script file event to modify submit job script
     */
    function setEditScriptEvent() {
        $(document).on('editScript', function () {
            editDialog.show();
        });
    }
    /**
     * set click event to move to project manager page
     */
    function setClickEventForMoveToProjectManagePage() {
        rootWorkflow.click(function () {
            ClientUtility.moveWorkflowLink(projectFilePath);
        });
    }
    /**
     * set several events for yes no dialog to open script file
     */
    function setSaveDialogEventsForScriptEdit() {
        editDialog
            .onClickCancel()
            .onClickOK(function () {
            window.open('', 'editor');
            writeTreeJsonSocket.emit(projectDirectory, rootTree, function () {
                uploadFiles(function () {
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
        var fullpath = projectDirectory + "/" + selectedTree.getFullpath(config.submit_script);
        $('<form/>', { action: '/swf/editor.html', method: 'post', target: 'editor' })
            .append($('<input/>', { type: 'hidden', name: 'edit', value: fullpath }))
            .appendTo(document.body)
            .submit();
    }
    /**
     * set key up event for rename workflow name
     */
    function setKeyupEventForRenameWorkflowName() {
        workflowName.on('keyup', function (eventObject) {
            var name = workflowName.val().trim();
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
        workflowDesc.on('keyup', function (eventObject) {
            var description = workflowDesc.val().trim();
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
            .onClickOK(function () {
            writeTreeJsonSocket.emit(projectDirectory, rootTree, function () {
                uploadFiles(function () {
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
            .onClickOK(function () {
            readTreeJson();
            resetDialog.hide();
        });
    }
    /**
     * set click event for save workflow
     */
    function setClickEventForSaveWorkflow() {
        saveButton.click(function () {
            if (ClientUtility.isValidDirectoryName(parentTree.name)) {
                saveDialog.show();
            }
        });
    }
    /**
     * set click event for reset workflow
     */
    function setClickEventForResetWorkflow() {
        resetButton.click(function () {
            resetDialog.show();
        });
    }
    /**
     * read tree json file from server
     */
    function readTreeJson() {
        if (!isConnect) {
            isConnect = true;
            readTreeJsonSocket.onConnect(rootFilePath, function (treeJson) {
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
                            callback: function () {
                                createChildTree(JsonFileType.WorkFlow, parentTree, function (child) {
                                    hideProperty();
                                });
                            }
                        },
                        sep1: '---------',
                        task: {
                            name: 'Task',
                            callback: function () {
                                createChildTree(JsonFileType.Task, parentTree, function (child) {
                                    hideProperty();
                                });
                            }
                        },
                        sep2: '---------',
                        rtask: {
                            name: 'Remote Task',
                            callback: function () {
                                createChildTree(JsonFileType.RemoteTask, parentTree, function (child) {
                                    getHostList(function () {
                                        child.host = new SwfHost(hostInfos[0]);
                                    });
                                    hideProperty();
                                });
                            }
                        },
                        sep3: '---------',
                        job: {
                            name: 'Job',
                            callback: function () {
                                createChildTree(JsonFileType.Job, parentTree, function (child) {
                                    getHostList(function () {
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
                            callback: function () {
                                createChildTree(JsonFileType.Loop, parentTree, function (child) {
                                    hideProperty();
                                });
                            }
                        },
                        sep6: '---------',
                        if: {
                            name: 'If',
                            callback: function () {
                                createChildTree(JsonFileType.If, parentTree, function (ifChild) {
                                    createChildTree(JsonFileType.Condition, ifChild, function (ifGrandson) {
                                        createChildTree(JsonFileType.Else, parentTree, function (elseChild) {
                                            createChildTree(JsonFileType.Condition, elseChild, function (elseGrandson) {
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
                            callback: function () {
                                createChildTree(JsonFileType.Break, parentTree, function (child) {
                                    hideProperty();
                                });
                            },
                            disabled: function () {
                                return !ClientUtility.checkFileType(parentTree, JsonFileType.Loop);
                            }
                        },
                        sep8: '---------',
                        pstudy: {
                            name: 'Parameter Study',
                            callback: function () {
                                createChildTree(JsonFileType.PStudy, parentTree, function (child) {
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
     * @param object tree index string or SwfTree instance
     */
    function updateDisplay(object) {
        if (typeof object === 'string') {
            taskIndex = object;
        }
        else {
            taskIndex = object.getIndexString();
        }
        SvgNodePane.create(rootTree, taskIndex, 'tree_svg', function (tree) {
            jsonProperty.hide();
            selectedTree = null;
            updateDisplay(tree);
        });
        createRelationNode();
    }
    /**
     * create relation node
     */
    function createRelationNode() {
        var tree = SwfTree.getSwfTree(taskIndex);
        parentTree = tree;
        var filepath = getFullpath(tree);
        addressBar.val(filepath);
        workflowName.val(tree.name);
        workflowDesc.val(tree.description);
        SvgNodeUI.create(tree, selectedTree, 'node_svg', function (child) {
            if (child == null) {
                jsonProperty.hide();
                selectedTree = null;
                return;
            }
            selectedTree = child;
            showProperty(child);
        }, function (parent) {
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
    function showProperty(tree) {
        getHostList(function () {
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
    function createChildTree(fileType, parent, callback) {
        getTemplateJsonFileSocket.emit(fileType, function (json) {
            var child = parent.addChild(json, fileType);
            if (callback) {
                callback(child);
            }
        });
    }
    /**
     * get file status
     * @param filepath file path string
     */
    function getFileStat(filepath) {
        getFileStatSocket.emit(filepath, function (stat) {
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
    function getHostList(callback) {
        if (hostInfos == null) {
            getRemoteHostListSocket.emit(function (hosts) {
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
    function getFullpath(tree) {
        var filename = ClientUtility.getDefaultName(tree);
        var currentDirectory = tree.getCurrentDirectory();
        return ClientUtility.normalize(projectDirectory + "/" + currentDirectory + "/" + filename);
    }
    /**
     * upload files
     * @param callback function
     */
    function uploadFiles(callback) {
        var files = SwfTree.getUploadFiles(projectDirectory);
        var fileCount = files.length;
        var sendCount = 0;
        if (fileCount === 0) {
            callback();
            return;
        }
        fileUploadSocket.onEvent(function (isUpload, filename) {
            sendCount++;
            if (sendCount === fileCount) {
                fileUploadSocket.offEvent();
                callback();
            }
        });
        files.forEach(function (data) {
            fileUploadSocket.emit(data);
        });
    }
});
//# sourceMappingURL=workflowManager.js.map