$(function () {
    // socket io
    var socket = io('/swf/project');
    var runProjectSocket = new RunProjectSocket(socket);
    var openProjectJsonSocket = new OpenProjectJsonSocket(socket);
    var getFileStatSocket = new GetFileStatSocket(socket);
    var sshConnectionSocket = new SshConnectionSocket(socket);
    var cleanProjectSocket = new CleanProjectSocket(socket);
    // dialog
    var passwordInputDialog = new InputTextDialog();
    // elements
    var run_button = $('#run_button');
    var run_menu = $('#run_menu');
    var stop_button = $('#stop_button');
    var stop_menu = $('#stop_menu');
    var clean_button = $('#clean_button');
    var clean_menu = $('#clean_menu');
    var pause_button = $('#pause_button');
    var pause_menu = $('#pause_menu');
    var addressBar = $('#address_bar');
    var projectTable = $('#project_table');
    var projectTableHead = $('#project_table_head');
    var projectTableBody = $('#project_table_body');
    var projectSvg = $('#project_tree_svg');
    var projectName = $('#project_name');
    var projectProgress = $('#project_progress');
    var projectBirth = $('#project_birthday');
    var projectUpdate = $('#project_update');
    /**
     * project instance
     */
    var swfProject;
    /**
     * monitoring timer
     */
    var timer;
    /**
     * connect flag to server
     */
    var isConnect = false;
    /**
     * cookie
     */
    var projectFilePath = ClientUtility.getCookies()['project'];
    /**
     * initialize
     */
    (function init() {
        if (projectFilePath == null) {
            throw new Error('illegal access');
        }
        getProjectJson();
        setClickEventForRunButton();
        setClickEventForStopButton();
        setClickEventForCleanButton();
        setClickEventForPauseButton();
        setTaskNameEvents();
    })();
    /**
     * set button click event to run project
     */
    function setClickEventForRunButton() {
        run_button.click(function () {
            inputPasssword(function (passInfo) {
                ClientUtility.deleteCookie('root');
                ClientUtility.deleteCookie('index');
                runProjectSocket.emit(projectFilePath, passInfo, function (isSucceed) {
                    if (isSucceed) {
                        startTimer();
                    }
                    else {
                        console.log('running project is failed');
                    }
                });
            });
        });
    }
    /**
     * set click event to stop project
     */
    function setClickEventForStopButton() {
        stop_button.click(function () {
            // TODO change function
            cleanProjectSocket.emit(projectFilePath, function (isSucceed) {
                stopTimer();
                openProjectJsonSocket.emit(projectFilePath);
            });
        });
    }
    /**
     * set click event to clean project
     */
    function setClickEventForCleanButton() {
        clean_button.click(function () {
            cleanProjectSocket.emit(projectFilePath, function (isSucceed) {
                stopTimer();
                openProjectJsonSocket.emit(projectFilePath);
            });
        });
    }
    /**
     * set click event to pause project
     */
    function setClickEventForPauseButton() {
        // TODO write function
    }
    /**
    * set task name events
    */
    function setTaskNameEvents() {
        $(document).on({
            click: function () {
                var id = $(this).parent().id();
                var target = SwfLog.getSwfLogInstance(id);
                var rootFilepath = swfProject.log.path + "/" + ClientUtility.getDefaultName(SwfType.WORKFLOW);
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
    }
    /**
     * get project json file
     */
    function getProjectJson() {
        if (!isConnect) {
            isConnect = true;
            openProjectJsonSocket.onConnect(projectFilePath, function (projectJson) {
                swfProject = new SwfProject(projectJson);
                addressBar.val(ClientUtility.normalize(projectFilePath));
                projectName.text(projectJson.name);
                projectSvg.empty();
                updateIcon();
                var tableDataHtml = createHtmlTable(swfProject.log);
                projectTableBody.html(tableDataHtml);
                var draw = SVG('project_tree_svg');
                drawWorkflowTree(draw, swfProject.log);
                draw.size((SwfLog.getMaxHierarchy() + 2) * 20, projectTable.height());
                if (swfProject.isRunning()) {
                    startTimer();
                }
                projectProgress.val(swfProject.getProgressRate());
                getFileStat();
            });
        }
        else {
            openProjectJsonSocket.emit(projectFilePath);
        }
    }
    /**
     * get project json file stat
     */
    function getFileStat() {
        var updateDate = function (stat) {
            projectUpdate.text(new Date(stat.mtime).toLocaleString());
            projectBirth.text(new Date(stat.birthtime).toLocaleString());
        };
        if (!isConnect) {
            isConnect = true;
            getFileStatSocket.onConnect(projectFilePath, function (stat) {
                updateDate(stat);
            });
        }
        else {
            getFileStatSocket.emit(projectFilePath, function (stat) {
                updateDate(stat);
            });
        }
    }
    /**
     * create html string of table
     * @param swfLog SwfLog instance
     * @return html string of table
     */
    function createHtmlTable(swfLog) {
        var html = [];
        html.push(createSingleLineHtml(swfLog));
        swfLog.children
            .sort(function (a, b) { return a.order > b.order ? 1 : -1; })
            .forEach(function (child) { return html.push(createHtmlTable(child)); });
        return html.join('');
    }
    /**
     * create html string of single line
     * @param swfLog SwfLog instance
     * @return html string of single line
     */
    function createSingleLineHtml(swfLog) {
        var attr;
        if (swfProject.isPlanning() && SwfType.isImplimentsWorkflow(swfLog)) {
            attr = 'class="project_name_not_task" style="cursor: pointer"';
        }
        else {
            attr = 'class="project_name_task" style="cursor: default"';
        }
        var start = swfLog.execution_start_date ? new Date(swfLog.execution_start_date).toLocaleString() : '----/--/-- --:--:--';
        var end = swfLog.execution_end_date ? new Date(swfLog.execution_end_date).toLocaleString() : '----/--/-- --:--:--';
        return "\n            <tr id=\"" + swfLog.getIndexString() + "\">\n                <td " + attr + ">" + swfLog.name + "</td>\n                <td>" + swfLog.state + "</td>\n                <td>" + start + "</td>\n                <td>" + end + "</td>\n                <td>" + swfLog.description + "</td>\n            </tr>";
    }
    /**
     * draw workflow hierarchy tree
     * @param draw drowing element
     * @param swfLog SwfLog instance
     */
    function drawWorkflowTree(draw, swfLog) {
        var group = draw.group();
        var element = $("#" + swfLog.getIndexString());
        var top = element.position().top;
        var height = element.height();
        var diameter = 14;
        var offset = projectTableHead.height() * 3 / 2 - top - diameter / 2 + 1;
        var x = 20 * (swfLog.getHierarchy() + 1);
        var y = top + height / 2 + offset;
        function drawCircle(swfLog, x, y) {
            var circle = draw.circle(diameter)
                .attr({
                'fill': ClientUtility.getStateColor(swfLog.state),
                'stroke': config.node_color[swfLog.type.toLocaleLowerCase()],
                'stroke-width': 2
            })
                .center(x, y);
            group.add(circle);
        }
        (function drawTree(swfLog, parentX, parentY) {
            var element = $("#" + swfLog.getIndexString());
            var top = element.position().top;
            var x = 20 * (swfLog.getHierarchy() + 1);
            var y = top + height / 2 + offset;
            swfLog.children.forEach(function (child) { return drawTree(child, x, y); });
            var vline = draw.line(parentX, parentY, parentX, y).attr({ stroke: 'white' });
            var hline = draw.line(parentX, y, x, y).attr({ stroke: 'white' });
            group.add(vline).add(hline);
            drawCircle(swfLog, x, y);
        })(swfLog, x, y);
        drawCircle(swfLog, x, y);
    }
    /**
     * input password process
     * @param callback The function to call when finish input password
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
                    passwordInputDialog.setBusy('Now Testing');
                    sshConnectionSocket.emit(host.name, text, function (isConnect) {
                        passwordInputDialog.clearBusy();
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
     * update icon
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
     * set ready icon
     */
    function setIconReady() {
        run_menu.displayBlock();
        stop_menu.displayNone();
        clean_menu.displayNone();
        stop_menu.displayNone();
        pause_menu.displayNone();
    }
    /**
     * set running icon
     */
    function setIconRunning() {
        run_menu.displayNone();
        stop_menu.displayNone();
        clean_menu.displayNone();
        stop_menu.displayBlock();
        pause_menu.displayBlock();
    }
    /**
     * set finish icon
     */
    function setIconFinish() {
        run_menu.displayNone();
        stop_menu.displayNone();
        clean_menu.displayBlock();
        stop_menu.displayNone();
        pause_menu.displayNone();
    }
    /**
     * start monitoring timer for project json
     */
    function startTimer() {
        if (timer != null) {
            return;
        }
        getProjectJson();
        console.log('start timer');
        timer = setInterval(function () {
            if (!swfProject.isRunning()) {
                stopTimer();
            }
            else {
                getProjectJson();
            }
        }, config.reload_project_ms);
    }
    /**
     * stop monitoring timer for project json
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