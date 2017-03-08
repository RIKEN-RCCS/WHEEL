"use strict";
//inport = OpenLogJsonEvent;
var fs = require("fs");
var path = require("path");
var ssh2 = require("ssh2");
var child_process = require("child_process");
var logger = require("./logger");
var serverUtility = require("./serverUtility");
var SwfState = {
    PLANNING: "Planning",
    RUNNING: "Running",
    RERUNNING: "ReRunning",
    WAITING: "Waiting",
    COMPLETED: "Completed",
    FAILED: "Failed",
};
var SwfType = {
    TASK: "Task",
    WORKFLOW: "Workflow",
    REMOTETASK: "RemoteTask",
    JOB: "Job",
    LOOP: "Loop",
    IF: "If",
    ELSE: "Else",
    BREAK: "Break",
    PSTADY: "PStudy"
};
var SwfScriptType = {
    BASH: "Bash",
    LUA: "Lua"
};
var SwfJobScheduler = {
    TCS: "TCS",
    TORQUE: "TORQUE"
};
/**
 * operator of SWF project
 */
var ProjectOperator = (function () {
    function ProjectOperator(path_project) {
        this.projectJson = serverUtility.createProjectJson(path_project);
        var dir_project = path.dirname(path_project);
        var path_workflow = path.resolve(dir_project, this.projectJson.path_workflow);
        this.treeJson = serverUtility.createTreeJson(path_workflow);
        ProjectOperator.setPathAbsolute(this.treeJson, this.projectJson.log);
    }
    ProjectOperator.prototype.run = function () {
        var tree = ProjectOperator.createTaskTree(this.treeJson);
        TaskManager.cleanUp(tree);
        logger.info("Run Project : " + this.projectJson.name);
        this.projectJson.state = SwfState.RUNNING;
        TaskManager.run(tree);
    };
    /**
     * set absolute path of directory of the task
     */
    ProjectOperator.setPathAbsolute = function (treeJson, logJson) {
        treeJson.path = logJson.path;
        if (treeJson.children.length != logJson.children.length) {
            logger.error('mismatch children workflow and log.');
            return;
        }
        for (var i = 0; i < treeJson.children.length; i++) {
            this.setPathAbsolute(treeJson.children[i], logJson.children[i]);
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
                // TODO make special
                TaskOperator.runJob(tree);
                break;
            case SwfType.LOOP:
                // TODO make special
                TaskOperator.runLoop(tree);
                break;
            case SwfType.IF:
                // TODO make special
                TaskOperator.runRemoteTask(tree);
                break;
            case SwfType.ELSE:
                // TODO make special
                TaskOperator.runRemoteTask(tree);
                break;
            case SwfType.BREAK:
                // TODO make special
                TaskOperator.runTask(tree);
                break;
            case SwfType.PSTADY:
                // TODO make special
                TaskOperator.runWorkflow(tree);
                break;
        }
    };
    TaskManager.completed = function (tree) {
        TaskManager.writeLogCompleted(tree);
        // run parent
        TaskManager.run(tree.parent);
    };
    TaskManager.failed = function (tree) {
        TaskManager.writeLogFailed(tree);
    };
    TaskManager.cleanUp = function (tree) {
        var path_logFile = path.resolve(tree.path, TaskManager.name_logFile);
        var path_index = path.resolve(tree.path, TaskManager.name_indexFile);
        fs.unlink(path_logFile, unlinkCallback);
        fs.unlink(path_index, unlinkCallback);
        for (var i = 0; i < tree.children.length; i++) {
            TaskManager.cleanUp(tree.children[i]);
        }
        return;
        function unlinkCallback(err) {
        }
    };
    TaskManager.writeLogRunning = function (tree) {
        if (TaskManager.isRunTask(tree)) {
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
            execution_end_date: "",
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
    TaskManager.isRunTask = function (tree) {
        var path_logFile = path.resolve(tree.path, TaskManager.name_logFile);
        return fs.existsSync(path_logFile);
    };
    TaskManager.isCompletedTask = function (tree) {
        if (!TaskManager.isRunTask(tree)) {
            return false;
        }
        var path_logFile = path.resolve(tree.path, TaskManager.name_logFile);
        var data = fs.readFileSync(path_logFile);
        var logJson = JSON.parse(data.toString());
        var isFinish = (logJson.state == SwfState.COMPLETED);
        return isFinish;
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
            isCompletedList[i] = TaskManager.isCompletedTask(tree.children[i]);
            isCompletedAll = isCompletedAll && isCompletedList[i];
        }
        if (isCompletedAll) {
            // TODO check whether success
            TaskManager.completed(tree);
            return;
        }
        for (var index_task = 0; index_task < tree.children.length; index_task++) {
            var child = tree.children[index_task];
            if (TaskManager.isRunTask(child)) {
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
            // solve file relation
            // TODO delete link and copy
            for (var i = 0; i < workflow.file_relations.length; i++) {
                var relation = workflow.file_relations[i];
                if (relation.index_after_task != index_task) {
                    continue;
                }
                var path_src = path.resolve(workflow.path, relation.path_output_file);
                var path_dst = path.resolve(workflow.path, relation.path_input_file);
                TaskOperator.symLink(path_src, path_dst);
            }
            TaskManager.run(child);
        }
    };
    TaskOperator.runTask = function (tree) {
        var task = tree;
        var exec = child_process.exec;
        var command;
        var option = {
            cwd: task.path
        };
        if (serverUtility.isLinux()) {
            // TODO test Linux
            command = "sh " + task.script.path;
        }
        else {
            // Windows
            command = task.script.path;
        }
        exec(command, option, execCallback);
        function execCallback(err, stdout, stderr) {
            if (err) {
                TaskManager.failed(tree);
                logger.error("error : " + err);
                logger.error("STDERR : " + stderr);
                logger.error("STDOUT : " + stdout);
                logger.error("command : " + command);
                return;
            }
            // TODO check whether success
            TaskManager.completed(tree);
        }
    };
    TaskOperator.runRemoteTask = function (tree) {
        var remoteTask = tree;
        var client = new ssh2.Client();
        // TODO get password from dialog
        var config = {
            host: remoteTask.host.host,
            port: 22,
            username: remoteTask.host.username,
            password: 'ideasideas'
        };
        var dir_remote = TaskOperator.getDirRemote(remoteTask);
        client.connect(config);
        client.on('ready', readyCallback);
        function readyCallback() {
            TaskOperator.setUpRemote(client, remoteTask, dir_remote, runScript);
        }
        function runScript() {
            var command = '';
            command += "cd " + dir_remote + "\n";
            if (remoteTask.script.type == SwfScriptType.BASH || path.extname(remoteTask.script.path) == '.sh') {
                command += "sh " + remoteTask.script.path + "\n";
            }
            else if (remoteTask.script.type == SwfScriptType.LUA || path.extname(remoteTask.script.path) == '.lua') {
                command += "lua " + remoteTask.script.path + "\n";
            }
            else {
                // default
                command += "./" + remoteTask.script.path + "\n";
            }
            client.exec(command, execCallback);
            function execCallback(err, channel) {
                if (err) {
                    TaskManager.failed(tree);
                    logger.error("error : " + err);
                    logger.error("working directory : " + remoteTask.host.path);
                    logger.error("command : " + command);
                    return;
                }
                channel.on('close', onCloseCallback);
                channel.on('data', onOutCallback);
                channel.stderr.on('data', onErrCallback);
                function onCloseCallback(exitCode, signalName) {
                    // TODO check whether success
                    TaskManager.completed(tree);
                    //logger.info(`Stream :: close :: code: ${exitCode}, signal: ${signalName}`);
                    client.end();
                }
                function onOutCallback(data) {
                    logger.info("STDOUT : " + data);
                }
                function onErrCallback(data) {
                    TaskManager.failed(tree);
                    logger.error("ERR " + remoteTask.type + " : " + remoteTask.name);
                    logger.error("STDERR : " + data);
                }
            }
        }
    };
    TaskOperator.runJob = function (tree) {
        var job = tree;
        var client = new ssh2.Client();
        // TODO get password from dialog
        var config = {
            host: job.host.host,
            port: 22,
            username: job.host.username,
            password: 'ideasideas'
        };
        var dir_remote = TaskOperator.getDirRemote(job);
        client.connect(config);
        client.on('ready', readyCallback);
        function readyCallback() {
            TaskOperator.setUpRemote(client, job, dir_remote, runScript);
        }
        function runScript() {
            var command = '';
            command += "cd " + dir_remote + "\n";
            if (job.host.job_scheduler == SwfJobScheduler.TCS) {
                command += "pjsub " + job.script.path + "\n";
            }
            else if (job.host.job_scheduler == SwfJobScheduler.TORQUE) {
                command += "qsub " + job.script.path + "\n";
            }
            else {
                // default TCS
                command += "pjsub " + job.script.path + "\n";
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
                                TaskManager.completed(tree);
                                client.end();
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
            max_size_recieve_file: loop.max_size_recieve_file,
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
    TaskOperator.symLink = function (path_src, path_dst) {
        if (fs.existsSync(path_dst)) {
            fs.unlinkSync(path_dst);
        }
        if (serverUtility.isLinux()) {
            // make symbolic link for relative
            var path_src_relative = path.relative(path_dst, path_src);
            fs.symlinkSync(path_src_relative, path_dst);
        }
        else {
            // Windows cannot mklink for user's authority
            // copy file
            fs.linkSync(path_src, path_dst);
        }
    };
    TaskOperator.setUpRemote = function (client, remoteTask, dir_remote, callback) {
        // make working directory
        var command = "mkdir -p " + dir_remote + "\n";
        client.exec(command, mkdirCallback);
        function mkdirCallback(err, channel) {
            if (err) {
                logger.error("error : " + err);
                logger.error("command : " + command);
                return;
            }
            // send files
            client.sftp(sftpCallback);
        }
        function sftpCallback(err, sftp) {
            if (err) {
                logger.error(err);
                logger.error("working directory : " + remoteTask.host.path);
                return;
            }
            // send necessary files
            var counter = 0;
            var count_files = remoteTask.send_files.length + remoteTask.input_files.length + 1;
            // send send_files
            for (var i = 0; i < remoteTask.send_files.length; i++) {
                var send_file = remoteTask.send_files[i];
                var path_local_1 = path.resolve(remoteTask.path, send_file.path);
                var path_remote_1 = path.posix.join(dir_remote, send_file.path);
                sftp.fastPut(path_local_1, path_remote_1, sendFileCallback);
            }
            // send input_files
            for (var i = 0; i < remoteTask.input_files.length; i++) {
                var send_file = remoteTask.input_files[i];
                var path_local_2 = path.resolve(remoteTask.path, send_file.path);
                var path_remote_2 = path.posix.join(dir_remote, send_file.path);
                sftp.fastPut(path_local_2, path_remote_2, sendFileCallback);
            }
            // send script file
            var path_local = path.resolve(remoteTask.path, remoteTask.script.path);
            var path_remote = path.posix.join(dir_remote, remoteTask.script.path);
            sftp.fastPut(path_local, path_remote, sendFileCallback);
            function sendFileCallback(err) {
                if (err) {
                    logger.error("ERR " + remoteTask.type + " : " + remoteTask.name);
                    logger.error("error : " + err);
                    logger.error("path_local : " + path_local);
                    logger.error("path_remote : " + path_remote);
                    return;
                }
                counter++;
                // If all files sent
                if (count_files <= counter) {
                    // run callback
                    callback();
                }
            }
        }
    };
    TaskOperator.getDirRemote = function (remoteTask) {
        var date = new Date();
        var name_dir_time = date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate() + "-" + date.getHours() + "-" + date.getMinutes() + "-" + date.getSeconds();
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