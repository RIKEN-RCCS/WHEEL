$(function () {
    var socket = io('/swf/workflow');
    var readTreeJsonSocket = new ReadTreeJsonSocket(socket);
    var writeTreeJsonSocket = new WriteTreeJsonSocket(socket);
    var getFileStatSocket = new GetFileStatSocket(socket);
    var getTemplateJsonFileSocket = new GetTemplateJsonFileSocket(socket);
    var getRemoteHostListSocket = new GetRemoteHostListSocket(socket);
    var fileUploadSocket = new UploadFileSocket(socket);
    var jsonProperty = new JsonProperty();
    var resetDialog = new YesNoDialog('Are you sure you want to reset ?');
    var saveDialog = new YesNoDialog('Are you sure you want to save ?');
    var editDialog = new YesNoDialog('Are you sure you want to save for editing script ?');
    var rootWorkflow = $('#root_workflow');
    var addressBar = $('#address_bar');
    var workflowName = $('#workflow_name');
    var workflowBirth = $('#workflow_birthday');
    var workflowUpdate = $('#workflow_update');
    var workflowDesc = $('#workflow_desc');
    var saveButton = $('#save_button');
    var resetButton = $('#reset_button');
    var fileSelect = $('#file_select');
    var cookies = ClientUtility.getCookies();
    var projectFilePath = cookies['project'];
    var projectDirectory = ClientUtility.dirname(ClientUtility.dirname(projectFilePath));
    var rootFilePath = cookies['root'];
    var taskIndex = cookies['index'];
    var hostInfos;
    var rootTree;
    var parentTree;
    var childTree;
    /**
     *
     */
    $(document).on('updateDisplay', function () {
        display(taskIndex);
    });
    /**
     *
     */
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
            showProperty(childTree);
        });
    });
    /**
     *
     */
    $(document).on('editFile', function () {
        editDialog.show();
    });
    /**
     * move to workflow manager page
     */
    rootWorkflow.click(function () {
        ClientUtility.moveWorkflowLink(projectFilePath);
    });
    /**
     *
     */
    editDialog
        .onClickCancel()
        .onClickOK(function () {
        window.open('', 'editor');
        writeTreeJsonSocket.emit(projectDirectory, rootTree, function () {
            uploadFiles(function () {
                readTreeJsonSocket.emit(rootFilePath);
                var fullpath = projectDirectory + "/" + childTree.getFullpath(config.submit_script);
                $('<form/>', { action: '/swf/editor.html', method: 'post', target: 'editor' })
                    .append($('<input/>', { type: 'hidden', name: 'edit', value: fullpath }))
                    .appendTo(document.body)
                    .submit();
            });
        });
    });
    /**
     * task name changed event
     */
    workflowName.on('keyup', function (eventObject) {
        if (eventObject.which === 0x0D) {
            if (parentTree.name = workflowName.val().trim()) {
                display(taskIndex);
            }
            else {
                workflowName.borderInvalid();
            }
        }
    });
    /**
     * task description changed event
     */
    workflowDesc.on('keyup', function (eventObject) {
        if (eventObject.which === 0x0D) {
            parentTree.description = workflowDesc.val().trim();
        }
    });
    /**
     * reset dialog
     */
    resetDialog
        .onClickCancel()
        .onClickOK(function () {
        readTreeJsonSocket.emit(rootFilePath);
        resetDialog.hide();
    });
    /**
     * save dialog
     */
    saveDialog
        .onClickCancel()
        .onClickOK(function () {
        writeTreeJsonSocket.emit(projectDirectory, rootTree, function () {
            uploadFiles(function () {
                readTreeJsonSocket.emit(rootFilePath);
            });
        });
    });
    /**
     * save button click event
     */
    saveButton.click(function () {
        if (ClientUtility.isValidDirectoryName(parentTree.name)) {
            saveDialog.show();
        }
    });
    /**
     * reset button click event
     */
    resetButton.click(function () {
        resetDialog.show();
    });
    /**
     * open .tree.json or open .wf.json and create .tree.json
     */
    readTreeJsonSocket.onConnect(rootFilePath, function (treeJson) {
        rootTree = SwfTree.create(treeJson);
        hideProperty();
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
                        name: 'RemoteTask',
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
                        name: 'PStudy',
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
    /**
     *
     * @param object
     */
    function display(object) {
        if (typeof object === 'string') {
            taskIndex = object;
        }
        else {
            taskIndex = object.getIndexString();
        }
        SvgNodePane.create(rootTree, taskIndex, 'tree_svg', function (tree) {
            jsonProperty.hide();
            childTree = null;
            display(tree);
        });
        createNode();
    }
    /**
     *
     */
    function createNode() {
        var tree = SwfTree.getSwfTree(taskIndex);
        parentTree = tree;
        var filepath = getFullpath(tree);
        addressBar.val(filepath);
        workflowName.val(tree.name);
        workflowDesc.val(tree.description);
        getFileStat(filepath);
        SvgNodeUI.create(tree, childTree, 'node_svg', function (child) {
            if (child == null) {
                jsonProperty.hide();
                childTree = null;
                return;
            }
            childTree = child;
            showProperty(child);
        }, function (parent) {
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
    function showProperty(child) {
        getHostList(function () {
            jsonProperty.show(child, hostInfos);
        });
    }
    /**
     *
     */
    function hideProperty() {
        jsonProperty.hide();
        childTree = null;
        display(taskIndex);
    }
    /**
     *
     * @param fileType
     * @param tree
     * @param callback
     */
    function createChildTree(fileType, tree, callback) {
        getTemplateJsonFileSocket.emit(fileType, function (json) {
            var child = tree.addChild(json, fileType);
            callback(child);
        });
    }
    /**
     *
     * @param filepath
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
     *
     * @param callback
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
     *
     * @param tree
     */
    function getFullpath(tree) {
        var filename = ClientUtility.getDefaultName(tree);
        var currentDirectory = tree.getCurrentDirectory();
        return ClientUtility.normalize(projectDirectory + "/" + currentDirectory + "/" + filename);
    }
    /**
     *
     * @param callback
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