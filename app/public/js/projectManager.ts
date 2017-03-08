$(() => {
    const socket = io('/swf/project');
    const runProjectSocket = new RunProjectSocket(socket);
    const openProjectJsonSocket = new OpenProjectJsonSocket(socket);
    const getFileStatSocket = new GetFileStatSocket(socket);

    const run_button = $('#run_button');
    const addressBar = $('#address_bar');
    // TODO TSURUTA workflow -> project
    const workflowTable = $('#workflow_table');
    const workflowTableBody = $('#workflow_table_body');
    const workflowSvg = $('#workflow_tree_svg');
    const workflowName = $('#workflow_name');
    const workflowProg = $('#workflow_progress');
    const workflowBirth = $('#workflow_birthday');
    const workflowUpdate = $('#workflow_update');
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
        addressBar.val(ClientUtility.normalize(projectFilePath));
        workflowName.text(projectJson.name);
        workflowSvg.html('');

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
        runProjectSocket.emit(projectFilePath, (state: string) => {
            console.log(state);
        });
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
     * @param logJson
     */
    function createChildWorkflowHtml(logJson: SwfLog): string {
        const html: string[] = [];
        html.push(createHtml4SwfItem(logJson));
        logJson.children.forEach(child => html.push(createChildWorkflowHtml(child)));
        return html.join('');
    }

    /**
     *
     * @param logJson
     */
    function createHtml4SwfItem(logJson: SwfLog): string {
        let attr: string;

        if (!ClientUtility.isImplimentsWorkflow(logJson.type)) {
            attr = 'class="workflow_name_task" style="cursor: default"';
        }
        else {
            attr = 'class="workflow_name_not_task" style="cursor: pointer"';
        }
        return `
            <tr id="${logJson.getIndexString()}">
                <td ${attr}>${logJson.name}</td>
                <td>${logJson.state}</td>
                <td></td>
                <td></td>
                <td></td>
                <td>${logJson.description}</td>
            </tr>`;
    }

    /**
     * draw workflow hierarchy tree
     * @param draw: drowing element
     * @param json: workflow json file
     * @param parentX: x position of parent circle
     * @param parentY: y position of parent circle
     * @return none
     */
    function drawWorkflowTree(draw: svgjs.Element, logJson: SwfLog, parentX?: number, parentY?: number): void {

        const element = $(`#${logJson.getIndexString()}`);
        const top: number = element.position().top;
        const height: number = element.height();
        const diameter = 10;
        const x = 20 * (logJson.getHierarchy() + 1);
        const y = top + height / 2;

        logJson.children.forEach(child => drawWorkflowTree(draw, child, x, y));

        if (parentX != null && parentY != null) {
            draw.line(parentX, parentY, parentX, y)
                .attr({ stroke: 'white' });
            draw.line(parentX, y, x, y)
                .attr({ stroke: 'white' });
        }

        draw.circle(diameter)
            .attr({ fill: ClientUtility.getStateColor(logJson.state), stroke: 'black' })
            .center(x, y);
    }
});