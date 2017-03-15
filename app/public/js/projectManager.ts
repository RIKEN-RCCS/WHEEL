$(() => {
    const socket = io('/swf/project');
    const runProjectSocket = new RunProjectSocket(socket);
    const openProjectJsonSocket = new OpenProjectJsonSocket(socket);
    const getFileStatSocket = new GetFileStatSocket(socket);
    const sshConnectionSocket = new SshConnectionSocket(socket);

    const passwordInputDialog = new InputTextDialog();

    const run_button = $('#run_button');
    const run_figcaption = $('#run_figcaption');
    const stop_button = $('#stop_button');
    const stop_menu = $('#stop_menu');
    const addressBar = $('#address_bar');
    const projectTable = $('#project_table');
    const projectTableBody = $('#project_table_body');
    const projectSvg = $('#project_tree_svg');
    const projectName = $('#project_name');
    const projectProgress = $('#project_progress');
    const projectBirth = $('#project_birthday');
    const projectUpdate = $('#project_update');

    let swfProject: SwfProject;
    let timer: NodeJS.Timer;

    /**
     *
     */
    const cookies = ClientUtility.getCookies();
    const projectFilePath = cookies['project'];

    /**
     *
     */
    openProjectJsonSocket.onConnect(projectFilePath, (projectJson: SwfProjectJson) => {
        swfProject = new SwfProject(projectJson);
        addressBar.val(ClientUtility.normalize(projectFilePath));
        projectName.text(projectJson.name);
        projectSvg.empty();

        updateIcon();

        const tableDataHtml = createChildWorkflowHtml(swfProject.log);
        projectTableBody.html(tableDataHtml);

        const draw = SVG('project_tree_svg');
        drawWorkflowTree(draw, swfProject.log);
        draw.size((SwfLog.getMaxHierarchy() + 2) * 20, projectTable.height());
    });

    /**
     * get project file stat
     */
    getFileStatSocket.onConnect(projectFilePath, (stat: FileStat) => {
        projectUpdate.text(new Date(stat.mtime).toLocaleString());
        projectBirth.text(new Date(stat.birthtime).toLocaleString());
    });

    /**
     * run project
     */
    run_button.click(() => {
        // state is planning
        if (swfProject.isPlanning()) {
            inputPasssword((passInfo: { [name: string]: string }) => {
                updateIcon();
                runProjectSocket.emit(projectFilePath, passInfo, (isSucceed: boolean) => {
                    if (isSucceed) {
                        startTimer();
                    }
                });
            });
        }
        // state is not completed or failed
        else if (!swfProject.isFinished()) {
            startTimer();
        }
    });

    /**
     *
     */
    stop_button.click(() => {
        if (!swfProject.isFinished()) {
            return;
        }
        updateIcon();
    });

    /**
     * task name click event
     */
    $(document).on({
        click: function () {
            const id: string = $(this).parent().id();
            const target: SwfLog = SwfLog.getSwfLogInstance(id);
            const rootFilepath = `${swfProject.log.path}/${ClientUtility.getDefaultName(JsonFileType.WorkFlow)}`;
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
            attr = 'class="project_name_task" style="cursor: default"';
        }
        else {
            attr = 'class="project_name_not_task" style="cursor: pointer"';
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
        timer = setInterval(() => {
            if (swfProject.isFinished()) {
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