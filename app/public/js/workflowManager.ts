$(() => {
    const socket = io('/swf/workflow');
    const readTreeJsonSocket = new ReadTreeJsonSocket(socket);
    const writeTreeJsonSocket = new WriteTreeJsonSocket(socket);
    const getFileStatSocket = new GetFileStatSocket(socket);
    const getTemplateJsonFileSocket = new GetTemplateJsonFileSocket(socket);
    const getRemoteHostListSocket = new GetRemoteHostListSocket(socket);

    const jsonProperty = new JsonProperty();

    const resetDialog = new YesNoDialog('Are you sure you want to reset ?');
    const saveDialog = new YesNoDialog('Are you sure you want to save ?');

    const rootWorkflow = $('#root_workflow');
    const addressBar = $('#address_bar');
    const workflowName = $('#workflow_name');
    const workflowBirth = $('#workflow_birthday');
    const workflowUpdate = $('#workflow_update');
    const workflowDesc = $('#workflow_desc');

    const treeSvg = $('#workflow_tree_svg');
    const nodeSvg = $('#node_svg');

    const saveButton = $('#save_button');
    const resetButton = $('#reset_button');

    const cookies = ClientUtility.getCookies();
    const projectFilePath = cookies['project'];
    const projectDirectory = ClientUtility.dirname(ClientUtility.dirname(projectFilePath));
    const rootFilePath = cookies['root'];

    let taskIndex: string = cookies['index'];
    let rootTree: SwfTree;
    let parentTree: SwfTree;
    let childTree: SwfTree;
    let svgHeight = 0;
    let svgWidth = 0;

    /**
     *
     */
    $(document).on('updateProperty', () => {
        updateDisplay(taskIndex);
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
                readTreeJsonSocket.emit(rootFilePath);
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
                    }
                }
            }
        }
    });

    /**
     *
     * @param index
     */
    function updateDisplay(index: string): void {
        svgHeight = 0;
        svgWidth = 0;
        taskIndex = index;
        treeSvg.html('');
        nodeSvg.html('');
        const tree = SVG('workflow_tree_svg');
        createIndexTree(tree, rootTree);
        tree.size(svgWidth + 5, svgHeight + 10);
    }

    /**
     *
     * @param taskName
     */
    function canUseName(taskName: string) {
        const tree = SwfTree.getSwfTree(taskIndex);

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
    function createIndexTree(draw: svgjs.Doc, tree: SwfTree): void {
        drawTreeNode(draw, tree);
        tree.children.forEach(child => createIndexTree(draw, child));

        if (taskIndex !== tree.getIndexString()) {
            return;
        }

        parentTree = tree;
        const filepath = getFullpath(tree);
        addressBar.val(filepath);
        workflowName.val(tree.name);
        workflowDesc.val(tree.description);
        getFileStat(filepath);

        const canvas = SVG('node_svg');
        canvas.size(4000, 4000);

        SvgNodeUI.create(canvas, tree, childTree,
            (child: SwfTree) => {
                if (child == null) {
                    jsonProperty.hide();
                    childTree = null;
                    return;
                }
                childTree = child;
                showProperty(child);
            },
            (child: SwfTree) => {
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
    function showProperty(child: SwfTree) {
        let hostInfos: SwfHostJson[];
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
     * @param draw
     * @param tree
     */
    function drawTreeNode(draw: svgjs.Element, tree: SwfTree) {

        const x = 10 * tree.getHierarchy() + 12;
        const y = 20 * tree.getAbsoluteIndex() + 15;

        const NORMAL_COLOR = 'white';
        const HIGHLIGHT_COLOR = 'orange';
        const color: string = taskIndex === tree.getIndexString() ? HIGHLIGHT_COLOR : NORMAL_COLOR;

        draw.polygon([[x - 5, y - 5], [x - 5, y + 5], [x + 2, y]])
            .attr({ fill: color, stroke: 'black' })
            .center(x, y);

        const text = draw
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
            text.on('mouseover', () => {
                text.attr({ 'text-decoration': 'underline' })
            });
            text.on('mouseout', () => {
                text.attr({ 'text-decoration': 'none' })
            });
            text.on('click', () => {
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
    function createChildTree(fileType: JsonFileType, tree?: SwfTree) {
        if (tree == null) {
            tree = SwfTree.getSwfTree(taskIndex);
        }
        // const filepath: string = `./${name}/${ClientUtility.getDefaultName(fileType)}`;
        const dirname = `dir${Date.now()}`;
        getTemplateJsonFileSocket.emit(fileType, (json: SwfTreeJson) => {
            const child = tree.addChild(json, dirname, fileType);

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
});