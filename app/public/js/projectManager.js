$(function () {
    var socket = io('/swf/project');
    var runProjectSocket = new RunProjectSocket(socket);
    var openProjectJsonSocket = new OpenProjectJsonSocket(socket);
    var getFileStatSocket = new GetFileStatSocket(socket);
    var run_button = $('#run_button');
    var addressBar = $('#address_bar');
    // TODO TSURUTA workflow -> project
    var workflowTable = $('#workflow_table');
    var workflowTableBody = $('#workflow_table_body');
    var workflowSvg = $('#workflow_tree_svg');
    var workflowName = $('#workflow_name');
    var workflowProg = $('#workflow_progress');
    var workflowBirth = $('#workflow_birthday');
    var workflowUpdate = $('#workflow_update');
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
        addressBar.val(ClientUtility.normalize(projectFilePath));
        workflowName.text(projectJson.name);
        workflowSvg.html('');
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
        runProjectSocket.emit(projectFilePath, function (state) {
            console.log(state);
        });
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
    function createChildWorkflowHtml(logJson) {
        var html = [];
        html.push(createHtml4SwfItem(logJson));
        logJson.children.forEach(function (child) { return html.push(createChildWorkflowHtml(child)); });
        return html.join('');
    }
    /**
     *
     * @param logJson
     */
    function createHtml4SwfItem(logJson) {
        var attr;
        if (!ClientUtility.isImplimentsWorkflow(logJson.type)) {
            attr = 'class="workflow_name_task" style="cursor: default"';
        }
        else {
            attr = 'class="workflow_name_not_task" style="cursor: pointer"';
        }
        return "\n            <tr id=\"" + logJson.getIndexString() + "\">\n                <td " + attr + ">" + logJson.name + "</td>\n                <td>" + logJson.state + "</td>\n                <td></td>\n                <td></td>\n                <td></td>\n                <td>" + logJson.description + "</td>\n            </tr>";
    }
    /**
     * draw workflow hierarchy tree
     * @param draw: drowing element
     * @param json: workflow json file
     * @param parentX: x position of parent circle
     * @param parentY: y position of parent circle
     * @return none
     */
    function drawWorkflowTree(draw, logJson, parentX, parentY) {
        var element = $("#" + logJson.getIndexString());
        var top = element.position().top;
        var height = element.height();
        var diameter = 10;
        var x = 20 * (logJson.getHierarchy() + 1);
        var y = top + height / 2;
        logJson.children.forEach(function (child) { return drawWorkflowTree(draw, child, x, y); });
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
//# sourceMappingURL=projectManager.js.map