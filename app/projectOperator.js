"use strict";
//inport = OpenLogJsonEvent;
var fs = require("fs");
var path = require("path");
var ssh2 = require("ssh2");
var child_process = require("child_process");
var logger = require("./logger");
var serverUtility = require("./serverUtility");
var SwfState = {
    PLANNING: 'Planning',
    RUNNING: 'Running',
    RERUNNING: 'ReRunning',
    WAITING: 'Waiting',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
};
var SwfType = {
    TASK: 'Task',
    WORKFLOW: 'Workflow',
    REMOTETASK: 'RemoteTask',
    JOB: 'Job',
    LOOP: 'Loop',
    IF: 'If',
    ELSE: 'Else',
    BREAK: 'Break',
    PSTADY: 'PStudy'
};
var SwfScriptType = {
    BASH: 'Bash',
    LUA: 'Lua',
    BATCH: 'Batch'
};
var SwfJobScheduler = {
    TCS: 'TCS',
    TORQUE: 'TORQUE'
};
/**
 * operator of SWF project
 */
var ProjectOperator = (function () {
    function ProjectOperator(path_project) {
        this.projectJson = serverUtility.createProjectJson(path_project);
        var dir_project = path.dirname(path_project);
        var path_workflow = path.resolve(dir_project, this.projectJson.path_workflow);
        var treeJson = serverUtility.createTreeJson(path_workflow);
        this.tree = ProjectOperator.createTaskTree(treeJson);
        ProjectOperator.setPathAbsolute(this.tree, this.projectJson.log);
    }
    ProjectOperator.prototype.run = function (host_passSet) {
        ProjectOperator.setPassToHost(this.tree, host_passSet);
        TaskManager.cleanUp(this.tree);
        this.projectJson.state = SwfState.RUNNING;
        try {
            logger.info("Run Project : " + this.projectJson.name);
            TaskManager.run(this.tree);
        }
        catch (err) {
            logger.error('Catch exception.');
            logger.error(err);
        }
    };
    ProjectOperator.prototype.clean = function () {
        TaskManager.cleanUp(this.tree);
    };
    /**
     * set absolute path of directory of the task
     */
    ProjectOperator.setPathAbsolute = function (tree, logJson) {
        tree.path = logJson.path;
        if (tree.children.length != logJson.children.length) {
            logger.error('mismatch children workflow and log.');
            return;
        }
        for (var i = 0; i < tree.children.length; i++) {
            this.setPathAbsolute(tree.children[i], logJson.children[i]);
        }
    };
    /**
     * set parent
     */
    ProjectOperator.createTaskTree = function (treeJson, parent) {
        if (parent === void 0) { parent = null; }
        var tree = treeJson;
        tree.parent = parent;
        for (var i = 0; i < treeJson.children.length; i++) {
            this.createTaskTree(treeJson.children[i], tree);
        }
        return tree;
    };
    ProjectOperator.setPassToHost = function (tree, host_passSet) {
        if (tree.type == SwfType.REMOTETASK || tree.type == SwfType.JOB) {
            var remoteTask = tree;
            if (host_passSet.hasOwnProperty(remoteTask.host.name)) {
                remoteTask.host.pass = host_passSet[remoteTask.host.name];
            }
        }
        for (var i = 0; i < tree.children.length; i++) {
            this.setPassToHost(tree.children[i], host_passSet);
        }
        return;
    };
    return ProjectOperator;
}());
/**
 * Task Manager
 */
