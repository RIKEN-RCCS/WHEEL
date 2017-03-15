$(function () {
    var socket = io('/swf/project');
    var runProjectSocket = new RunProjectSocket(socket);
    var openProjectJsonSocket = new OpenProjectJsonSocket(socket);
    var getFileStatSocket = new GetFileStatSocket(socket);
    var sshConnectionSocket = new SshConnectionSocket(socket);
    var cleanProjectSocket = new CleanProjectSocket(socket);
    var passwordInputDialog = new InputTextDialog();
    var run_button = $('#run_button');
    var run_figcaption = $('#run_figcaption');
    var stop_button = $('#stop_button');
    var stop_menu = $('#stop_menu');
    var addressBar = $('#address_bar');
    var projectTable = $('#project_table');
    var projectTableBody = $('#project_table_body');
    var projectSvg = $('#project_tree_svg');
    var projectName = $('#project_name');
    var projectProgress = $('#project_progress');
    var projectBirth = $('#project_birthday');
    var projectUpdate = $('#project_update');
    var swfProject;
    var timer;
    /**
     *
     */
    var cookies = ClientUtility.getCookies();
    var projectFilePath = cookies['project'];
    /**
     *
     */
    openProjectJsonSocket.onConnect(projectFilePath, function (projectJson) {
        swfProject = new SwfProject(projectJson);
        addressBar.val(ClientUtility.normalize(projectFilePath));
        projectName.text(projectJson.name);
        projectSvg.empty();
        updateIcon();
        var tableDataHtml = createChildWorkflowHtml(swfProject.log);
        projectTableBody.html(tableDataHtml);
        var draw = SVG('project_tree_svg');
        drawWorkflowTree(draw, swfProject.log);
        draw.size((SwfLog.getMaxHierarchy() + 2) * 20, projectTable.height());
        if (swfProject.isRunning()) {
            startTimer();
        }
    });
    /**
     * get project file stat
     */
    getFileStatSocket.onConnect(projectFilePath, function (stat) {
        projectUpdate.text(new Date(stat.mtime).toLocaleString());
        projectBirth.text(new Date(stat.birthtime).toLocaleString());
    });
    /**
     * run project
     */
    run_button.click(function () {
        if (swfProject.isPlanning()) {
            inputPasssword(function (passInfo) {
                runProjectSocket.emit(projectFilePath, passInfo, function (isSucceed) {
                    if (isSucceed) {
                        startTimer();
                    }
                    else {
                        console.log('running project is failed');
                    }
                });
            });
        }
        else if (swfProject.isFinished()) {
            cleanProjectSocket.emit(projectFilePath, function (isSucceed) {
                stopTimer();
                openProjectJsonSocket.emit(projectFilePath);
            });
        }
        else {
        }
    });
    /**
     *
     */
    stop_button.click(function () {
        // if (!swfProject.isFinished()) {
        //     return;
        // }
        // updateIcon();
    });
    /**
     * task name click event
     */
    $(document).on({
        click: function () {
            var id = $(this).parent().id();
            var target = SwfLog.getSwfLogInstance(id);
            var rootFilepath = swfProject.log.path + "/" + ClientUtility.getDefaultName(JsonFileType.WorkFlow);
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
    }, '.project_name_not_task');
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
            attr = 'class="project_name_task" style="cursor: default"';
        }
        else {
            attr = 'class="project_name_not_task" style="cursor: pointer"';
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
    function updateIcon() {
        if (swfProject.isFinished()) {
            setIconFinish();
        }
        else if (swfProject.isPlanning()) {
            setIconReady();
        }
        else {
            setIconRunning();
        }
    }
    /**
     *
     */
    function setIconReady() {
        run_button.attr('src', '/image/icon_run.png');
        run_figcaption.text('RUN');
        stop_menu.css('display', 'none');
    }
    /**
     *
     */
    function setIconRunning() {
        run_button.attr('src', '/image/icon_pause.png');
        run_figcaption.text('PAUSE');
        stop_menu.css('display', 'block');
    }
    /**
     *
     */
    function setIconFinish() {
        run_button.attr('src', '/image/icon_clean.png');
        run_figcaption.text('CLEAN');
        stop_menu.css('display', 'none');
    }
    /**
     *
     */
    function startTimer() {
        if (timer != null) {
            return;
        }
        openProjectJsonSocket.emit(projectFilePath);
        console.log('start timer');
        timer = setInterval(function () {
            if (!swfProject.isRunning()) {
                stopTimer();
            }
            else {
                openProjectJsonSocket.emit(projectFilePath);
            }
        }, config.reload_project_ms);
    }
    /**
     *
     */
    function stopTimer() {
        if (timer != null) {
            console.log('stop timer');
            clearInterval(timer);
            timer = null;
        }
    }
});
//# sourceMappingURL=projectManager.js.map