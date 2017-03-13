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
     * move to workflow manager page
     */
    rootWorkflow.click(function () {
        ClientUtility.moveWorkflowLink(projectFilePath);
    });
    /**
     * task name changed event
     */
    workflowName.change(function () {
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
    workflowDesc.change(function () {
        parentTree.description = workflowDesc.val().trim();
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
                        callback: function () {
                            createChildTree(JsonFileType.WorkFlow);
                        }
                    },
                    sep1: '---------',
                    task: {
                        name: 'Task',
                        callback: function () {
                            createChildTree(JsonFileType.Task);
                        }
                    },
                    sep2: '---------',
                    rtask: {
                        name: 'RemoteTask',
                        callback: function () {
                            createChildTree(JsonFileType.RemoteTask);
                        }
                    },
                    sep3: '---------',
                    job: {
                        name: 'Job',
                        callback: function () {
                            createChildTree(JsonFileType.Job);
                        }
                    },
                    sep4: '---------',
                    sep5: '---------',
                    loop: {
                        name: 'Loop',
                        callback: function () {
                            createChildTree(JsonFileType.Loop);
                        }
                    },
                    sep6: '---------',
                    if: {
                        name: 'If',
                        callback: function () {
                            createChildTree(JsonFileType.If);
                        }
                    },
                    sep7: '---------',
                    break: {
                        name: 'Break',
                        callback: function () {
                            createChildTree(JsonFileType.Break);
                        },
                        disabled: function () {
                            return !ClientUtility.checkFileType(parentTree, JsonFileType.Loop);
                        }
                    },
                    sep8: '---------',
                    pstudy: {
                        name: 'PStudy',
                        callback: function () {
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
    function display(object) {
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
        if (hostInfos == null) {
            getRemoteHostListSocket.emit(function (hosts) {
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
    function createChildTree(fileType, tree) {
        if (tree == null) {
            tree = SwfTree.getSwfTree(taskIndex);
        }
        getTemplateJsonFileSocket.emit(fileType, function (json) {
            var rand = Math.floor(Date.now() / 100) % 100000;
            var dirname = json.type + "Dir" + ("00000" + rand).slice(-5);
            var child = tree.addChild(json, dirname, fileType);
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
        var loop = function () {
            var data = files.shift();
            if (!data) {
                callback();
                return;
            }
            fileUploadSocket.emit(data, function (isUpload) {
                loop();
            });
        };
        loop();
    }
});
//# sourceMappingURL=workflowManager.js.map