var TaskManager = (function () {
    function TaskManager() {
    }
    TaskManager.run = function (tree) {
        if (tree == null) {
            // finish all or error
            logger.info('Finish Project');
            return;
        }
        TaskManager.writeLogRunning(tree);
        switch (tree.type) {
            case SwfType.WORKFLOW:
                TaskOperator.runWorkflow(tree);
                break;
            case SwfType.TASK:
                TaskOperator.runTask(tree);
                break;
            case SwfType.REMOTETASK:
                TaskOperator.runRemoteTask(tree);
                break;
            case SwfType.JOB:
                TaskOperator.runJob(tree);
                break;
            case SwfType.LOOP:
                TaskOperator.runLoop(tree);
                break;
            case SwfType.IF:
                // TODO make special
                TaskOperator.runIf(tree);
                break;
            case SwfType.ELSE:
                // TODO make special
                TaskOperator.runIf(tree);
                break;
            case SwfType.BREAK:
                // TODO make special
                TaskOperator.runTask(tree);
                break;
            case SwfType.PSTADY:
                // TODO make special
                TaskOperator.runPStudy(tree);
                break;
        }
    };
    TaskManager.completed = function (tree) {
        TaskManager.writeLogCompleted(tree);
        // run parent
        TaskManager.run(tree.parent);
    };
    TaskManager.failed = function (tree) {
        if (tree == null) {
            // finish all or error
            logger.info('Finish Project');
            return;
        }
        TaskManager.writeLogFailed(tree);
        TaskManager.failed(tree.parent);
    };
    TaskManager.failedCondition = function (tree) {
        if (tree == null) {
            logger.info('task is null');
            return;
        }
        TaskManager.writeLogFailed(tree);
        TaskManager.writeLogCompleted(tree.parent);
        // run parent
        TaskManager.run(tree.parent.parent);
    };
    TaskManager.cleanUp = function (tree) {
        var path_logFile = path.resolve(tree.path, TaskManager.name_logFile);
        var path_index = path.resolve(tree.path, TaskManager.name_indexFile);
        if (fs.existsSync(path_logFile)) {
            fs.unlinkSync(path_logFile);
        }
        if (fs.existsSync(path_index)) {
            fs.unlinkSync(path_index);
        }
        for (var i = 0; i < tree.children.length; i++) {
            TaskManager.cleanUp(tree.children[i]);
        }
        return;
    };
    TaskManager.writeLogRunning = function (tree) {
        if (TaskManager.isRun(tree)) {
            return;
        }
        logger.info("Run " + tree.type + " : " + tree.name);
        var dir_task = tree.path;
        var path_logFile = path.resolve(dir_task, TaskManager.name_logFile);
        var logJson = {
            name: tree.name,
            description: tree.description,
            state: SwfState.RUNNING,
            path: tree.path,
            type: tree.type,
            execution_start_date: new Date().toLocaleString(),
            execution_end_date: '',
            children: []
        };
        fs.writeFileSync(path_logFile, JSON.stringify(logJson, null, '\t'));
    };
    TaskManager.writeLogCompleted = function (tree) {
        var dir_task = tree.path;
        var path_logFile = path.resolve(dir_task, TaskManager.name_logFile);
        var data = fs.readFileSync(path_logFile);
        var logJson = JSON.parse(data.toString());
        logger.info("Completed " + tree.type + " : " + tree.name);
        logJson.execution_end_date = new Date().toLocaleString();
        logJson.state = SwfState.COMPLETED;
        fs.writeFileSync(path_logFile, JSON.stringify(logJson, null, '\t'));
    };
    TaskManager.writeLogFailed = function (tree) {
        logger.error("Failed " + tree.type + " : " + tree.name);
        logger.error("path : " + tree.path);
        var dir_task = tree.path;
        var path_logFile = path.resolve(dir_task, TaskManager.name_logFile);
        var data = fs.readFileSync(path_logFile);
        var logJson = JSON.parse(data.toString());
        logJson.execution_end_date = new Date().toLocaleString();
        logJson.state = SwfState.FAILED;
        fs.writeFileSync(path_logFile, JSON.stringify(logJson, null, '\t'));
    };
    TaskManager.isRun = function (tree) {
        var path_logFile = path.resolve(tree.path, TaskManager.name_logFile);
        return fs.existsSync(path_logFile);
    };
    TaskManager.isCompleted = function (tree) {
        if (!TaskManager.isRun(tree)) {
            return false;
        }
        var path_logFile = path.resolve(tree.path, TaskManager.name_logFile);
        var data = fs.readFileSync(path_logFile);
        var logJson = JSON.parse(data.toString());
        var isCompleted = (logJson.state == SwfState.COMPLETED);
        return isCompleted;
    };
    TaskManager.isFailed = function (tree) {
        if (!TaskManager.isRun(tree)) {
            return false;
        }
        var path_logFile = path.resolve(tree.path, TaskManager.name_logFile);
        var data = fs.readFileSync(path_logFile);
        var logJson = JSON.parse(data.toString());
        var isCompleted = (logJson.state == SwfState.FAILED);
        return isCompleted;
    };
    TaskManager.getIndex = function (tree) {
        var path_index = path.resolve(tree.path, TaskManager.name_indexFile);
        if (!fs.existsSync(path_index)) {
            return NaN;
        }
        var data = fs.readFileSync(path_index);
        var json = JSON.parse(data.toString());
        return json.index;
    };
    TaskManager.setIndex = function (tree, index) {
        var path_index = path.resolve(tree.path, TaskManager.name_indexFile);
        if (fs.existsSync(path_index)) {
            fs.unlinkSync(path_index);
        }
        var json = { index: index };
        fs.writeFileSync(path_index, JSON.stringify(json, null, '\t'));
    };
    return TaskManager;
}());
TaskManager.name_logFile = 'swf.log';
TaskManager.name_indexFile = 'loop.idx.json';
/**
 * Task Operator
 */
