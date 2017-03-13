$(function () {
    var socket = io('/swf/project');
    var runProjectSocket = new RunProjectSocket(socket);
    var openProjectJsonSocket = new OpenProjectJsonSocket(socket);
    var getFileStatSocket = new GetFileStatSocket(socket);
    var sshConnectionSocket = new SshConnectionSocket(socket);
    var passwordInputDialog = new InputTextDialog();
    var run_button = $('#run_button');
    var run_figcaption = $('#run_figcaption');
    var addressBar = $('#address_bar');
    // TODO TSURUTA workflow -> project
    var workflowTable = $('#workflow_table');
    var workflowTableBody = $('#workflow_table_body');
    var workflowSvg = $('#workflow_tree_svg');
    var workflowName = $('#workflow_name');
    var workflowProg = $('#workflow_progress');
    var workflowBirth = $('#workflow_birthday');
    var workflowUpdate = $('#workflow_update');
    var swfProjectJson;
    var swfLog;
    /**
     *
     */
    var cookies = ClientUtility.getCookies();
    var projectFilePath = cookies['project'];
    /**
     * open .tree.json or open .wf.json and create .tree.json
     */
    openProjectJsonSocket.onConnect(projectFilePath, function (projectJson) {
        swfProjectJson = projectJson;
        addressBar.val(ClientUtility.normalize(projectFilePath));
        workflowName.text(projectJson.name);
        workflowSvg.empty();
        if (swfProjectJson.state !== config.state.planning) {
            setIconStop();
        }
        swfLog = SwfLog.create(projectJson.log);
        var tableDataHtml = createChildWorkflowHtml(swfLog);
        workflowTableBody.html(tableDataHtml);
        var draw = SVG('workflow_tree_svg');
        drawWorkflowTree(draw, swfLog);
        draw.size((SwfLog.getMaxHierarchy() + 2) * 20, workflowTable.height());
    });
    /**
     * get workflow file stat
     */
    getFileStatSocket.onConnect(projectFilePath, function (stat) {
        workflowUpdate.text(new Date(stat.mtime).toLocaleString());
        workflowBirth.text(new Date(stat.birthtime).toLocaleString());
    });
    /**
     * run workflow
     */
    run_button.click(function () {
        // state is planning
        if (swfProjectJson.state === config.state.planning) {
            inputPasssword(function (passInfo) {
                setIconRun();
                runProjectSocket.emit(projectFilePath, passInfo, function (isSucceed) {
                    if (isSucceed) {
                        openProjectJsonSocket.emit(projectFilePath);
                    }
                    else {
                    }
                });
            });
        }
        else {
        }
    });
    /**
     * task name click event
     */
    $(document).on({
        click: function () {
            var id = $(this).parent().id();
            var target = SwfLog.getSwfLogInstance(id);
            // TODO convert to variable
            var rootFilepath = swfLog.path + "/" + ClientUtility.getDefaultName(JsonFileType.WorkFlow);
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
    function createChildWorkflowHtml(swfLog) {
        var html = [];
        html.push(createHtml4SwfItem(swfLog));
        swfLog.children.forEach(function (child) { return html.push(createChildWorkflowHtml(child)); });
        return html.join('');
    }
    /**
     *
     * @param swfLog
     */
    function createHtml4SwfItem(swfLog) {
        var attr;
        if (!ClientUtility.isImplimentsWorkflow(swfLog.type)) {
            attr = 'class="workflow_name_task" style="cursor: default"';
        }
        else {
            attr = 'class="workflow_name_not_task" style="cursor: pointer"';
        }
        var start = swfLog.execution_start_date ? new Date(swfLog.execution_start_date).toLocaleString() : '----/--/-- --:--:--';
        var end = swfLog.execution_end_date ? new Date(swfLog.execution_end_date).toLocaleString() : '----/--/-- --:--:--';
        return "\n            <tr id=\"" + swfLog.getIndexString() + "\">\n                <td " + attr + ">" + swfLog.name + "</td>\n                <td>" + swfLog.state + "</td>\n                <td></td>\n                <td>" + start + "</td>\n                <td>" + end + "</td>\n                <td>" + swfLog.description + "</td>\n            </tr>";
    }
    /**
     * draw workflow hierarchy tree
     * @param draw: drowing element
     * @param swfLog: workflow json file
     * @param parentX: x position of parent circle
     * @param parentY: y position of parent circle
     * @return none
     */
    function drawWorkflowTree(draw, swfLog, parentX, parentY) {
        var element = $("#" + swfLog.getIndexString());
        var top = element.position().top;
        var height = element.height();
        var diameter = 15;
        var x = 20 * (swfLog.getHierarchy() + 1);
        var y = top + height / 2;
        swfLog.children.forEach(function (child) { return drawWorkflowTree(draw, child, x, y); });
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
    function inputPasssword(callback) {
        var hostList = SwfLog.getHostList();
        var passInfo = {};
        var inputPass = function () {
            var host = hostList.shift();
            if (!host) {
                callback(passInfo);
                return;
            }
            passwordInputDialog.onClickOK(function (inputTextElement) {
                var text = inputTextElement.val().trim();
                if (!text) {
                    inputTextElement.borderInvalid();
                }
                else {
                    inputTextElement.borderValid();
                    passwordInputDialog.onBusy('Now Testing');
                    sshConnectionSocket.emit(host.name, text, function (isConnect) {
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
            var label = host.privateKey ? 'passphrase:' : 'password:';
            passwordInputDialog.show("Enter password [" + host.name + ":" + host.username + "@" + host.host + "]", label);
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
//# sourceMappingURL=projectManager.js.map