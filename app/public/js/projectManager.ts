$(() => {
    const socket = io('/swf/project');
    const runProjectSocket = new RunProjectSocket(socket);
    const openProjectJsonSocket = new OpenProjectJsonSocket(socket);
    const getFileStatSocket = new GetFileStatSocket(socket);
    const sshConnectionSocket = new SshConnectionSocket(socket);

    const passwordInputDialog = new InputTextDialog();

    const run_button = $('#run_button');
    const run_figcaption = $('#run_figcaption');
    const addressBar = $('#address_bar');
    // TODO TSURUTA workflow -> project
    const workflowTable = $('#workflow_table');
    const workflowTableBody = $('#workflow_table_body');
    const workflowSvg = $('#workflow_tree_svg');
    const workflowName = $('#workflow_name');
    const workflowProg = $('#workflow_progress');
    const workflowBirth = $('#workflow_birthday');
    const workflowUpdate = $('#workflow_update');

    let swfProjectJson: SwfProjectJson;
    let swfLog: SwfLog;

    /**
     *
     */
    const cookies = ClientUtility.getCookies();
    const projectFilePath = cookies['project'];

    /**
     * open .tree.json or open .wf.json and create .tree.json
     */
    openProjectJsonSocket.onConnect(projectFilePath, (projectJson: SwfProjectJson) => {
        swfProjectJson = projectJson;
        addressBar.val(ClientUtility.normalize(projectFilePath));
        workflowName.text(projectJson.name);
        workflowSvg.empty();

        if (swfProjectJson.state !== config.state.planning) {
            setIconStop();
        }

        swfLog = SwfLog.create(projectJson.log);
        const tableDataHtml = createChildWorkflowHtml(swfLog);
        workflowTableBody.html(tableDataHtml);

        const draw = SVG('workflow_tree_svg');
        drawWorkflowTree(draw, swfLog);
        draw.size((SwfLog.getMaxHierarchy() + 2) * 20, workflowTable.height());
    });

    /**
     * get workflow file stat
     */
    getFileStatSocket.onConnect(projectFilePath, (stat: FileStat) => {
        workflowUpdate.text(new Date(stat.mtime).toLocaleString());
        workflowBirth.text(new Date(stat.birthtime).toLocaleString());
    });

    /**
     * run workflow
     */
    run_button.click(() => {
        // state is planning
        if (swfProjectJson.state === config.state.planning) {
            inputPasssword((passInfo: { [name: string]: string }) => {
                setIconRun();
                runProjectSocket.emit(projectFilePath, passInfo, (isSucceed: boolean) => {
                    if (isSucceed) {
                        openProjectJsonSocket.emit(projectFilePath);
                    }
                    else {

                    }
                });
            });
        }
        // state is not planning
        else {

        }
    });

    /**
     * task name click event
     */
    $(document).on({
        click: function () {
            const id: string = $(this).parent().id();
            const target: SwfLog = SwfLog.getSwfLogInstance(id);
            // TODO convert to variable
            const rootFilepath = `${swfLog.path}/${ClientUtility.getDefaultName(JsonFileType.WorkFlow)}`;
            $(document).off('click').off('mouseover').off('mouseout');
            $('<form/>', { action: '/swf/workflow_manager.html', method: 'post' })
                .append($('<input/>', { type: 'hidden', name: 'root', value: rootFilepath }))
                .append($('<input/>', { type: 'hidden', name: 'index', value: id }))
                .appendTo(document.body)
                .submit();
        },
        mouseover: function () {
            $(this).textDecorateUnderline();
        },
        mouseout: function () {
            $(this).textDecorateNone();
        }
    }, '.workflow_name_not_task');

    /**
     *
     * @param swfLog
     */
    function createChildWorkflowHtml(swfLog: SwfLog): string {
        const html: string[] = [];
        html.push(createHtml4SwfItem(swfLog));
        swfLog.children.forEach(child => html.push(createChildWorkflowHtml(child)));
        return html.join('');
    }

    /**
     *
     * @param swfLog
     */
    function createHtml4SwfItem(swfLog: SwfLog): string {
        let attr: string;

        if (!ClientUtility.isImplimentsWorkflow(swfLog.type)) {
            attr = 'class="workflow_name_task" style="cursor: default"';
        }
        else {
            attr = 'class="workflow_name_not_task" style="cursor: pointer"';
        }
        const start = swfLog.execution_start_date ? new Date(swfLog.execution_start_date).toLocaleString() : '----/--/-- --:--:--';
        const end = swfLog.execution_end_date ? new Date(swfLog.execution_end_date).toLocaleString() : '----/--/-- --:--:--';
        return `
            <tr id="${swfLog.getIndexString()}">
                <td ${attr}>${swfLog.name}</td>
                <td>${swfLog.state}</td>
                <td></td>
                <td>${start}</td>
                <td>${end}</td>
                <td>${swfLog.description}</td>
            </tr>`;
    }

    /**
     * draw workflow hierarchy tree
     * @param draw: drowing element
     * @param swfLog: workflow json file
     * @param parentX: x position of parent circle
     * @param parentY: y position of parent circle
     * @return none
     */
    function drawWorkflowTree(draw: svgjs.Doc, swfLog: SwfLog, parentX?: number, parentY?: number): void {

        const element = $(`#${swfLog.getIndexString()}`);
        const top: number = element.position().top;
        const height: number = element.height();
        const diameter = 15;
        const x = 20 * (swfLog.getHierarchy() + 1);
        const y = top + height / 2;

        swfLog.children.forEach(child => drawWorkflowTree(draw, child, x, y));

        if (parentX != null && parentY != null) {
            draw.line(parentX, parentY, parentX, y)
                .attr({ stroke: 'white' });
            draw.line(parentX, y, x, y)
                .attr({ stroke: 'white' });
        }

        draw.circle(diameter)
            .attr({
                'fill': ClientUtility.getStateColor(swfLog.state),
                'stroke': config.node_color[swfLog.type.toLocaleLowerCase()],
                'stroke-width': 2
            })
            .center(x, y);
    }

    /**
     *
     * @param callback
     */
    function inputPasssword(callback: Function) {
        const hostList: SwfHostJson[] = SwfLog.getHostList();
        const passInfo: { [name: string]: string } = {};
        const inputPass = () => {
            const host = hostList.shift();
            if (!host) {
                callback(passInfo);
                return;
            }
            passwordInputDialog.onClickOK((inputTextElement: JQuery) => {
                const text = inputTextElement.val().trim();
                if (!text) {
                    inputTextElement.borderInvalid();
                }
                else {
                    inputTextElement.borderValid();
                    passwordInputDialog.onBusy('Now Testing');
                    sshConnectionSocket.emit(host.name, text, (isConnect: boolean) => {
                        passwordInputDialog.offBusy();
                        if (isConnect) {
                            passInfo[host.name] = text;
                            passwordInputDialog.hide();
                            inputPass();
                        }
                        else {
                            inputTextElement.borderInvalid();
                        }
                    });
                }
            });

            const label = host.privateKey ? 'passphrase:' : 'password:';
            passwordInputDialog.show(`Enter password [${host.name}:${host.username}@${host.host}]`, label);
        };
        inputPass();
    }

    /**
     *
     */
    function setIconStop() {
        run_button.attr('src', '/image/icon_stop.png');
        run_figcaption.text('STOP');
    }

    /**
     *
     */
    function setIconRun() {
        run_button.attr('src', '/image/icon_run.png');
        run_figcaption.text('RUN');
    }
});