var TaskOperator = (function () {
    function TaskOperator() {
    }
    TaskOperator.runWorkflow = function (tree) {
        var workflow = tree;
        // check finish all children
        var isCompletedList = new Array(tree.children.length);
        var isCompletedAll = true;
        for (var i = 0; i < isCompletedList.length; i++) {
            isCompletedList[i] = TaskManager.isCompleted(tree.children[i]);
            isCompletedAll = isCompletedAll && isCompletedList[i];
        }
        if (isCompletedAll) {
            // TODO check whether success
            // unlink file relation
            for (var i = 0; i < workflow.file_relations.length; i++) {
                var relation = workflow.file_relations[i];
                var path_dst = path.resolve(workflow.path, relation.path_input_file);
                TaskOperator.unlink(path_dst);
            }
            TaskManager.completed(tree);
            return;
        }
        for (var index_task = 0; index_task < tree.children.length; index_task++) {
            var child = tree.children[index_task];
            if (TaskManager.isRun(child)) {
                continue;
            }
            var isFinishPreTask = true;
            // check relation
            for (var i = 0; i < workflow.relations.length; i++) {
                var relation = workflow.relations[i];
                if (relation.index_after_task == index_task) {
                    isFinishPreTask = isFinishPreTask && isCompletedList[relation.index_before_task];
                }
            }
            for (var i = 0; i < workflow.file_relations.length; i++) {
                var relation = workflow.file_relations[i];
                if (relation.index_after_task == index_task) {
                    isFinishPreTask = isFinishPreTask && isCompletedList[relation.index_before_task];
                }
            }
            if (!isFinishPreTask) {
                continue;
            }
            // link file relation
            for (var i = 0; i < workflow.file_relations.length; i++) {
                var relation = workflow.file_relations[i];
                if (relation.index_after_task != index_task) {
                    continue;
                }
                var path_src = path.resolve(workflow.path, relation.path_output_file);
                var path_dst = path.resolve(workflow.path, relation.path_input_file);
                TaskOperator.link(path_src, path_dst);
            }
            TaskManager.run(child);
        }
    };
    TaskOperator.runTask = function (tree) {
        var task = tree;
        if (!fs.existsSync(path.join(task.path, task.script.path))) {
            logger.error('Script file is not found');
            failed();
            return;
        }
        var command;
        if (serverUtility.isLinux()) {
            // TODO test Linux
            if (task.script.type == SwfScriptType.BASH || path.extname(task.script.path) == '.sh') {
                command = "sh " + task.script.path + ";\n";
            }
            else if (task.script.type == SwfScriptType.LUA || path.extname(task.script.path) == '.lua') {
                command = "lua " + task.script.path + ";\n";
            }
        }
        else {
            // Windows
            if (task.script.type == SwfScriptType.BATCH || path.extname(task.script.path) == '.bat') {
                command = task.script.path;
            }
            else if (task.script.type == SwfScriptType.LUA || path.extname(task.script.path) == '.lua') {
                command = path.resolve('lua.exe') + " " + task.script.path + ";\n";
            }
            else {
                command = task.script.path;
            }
        }
        TaskOperator.exec(command, task.path, completed, failed);
        function completed() {
            var isCompleted = true;
            for (var i = 0; i < task.output_files.length; i++) {
                var file_path = task.output_files[i].path;
                isCompleted = isCompleted && fs.existsSync(path.join(task.path, file_path));
            }
            if (isCompleted) {
                TaskManager.completed(tree);
            }
            else {
                TaskManager.failed(tree);
            }
        }
        function failed() {
            TaskManager.failed(tree);
        }
    };
    TaskOperator.runRemoteTask = function (tree) {
        var remoteTask = tree;
        var client = new ssh2.Client();
        if (!fs.existsSync(path.join(remoteTask.path, remoteTask.script.path))) {
            logger.error('Script file is not found');
            failed();
            return;
        }
        var config = {
            host: remoteTask.host.host,
            port: 22,
            username: remoteTask.host.username,
        };
        // TODO get password from dialog
        if (remoteTask.host.privateKey) {
            config.privateKey = fs.readFileSync(remoteTask.host.privateKey);
            config.passphrase = remoteTask.host.pass;
        }
        else {
            config.password = remoteTask.host.pass;
        }
        var dir_remote = TaskOperator.getDirRemote(remoteTask);
        client.connect(config);
        client.on('ready', readyCallback);
        function readyCallback() {
            TaskOperator.setUpRemote(remoteTask, client, dir_remote, runScript, failed);
        }
        function runScript() {
            var command;
            if (remoteTask.script.type == SwfScriptType.BASH || path.extname(remoteTask.script.path) == '.sh') {
                command = "sh " + remoteTask.script.path + "\n";
            }
            else if (remoteTask.script.type == SwfScriptType.LUA || path.extname(remoteTask.script.path) == '.lua') {
                command = "lua " + remoteTask.script.path + "\n";
            }
            else {
                // default
                command += "./" + remoteTask.script.path + "\n";
            }
            TaskOperator.execRemote(client, command, dir_remote, execCallback, failed);
            function execCallback() {
                // TODO check whether success
                TaskOperator.cleanUpRemote(remoteTask, client, dir_remote, completed, failed);
            }
        }
        function completed() {
            TaskManager.completed(tree);
            client.end();
        }
        function failed() {
            TaskManager.failed(tree);
            client.end();
        }
    };
    TaskOperator.runJob = function (tree) {
        var job = tree;
        var client = new ssh2.Client();
        var t = path.join(job.path, job.script.path);
        if (!fs.existsSync(path.join(job.path, job.script.path))) {
            logger.error('Script file is not found');
            failed();
            return;
        }
        var config = {
            host: job.host.host,
            port: 22,
            username: job.host.username,
        };
        // TODO get password from dialog
        if (job.host.privateKey) {
            config.privateKey = fs.readFileSync(job.host.privateKey);
            config.passphrase = job.host.pass;
        }
        else {
            config.password = job.host.pass;
        }
        var dir_remote = TaskOperator.getDirRemote(job);
        client.connect(config);
        client.on('ready', readyCallback);
        function readyCallback() {
            TaskOperator.setUpRemote(job, client, dir_remote, runScript, failed);
        }
        function runScript() {
            var command = '';
            command += "cd " + dir_remote + "\n";
            if (job.host.job_scheduler == SwfJobScheduler.TCS) {
                command += "sh " + job.script.path + "\n";
            }
            else if (job.host.job_scheduler == SwfJobScheduler.TORQUE) {
                command += "sh " + job.script.path + "\n";
            }
            else {
                // default TCS
                command += "sh " + job.script.path + "\n";
            }
            client.exec(command, execCallback);
            function execCallback(err, channel) {
                if (err) {
                    TaskManager.failed(tree);
                    logger.error("error : " + err);
                    logger.error("working directory : " + job.host.path);
                    logger.error("command : " + command);
                    return;
                }
                channel.on('close', onCloseCallback);
                channel.on('data', onOutCallback);
                channel.stderr.on('data', onErrCallback);
                var jobId = '';
                function onCloseCallback(exitCode, signalName) {
                    // TODO check whether success
                    //logger.info(`Stream :: close :: code: ${exitCode}, signal: ${signalName}`);
                    var intervalId = setInterval(checkFinish, 2000);
                    function checkFinish() {
                        // check job scheduler
                        if (jobId == '') {
                            return;
                        }
                        var command = '';
                        if (job.host.job_scheduler == SwfJobScheduler.TCS) {
                            command += "pjstat " + jobId + " -s\n";
                        }
                        else if (job.host.job_scheduler == SwfJobScheduler.TORQUE) {
                            command += "qstat -l " + jobId + " -x\n";
                        }
                        else {
                            // default TCS
                            command += "pjsub " + job.script.path + "\n";
                        }
                        client.exec(command, getStateCallback);
                        function getStateCallback(err, channel) {
                            if (err) {
                                TaskManager.failed(tree);
                                logger.error("error : " + err);
                                logger.error("working directory : " + job.host.path);
                                logger.error("command : " + command);
                                return;
                            }
                            channel.on('close', onCloseStateCallback);
                            channel.on('data', onOutStateCallback);
                            channel.stderr.on('data', onErrCallback);
                        }
                        function onCloseStateCallback(exitCode, signalName) {
                        }
                        function onOutStateCallback(data) {
                            var stdout = String(data);
                            // check state of job
                            var isFinish = false;
                            if (job.host.job_scheduler == SwfJobScheduler.TCS) {
                                var regExp = /STATE(\s?)*:(\s?)*EXT/i;
                                isFinish = (regExp.test(stdout));
                            }
                            else if (job.host.job_scheduler == SwfJobScheduler.TORQUE) {
                                var regExp = /<job_state>C<\/job_state>/i;
                                isFinish = (regExp.test(stdout));
                            }
                            else {
                                // default TCS
                                var regExp = /STATE(\s?)*:(\s?)*EXT/i;
                                isFinish = (regExp.test(stdout));
                            }
                            if (isFinish) {
                                clearInterval(intervalId);
                                TaskOperator.cleanUpRemote(job, client, dir_remote, completed, failed);
                            }
                        }
                    }
                }
                function onOutCallback(data) {
                    // TODO test
                    var stdout = new String(data);
                    var regEtp;
                    if (job.host.job_scheduler == SwfJobScheduler.TCS) {
                        regEtp = /Job\s(\d+)\ssubmitted/i;
                    }
                    else if (job.host.job_scheduler == SwfJobScheduler.TORQUE) {
                        regEtp = /(\d+)/;
                    }
                    else {
                        // default TCS
                        regEtp = /Job\s(\d+)\ssubmitted/i;
                    }
                    if (stdout.search(regEtp) != -1) {
                        jobId = stdout.match(regEtp)[1];
                    }
                    logger.info("submitted " + job.type + " : " + job.name);
                    logger.info("Job ID : " + jobId);
                    logger.info("STDOUT : " + data);
                }
                function onErrCallback(data) {
                    TaskManager.failed(tree);
                    logger.error("STDERR : " + data);
                }
            }
        }
        function completed() {
            // TODO check whether success
            TaskManager.completed(tree);
            client.end();
        }
        function failed() {
            TaskManager.failed(tree);
            client.end();
        }
    };
    TaskOperator.runLoop = function (tree) {
        var loop = tree;
        var index = TaskManager.getIndex(tree);
        if (isNaN(index)) {
            index = loop.forParam.start;
        }
        else {
            // increment
            index += loop.forParam.step;
        }
        TaskManager.setIndex(tree, index);
        if (loop.forParam.end < index) {
            // TODO check whether success
            TaskManager.completed(tree);
            return;
        }
        var workflow = {
            name: loop.name + "[" + index + "]",
            description: loop.description,
            path: loop.path + "[" + index + "]",
            type: SwfType.WORKFLOW,
            children_file: loop.children_file,
            relations: loop.relations,
            file_relations: loop.file_relations,
            positions: loop.positions,
            script: loop.script,
            input_files: loop.input_files,
            output_files: loop.output_files,
            send_files: loop.send_files,
            receive_files: loop.receive_files,
            max_size_receive_file: loop.max_size_receive_file,
            clean_up: loop.clean_up
        };
        var child = workflow;
        child.children = tree.children;
        child.parent = tree;
        TaskManager.cleanUp(child);
        // copy directory
        serverUtility.copyFolder(loop.path, child.path);
        TaskManager.setIndex(child, index);
        TaskManager.run(child);
    };
    TaskOperator.runIf = function (tree) {
        var conditionTree = tree.children[0];
        if (!TaskManager.isRun(conditionTree)) {
            TaskManager.run(conditionTree);
        }
        else if (TaskManager.isCompleted(conditionTree)) {
            if (tree.type == SwfType.ELSE) {
                // TODO solve other way
                var index = tree.parent.children.indexOf(tree);
                var ifTree = tree.parent.children[index - 1];
                if (TaskManager.isCompleted(ifTree.children[0])) {
                    TaskManager.completed(tree);
                    return;
                }
            }
            TaskOperator.runWorkflow(tree);
        }
        else if (TaskManager.isFailed(conditionTree)) {
            TaskManager.completed(tree);
        }
    };
    TaskOperator.runCondition = function (tree) {
        var condition = tree;
        if (!fs.existsSync(path.join(condition.path, condition.script.path))) {
            TaskManager.completed(tree);
            return;
        }
        var command;
        if (serverUtility.isLinux()) {
            // TODO test Linux
            if (condition.script.type == SwfScriptType.BASH || path.extname(condition.script.path) == '.sh') {
                command = "sh " + condition.script.path + ";\n";
            }
            else if (condition.script.type == SwfScriptType.LUA || path.extname(condition.script.path) == '.lua') {
                command = "lua " + condition.script.path + ";\n";
            }
        }
        else {
            // Windows
            if (condition.script.type == SwfScriptType.BATCH || path.extname(condition.script.path) == '.bat') {
                command = condition.script.path;
            }
            else if (condition.script.type == SwfScriptType.LUA || path.extname(condition.script.path) == '.lua') {
                command = path.resolve('lua.exe') + " " + condition.script.path + ";\n";
            }
            else {
                command = condition.script.path;
            }
        }
        TaskOperator.exec(command, condition.path, completed, failed);
        function completed() {
            var isCompleted = true;
            for (var i = 0; i < condition.output_files.length; i++) {
                var file_path = condition.output_files[i].path;
                isCompleted = isCompleted && fs.existsSync(path.join(condition.path, file_path));
            }
            if (isCompleted) {
                TaskManager.completed(tree);
            }
            else {
                TaskManager.failed(tree);
            }
        }
        function failed() {
            TaskManager.failed(tree);
        }
    };
    TaskOperator.runPStudy = function (tree) {
        var pstudy = tree;
        var index = TaskManager.getIndex(tree);
        if (isNaN(index)) {
            index = 0;
        }
        else {
            // increment
            index++;
        }
        var parameter_file_path = path.resolve(pstudy.path, pstudy.parameter_file.path);
        var data = fs.readFileSync(parameter_file_path);
        var parameter = JSON.parse(data.toString());
        var ps_size = TaskOperator.getSizePSSpace(parameter.target_params);
        if (ps_size <= index) {
            // TODO check whether success
            TaskManager.completed(tree);
            return;
        }
        TaskManager.setIndex(tree, index);
        var workflow = {
            name: pstudy.name + "[" + index + "]",
            description: pstudy.description,
            path: pstudy.path + "[" + index + "]",
            type: SwfType.WORKFLOW,
            children_file: pstudy.children_file,
            relations: pstudy.relations,
            file_relations: pstudy.file_relations,
            positions: pstudy.positions,
            script: pstudy.script,
            input_files: pstudy.input_files,
            output_files: pstudy.output_files,
            send_files: pstudy.send_files,
            receive_files: pstudy.receive_files,
            max_size_receive_file: pstudy.max_size_receive_file,
            clean_up: pstudy.clean_up
        };
        var child = workflow;
        child.children = tree.children;
        child.parent = tree;
        // copy directory
        serverUtility.copyFolder(pstudy.path, child.path);
        TaskManager.cleanUp(child);
        //TaskManager.setIndex(child, index);
        var src_path = path.join(pstudy.path, parameter.target_file);
        var dst_path = path.join(child.path, parameter.target_file.replace('.svy', ''));
        var values = TaskOperator.getPSVector(parameter.target_params, index);
        serverUtility.writeFileKeywordReplaced(src_path, dst_path, values);
        TaskManager.run(child);
        TaskManager.run(tree);
    };
    TaskOperator.getPSVector = function (psSpace, index) {
        var vector = {};
        for (var i = 0; i < psSpace.length; i++) {
            var psAxis = psSpace[i];
            var length_1 = TaskOperator.getSizePSAxis(psAxis);
            var position = index % length_1;
            if (psAxis.list != null) {
                vector[psAxis.keyword] = psAxis.list[position];
            }
            else {
                // check direction
                vector[psAxis.keyword] = (0 < psAxis.step ? psAxis.min : psAxis.max) + psAxis.step * position;
            }
            index = Math.floor(index / length_1);
        }
        return vector;
    };
    TaskOperator.getSizePSSpace = function (psSpace) {
        var size = 1;
        for (var i = 0; i < psSpace.length; i++) {
            size *= TaskOperator.getSizePSAxis(psSpace[i]);
        }
        return size;
    };
    TaskOperator.getSizePSAxis = function (psAxis) {
        var size = 0;
        if (psAxis.list != null) {
            size = psAxis.list.length;
        }
        else {
            var length_2 = Math.floor((psAxis.max - psAxis.min) / Math.abs(psAxis.step));
            if (length_2 < 1) {
                logger.error('Wrong parameter of parameter study.');
                logger.error("keyword: " + psAxis.keyword + ", min: " + psAxis.min + ", max: " + psAxis.max + ", step: " + psAxis.step);
                length_2 = 0;
            }
            size = length_2 + 1;
        }
        return size;
    };
    TaskOperator.link = function (src_path, dst_path) {
        if (fs.existsSync(dst_path)) {
            fs.unlinkSync(dst_path);
        }
        // make hard link
        fs.linkSync(src_path, dst_path);
        //// make symbolic link
        //const path_src_relative: string = path.relative(path_dst, path_src);
        //fs.symlinkSync(path_src_relative, path_dst);
    };
    TaskOperator.unlink = function (dst_path) {
        if (fs.existsSync(dst_path)) {
            fs.unlinkSync(dst_path);
        }
    };
    TaskOperator.exec = function (command, working_dir, callback, callbackErr) {
        var exec = child_process.exec;
        var option = {
            cwd: working_dir
        };
        exec(command, option, execCallback);
        function execCallback(err, stdout, stderr) {
            if (err) {
                logger.error("error : " + err);
                logger.error("STDERR : " + stderr);
                logger.error("STDOUT : " + stdout);
                logger.error("command : " + command);
                logger.error("working_dir : " + working_dir);
                if (callbackErr) {
                    callbackErr();
                }
                return;
            }
            if (callbackErr) {
                callback();
            }
        }
    };
    TaskOperator.execRemote = function (client, command, working_dir, callback, callbackErr) {
        if (command != '') {
            command = "cd " + working_dir + ";\n" + command;
        }
        client.exec(command, execCallback);
        function execCallback(err, channel) {
            if (err) {
                logger.error("error : " + err);
                logger.error("command : " + command);
                logger.error("working_dir : " + working_dir);
                if (callbackErr) {
                    callbackErr();
                }
                return;
            }
            channel.on('close', onCloseCallback);
            channel.on('data', onOutCallback);
            channel.stderr.on('data', onErrCallback);
            function onCloseCallback(exitCode, signalName) {
                if (callback) {
                    callback();
                }
            }
            function onOutCallback(data) {
                logger.info("STDOUT : " + data);
            }
            function onErrCallback(data) {
                logger.error("STDERR : " + data);
            }
        }
    };
    TaskOperator.mkdirRemote = function (client, path, working_dir, callback, callbackErr) {
        var command = "mkdir -p " + path + ";";
        TaskOperator.execRemote(client, command, working_dir, callback, callbackErr);
    };
    TaskOperator.rmFileRemote = function (client, path, working_dir, callback, callbackErr) {
        var command = "rm " + path + ";";
        TaskOperator.execRemote(client, command, working_dir, callback, callbackErr);
    };
    TaskOperator.setUpRemote = function (remoteTask, client, dir_remote, callback, callbackErr) {
        // make working directory
        TaskOperator.mkdirRemote(client, dir_remote, '', mkdirCallback, callbackErr);
        function mkdirCallback() {
            // send files
            compressFiles();
        }
        var tarFile_name = 'send_files.tar.gz';
        function compressFiles() {
            var command = "tar czvf \"" + tarFile_name + "\"";
            if (serverUtility.isWindows()) {
                // Windows
                command = path.resolve('tar.exe') + " czvf \"" + tarFile_name + "\"";
            }
            // send_files
            for (var i = 0; i < remoteTask.send_files.length; i++) {
                var file = remoteTask.send_files[i];
                command += " \"" + file.path + "\"";
            }
            // input_files
            for (var i = 0; i < remoteTask.input_files.length; i++) {
                var file = remoteTask.input_files[i];
                command += " \"" + file.path + "\"";
            }
            // script file
            if (remoteTask.script.path != '') {
                var file = remoteTask.script;
                command += " \"" + file.path + "\"";
            }
            TaskOperator.exec(command, remoteTask.path, compressCallback, callbackErr);
        }
        function compressCallback() {
            // send file
            client.sftp(sftpCallback);
        }
        function sftpCallback(err, sftp) {
            if (err) {
                logger.error('connecting SFTP is failed');
                logger.error(err);
                callbackErr();
                return;
            }
            // send script file
            var local_path = path.join(remoteTask.path, tarFile_name);
            var remote_path = path.posix.join(dir_remote, tarFile_name);
            sftp.fastPut(local_path, remote_path, sendFileCallback);
            function sendFileCallback(err) {
                if (err) {
                    logger.error("ERR " + remoteTask.type + " : " + remoteTask.name);
                    logger.error("error : " + err);
                    logger.error("path_local : " + local_path);
                    logger.error("path_remote : " + remote_path);
                    callbackErr();
                    return;
                }
                extractFilesRemote();
            }
        }
        function extractFilesRemote() {
            var command = "tar xvf \"" + tarFile_name + "\";";
            TaskOperator.execRemote(client, command, dir_remote, extractCallback, callbackErr);
        }
        function extractCallback() {
            // remove compressed files
            fs.unlinkSync(path.join(remoteTask.path, tarFile_name));
            // if this failed, callback next
            TaskOperator.rmFileRemote(client, tarFile_name, dir_remote, callback, callback);
        }
    };
    TaskOperator.cleanUpRemote = function (remoteTask, client, dir_remote, callback, callbackErr) {
        var tarFile_name = 'recieve_files.tar.gz';
        if (remoteTask.receive_files.length + remoteTask.output_files.length < 1) {
            callback();
            return;
        }
        compressFilesRemote();
        function compressFilesRemote() {
            var command = "tar czvf \"" + tarFile_name + "\"";
            // receive_files
            for (var i = 0; i < remoteTask.receive_files.length; i++) {
                var file = remoteTask.receive_files[i];
                command += " \"" + file.path + "\"";
            }
            // output_files
            for (var i = 0; i < remoteTask.output_files.length; i++) {
                var file = remoteTask.output_files[i];
                command += " \"" + file.path + "\"";
            }
            TaskOperator.execRemote(client, command, dir_remote, compressCallback, callbackErr);
        }
        function compressCallback() {
            // recieve file
            client.sftp(sftpCallback);
        }
        function sftpCallback(err, sftp) {
            if (err) {
                logger.error('connecting SFTP is failed');
                logger.error(err);
                callbackErr();
                return;
            }
            // send script file
            var local_path = path.join(remoteTask.path, tarFile_name);
            var remote_path = path.posix.join(dir_remote, tarFile_name);
            sftp.fastGet(remote_path, local_path, recieveFileCallback);
            function recieveFileCallback(err) {
                if (err) {
                    logger.error("ERR " + remoteTask.type + " : " + remoteTask.name);
                    logger.error("error : " + err);
                    logger.error("path_local : " + local_path);
                    logger.error("path_remote : " + remote_path);
                    callbackErr();
                    return;
                }
                extractFiles();
            }
        }
        function extractFiles() {
            var command = "tar xvf \"" + tarFile_name + "\";";
            if (serverUtility.isWindows()) {
                // Windows
                command = "\"" + path.resolve('tar.exe') + "\" xvf \"" + tarFile_name + "\"";
            }
            TaskOperator.exec(command, remoteTask.path, extractCallback, callbackErr);
        }
        function extractCallback() {
            // remove compressed files
            fs.unlinkSync(path.join(remoteTask.path, tarFile_name));
            // if this failed, callback next
            TaskOperator.rmFileRemote(client, tarFile_name, dir_remote, callback, callback);
        }
    };
    TaskOperator.getDirRemote = function (remoteTask) {
        var date = new Date();
        var name_dir_time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "-" + date.getHours() + "-" + date.getMinutes() + "-" + date.getSeconds();
        var path_from_root = getPathFromRoot(remoteTask);
        var dir_remote = path.posix.join(remoteTask.host.path, name_dir_time, path_from_root);
        return dir_remote;
        // set path from root
        function getPathFromRoot(tree) {
            var root = tree;
            while (root.parent != null) {
                root = root.parent;
            }
            // for linux
            return path.relative(root.path, tree.path).replace('\\', '/');
        }
    };
    return TaskOperator;
}());
module.exports = ProjectOperator;
//# sourceMappingURL=projectOperator.js.map