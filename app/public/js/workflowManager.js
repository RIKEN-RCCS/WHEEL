$(function () {
    var socket = io('/swf/workflow');
    var readTreeJsonSocket = new ReadTreeJsonSocket(socket);
    var writeTreeJsonSocket = new WriteTreeJsonSocket(socket);
    var getFileStatSocket = new GetFileStatSocket(socket);
    var getTemplateJsonFileSocket = new GetTemplateJsonFileSocket(socket);
    var getRemoteHostListSocket = new GetRemoteHostListSocket(socket);
    var jsonProperty = new JsonProperty();
    var resetDialog = new YesNoDialog('Are you sure you want to reset ?');
    var saveDialog = new YesNoDialog('Are you sure you want to save ?');
    var rootWorkflow = $('#root_workflow');
    var addressBar = $('#address_bar');
    var workflowName = $('#workflow_name');
    var workflowBirth = $('#workflow_birthday');
    var workflowUpdate = $('#workflow_update');
    var workflowDesc = $('#workflow_desc');
    var treeSvg = $('#workflow_tree_svg');
    var nodeSvg = $('#node_svg');
    var saveButton = $('#save_button');
    var resetButton = $('#reset_button');
    var cookies = ClientUtility.getCookies();
    var projectFilePath = cookies['project'];
    var projectDirectory = ClientUtility.dirname(ClientUtility.dirname(projectFilePath));
    var rootFilePath = cookies['root'];
    var taskIndex = cookies['index'];
    var rootTree;
    var parentTree;
    var childTree;
    var svgHeight = 0;
    var svgWidth = 0;
    /**
     *
     */
    $(document).on('updateProperty', function () {
        updateDisplay(taskIndex);
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
            jsonProperty.hide();
            childTree = null;
            updateDisplay(taskIndex);
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
            readTreeJsonSocket.emit(rootFilePath);
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
        updateDisplay(taskIndex);
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
                    }
                }
            }
        }
    });
    /**
     *
     * @param index
     */
    function updateDisplay(index) {
        svgHeight = 0;
        svgWidth = 0;
        taskIndex = index;
        treeSvg.html('');
        nodeSvg.html('');
        var tree = SVG('workflow_tree_svg');
        createIndexTree(tree, rootTree);
        tree.size(svgWidth + 5, svgHeight + 10);
    }
    /**
     *
     * @param taskName
     */
    function canUseName(taskName) {
        var tree = SwfTree.getSwfTree(taskIndex);
        if (!ClientUtility.isValidDirectoryName(taskName)) {
            return false;
        }
        else if (tree.isDirnameDuplicate(taskName)) {
            return false;
        }
        return true;
    }
    /**
     *
     * @param draw drowing element
     * @param tree tree json file
     */
    function createIndexTree(draw, tree) {
        drawTreeNode(draw, tree);
        tree.children.forEach(function (child) { return createIndexTree(draw, child); });
        if (taskIndex !== tree.getIndexString()) {
            return;
        }
        parentTree = tree;
        var filepath = getFullpath(tree);
        addressBar.val(filepath);
        workflowName.val(tree.name);
        workflowDesc.val(tree.description);
        getFileStat(filepath);
        var canvas = SVG('node_svg');
        canvas.size(4000, 4000);
        SvgNodeUI.create(canvas, tree, childTree, function (child) {
            if (child == null) {
                jsonProperty.hide();
                childTree = null;
                return;
            }
            childTree = child;
            showProperty(child);
        }, function (child) {
            if (child == null) {
                return;
            }
            if (ClientUtility.isImplimentsWorkflow(child.type)) {
                jsonProperty.hide();
                childTree = null;
                updateDisplay(child.getIndexString());
            }
        });
    }
    /**
     *
     * @param child
     */
    function showProperty(child) {
        var hostInfos;
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
     * @param draw
     * @param tree
     */
    function drawTreeNode(draw, tree) {
        var x = 10 * tree.getHierarchy() + 12;
        var y = 20 * tree.getAbsoluteIndex() + 15;
        var NORMAL_COLOR = 'white';
        var HIGHLIGHT_COLOR = 'orange';
        var color = taskIndex === tree.getIndexString() ? HIGHLIGHT_COLOR : NORMAL_COLOR;
        draw.polygon([[x - 5, y - 5], [x - 5, y + 5], [x + 2, y]])
            .attr({ fill: color, stroke: 'black' })
            .center(x, y);
        var text = draw
            .text(tree.name)
            .font({
            size: 12,
            leading: '1'
        })
            .fill(NORMAL_COLOR)
            .x(x + 10)
            .cy(y);
        svgHeight = Math.max(svgHeight, y);
        svgWidth = Math.max(svgWidth, text.bbox().width + text.x());
        if (ClientUtility.isImplimentsWorkflow(tree.type)) {
            text.style('cursor', 'pointer');
            text.on('mouseover', function () {
                text.attr({ 'text-decoration': 'underline' });
            });
            text.on('mouseout', function () {
                text.attr({ 'text-decoration': 'none' });
            });
            text.on('click', function () {
                jsonProperty.hide();
                childTree = null;
                updateDisplay(tree.getIndexString());
            });
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
        // const filepath: string = `./${name}/${ClientUtility.getDefaultName(fileType)}`;
        var dirname = "dir" + Date.now();
        getTemplateJsonFileSocket.emit(fileType, function (json) {
            var child = tree.addChild(json, dirname, fileType);
            // if (fileType === JsonFileType.If) {
            //     createChildTree(`condition`, JsonFileType.Condition, child);
            // }
            // else if (fileType === JsonFileType.Condition) {
            //     createChildTree(`else`, JsonFileType.Else);
            // }
            // else {
            jsonProperty.hide();
            childTree = null;
            updateDisplay(taskIndex);
            // }
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
});
//# sourceMappingURL=workflowManager.js.map