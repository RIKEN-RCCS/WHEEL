$(() => {
    // socket io
    const socket = io('/swf/project');
    const runProjectSocket = new RunProjectSocket(socket);
    const openProjectJsonSocket = new OpenProjectJsonSocket(socket);
    const getFileStatSocket = new GetFileStatSocket(socket);
    const sshConnectionSocket = new SshConnectionSocket(socket);
    const cleanProjectSocket = new CleanProjectSocket(socket);

    // dialog
    const passwordInputDialog = new InputTextDialog();

    // elements
    const run_button = $('#run_button');
    const run_menu = $('#run_menu');
    const stop_button = $('#stop_button');
    const stop_menu = $('#stop_menu');
    const clean_button = $('#clean_button');
    const clean_menu = $('#clean_menu');
    const pause_button = $('#pause_button');
    const pause_menu = $('#pause_menu');
    const addressBar = $('#address_bar');
    const projectTable = $('#project_table');
    const projectTableHead = $('#project_table_head');
    const projectTableBody = $('#project_table_body');
    const projectSvg = $('#project_tree_svg');
    const projectName = $('#project_name');
    const projectProgress = $('#project_progress');
    const projectBirth = $('#project_birthday');
    const projectUpdate = $('#project_update');

    /**
     * project instance
     */
    let swfProject: SwfProject;

    /**
     * monitoring timer
     */
    let timer: NodeJS.Timer;

    /**
     * connect flag to server
     */
    let isConnect: boolean = false;

    /**
     * cookie
     */
    const projectFilePath = ClientUtility.getCookies()['project'];

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
        run_button.click(() => {
            inputPasssword((passInfo: { [name: string]: string }) => {
                ClientUtility.deleteCookie('root');
                ClientUtility.deleteCookie('index');
                runProjectSocket.emit(projectFilePath, passInfo, (isSucceed: boolean) => {
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
        stop_button.click(() => {
            // TODO change function
            cleanProjectSocket.emit(projectFilePath, (isSucceed: boolean) => {
                stopTimer();
                openProjectJsonSocket.emit(projectFilePath);
            });
        });
    }

    /**
     * set click event to clean project
     */
    function setClickEventForCleanButton() {
        clean_button.click(() => {
            cleanProjectSocket.emit(projectFilePath, (isSucceed: boolean) => {
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
    }

    /**
     * get project json file
     */
    function getProjectJson() {
        if (!isConnect) {
            isConnect = true;
            openProjectJsonSocket.onConnect(projectFilePath, (projectJson: SwfProjectJson) => {
                swfProject = new SwfProject(projectJson);
                addressBar.val(ClientUtility.normalize(projectFilePath));
                projectName.text(projectJson.name);
                projectSvg.empty();

                updateIcon();

                const tableDataHtml = createHtmlTable(swfProject.log);
                projectTableBody.html(tableDataHtml);

                const draw = SVG('project_tree_svg');
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

        const updateDate = (stat: FileStat) => {
            projectUpdate.text(new Date(stat.mtime).toLocaleString());
            projectBirth.text(new Date(stat.birthtime).toLocaleString());
        };

        if (!isConnect) {
            isConnect = true;
            getFileStatSocket.onConnect(projectFilePath, (stat: FileStat) => {
                updateDate(stat);
            });
        }
        else {
            getFileStatSocket.emit(projectFilePath, (stat: FileStat) => {
                updateDate(stat);
            });
        }
    }

    /**
     * create html string of table
     * @param swfLog SwfLog instance
     * @return html string of table
     */
    function createHtmlTable(swfLog: SwfLog): string {
        const html: string[] = [];
        html.push(createSingleLineHtml(swfLog));
        swfLog.children
            .sort((a, b) => a.order > b.order ? 1 : -1)
            .forEach(child => html.push(createHtmlTable(child)));
        return html.join('');
    }

    /**
     * create html string of single line
     * @param swfLog SwfLog instance
     * @return html string of single line
     */
    function createSingleLineHtml(swfLog: SwfLog): string {
        let attr: string;
        if (swfProject.isPlanning() && ClientUtility.isImplimentsWorkflow(swfLog)) {
            attr = 'class="project_name_not_task" style="cursor: pointer"';
        }
        else {
            attr = 'class="project_name_task" style="cursor: default"';
        }
        const start = swfLog.execution_start_date ? new Date(swfLog.execution_start_date).toLocaleString() : '----/--/-- --:--:--';
        const end = swfLog.execution_end_date ? new Date(swfLog.execution_end_date).toLocaleString() : '----/--/-- --:--:--';
        return `
            <tr id="${swfLog.getIndexString()}">
                <td ${attr}>${swfLog.name}</td>
                <td>${swfLog.state}</td>
                <td>${start}</td>
                <td>${end}</td>
                <td>${swfLog.description}</td>
            </tr>`;
    }

    /**
     * draw workflow hierarchy tree
     * @param draw drowing element
     * @param swfLog SwfLog instance
     */
    function drawWorkflowTree(draw: svgjs.Doc, swfLog: SwfLog): void {

        const group = draw.group();
        const element = $(`#${swfLog.getIndexString()}`);
        const top: number = element.position().top;
        const height: number = element.height();
        const diameter = 14;
        const offset = projectTableHead.height() * 3 / 2 - top - diameter / 2 + 1;
        const x = 20 * (swfLog.getHierarchy() + 1);
        const y = top + height / 2 + offset;

        function drawCircle(swfLog: SwfLog, x: number, y: number) {
            const circle = draw.circle(diameter)
                .attr({
                    'fill': ClientUtility.getStateColor(swfLog.state),
                    'stroke': config.node_color[swfLog.type.toLocaleLowerCase()],
                    'stroke-width': 2
                })
                .center(x, y);
            group.add(circle);
        }

        (function drawTree(swfLog: SwfLog, parentX: number, parentY: number) {
            const element = $(`#${swfLog.getIndexString()}`);
            const top: number = element.position().top;
            const x = 20 * (swfLog.getHierarchy() + 1);
            const y = top + height / 2 + offset;
            swfLog.children.forEach(child => drawTree(child, x, y));

            const vline = draw.line(parentX, parentY, parentX, y).attr({ stroke: 'white' });
            const hline = draw.line(parentX, y, x, y).attr({ stroke: 'white' });
            group.add(vline).add(hline);
            drawCircle(swfLog, x, y);
        })(swfLog, x, y);

        drawCircle(swfLog, x, y);
    }

    /**
     * input password process
     * @param callback The function to call when finish input password
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
                    passwordInputDialog.setBusy('Now Testing');
                    sshConnectionSocket.emit(host.name, text, (isConnect: boolean) => {
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

            const label = host.privateKey ? 'passphrase:' : 'password:';
            passwordInputDialog.show(`Enter password [${host.name}:${host.username}@${host.host}]`, label);
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
        timer = setInterval(() => {
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