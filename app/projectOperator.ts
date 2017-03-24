//inport = OpenLogJsonEvent;
import fs = require('fs');
import path = require('path');
import ssh2 = require('ssh2');
import child_process = require('child_process');
import logger = require('./logger');
import serverUtility = require('./serverUtility');

const SwfState = {
    PLANNING: 'Planning',
    RUNNING: 'Running',
    RERUNNING: 'ReRunning',
    WAITING: 'Waiting',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
};

const SwfType = {
    TASK: 'Task',
    WORKFLOW: 'Workflow',
    REMOTETASK: 'RemoteTask',
    JOB: 'Job',
    FOR: 'For',
    IF: 'If',
    ELSE: 'Else',
    CONDITION: 'Condition',
    BREAK: 'Break',
    PSTUDY: 'PStudy'
};

const SwfScriptType = {
    BASH: 'Bash',
    LUA: 'Lua',
    BATCH: 'Batch'
};

const SwfJobScheduler = {
    TCS: 'TCS',
    TORQUE: 'TORQUE'
};

/**
 * Operator of SWF project.
 */
class ProjectOperator {
    /**
     * json file of project
     */
    private projectJson: SwfProjectJson;
    /**
     * tree of task
     */
    private tree: TaskTree;

    /**
     * Create new instance.
     * @param path_project
     */
    public constructor(path_project: string) {
        this.projectJson = serverUtility.createProjectJson(path_project);
        const dir_project = path.dirname(path_project);
        const path_workflow = path.resolve(dir_project, this.projectJson.path_workflow);
        let treeJson: SwfTreeJson = serverUtility.createTreeJson(path_workflow);
        this.tree = ProjectOperator.createTaskTree(treeJson);
        ProjectOperator.setPathAbsolute(this.tree, this.projectJson.log.path);
    }

    /**
     * Run project.
     * @param host_passSet
     */
    public run(host_passSet: { [name: string]: string }) {
        ProjectOperator.setPassToHost(this.tree, host_passSet);
        TaskManager.cleanUp(this.tree);
        this.projectJson.state = SwfState.RUNNING;
        try {
            logger.info(`Run Project : ${this.projectJson.name}`);
            TaskManager.run(this.tree);
        } catch (err) {
            logger.error('Catch exception.');
            logger.error(err);
        }
    }

    /**
     * Clean up project.
     */
    public clean() {
        TaskManager.cleanUp(this.tree);
    }

    /**
     * Asynchronous clean up project.
     * @param callback
     */
    public cleanAsync(callback: ((err?: Error) => void)) {
        TaskManager.cleanUpAsync(this.tree, callback);
    }

    /**
     * set absolute path of directory of the task
     * @param tree taeget tree
     * @param path_to_root path to root of tree
     */
    public static setPathAbsolute(tree: TaskTree, path_to_root: string) {
        const date = new Date();
        const name_dir_time: string = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
        _setPathAbsolute(tree, '');

        function _setPathAbsolute(_tree: TaskTree, path_from_root: string) {
            _tree.local_path = path.join(path_to_root, path_from_root);
            if (_tree.type == SwfType.REMOTETASK || _tree.type == SwfType.JOB) {
                let remoteTask: SwfRemoteTaskJson = <SwfRemoteTaskJson>_tree;
                _tree.remote_path = path.posix.join(remoteTask.host.path, name_dir_time, path_from_root.replace('\\', '/'));
            }

            for (let i = 0; i < _tree.children.length; i++) {
                _setPathAbsolute(_tree.children[i], path.join(path_from_root, _tree.children[i].path));
            }
        }
    }

    /**
     * Create TaskTree.
     * @param treeJson base of tree
     * @param parent parent of tree
     * @return created tree
     */
    public static createTaskTree(treeJson: SwfTreeJson, parent: TaskTree = null): TaskTree {
        let tree = <TaskTree>treeJson;
        tree.parent = parent;
        for (let i = 0; i < treeJson.children.length; i++) {
            this.createTaskTree(treeJson.children[i], tree);
        }
        return tree;
    }

    /**
     * Set password and passphrase for remote host authentication
     * @param tree target tree
     * @param host_passSet set of password and passphrase for remote host authentication
     */
    private static setPassToHost(tree: TaskTree, host_passSet: Object) {
        if (tree.type == SwfType.REMOTETASK || tree.type == SwfType.JOB) {
            let remoteTask: SwfRemoteTaskJson = <SwfRemoteTaskJson>tree;
            if (host_passSet.hasOwnProperty(remoteTask.host.name)) {
                remoteTask.host.pass = host_passSet[remoteTask.host.name];
            }
        }

        for (let i = 0; i < tree.children.length; i++) {
            this.setPassToHost(tree.children[i], host_passSet);
        }
    }

    /**
     * Copy task tree.
     * @param _tree origin tree
     * @return created tree
     */
    public static copyTaskTree(_tree: TaskTree): TaskTree {
        let object: Object = {};
        for (var key in _tree) {
            if (key == 'children' || key == 'parent') {
                continue;
            }
            object[key] = _tree[key];
        }

        object['children'] = new Array<TaskTree>();
        let tree: TaskTree = <TaskTree>object;
        for (let i = 0; i < _tree.children.length; i++) {
            const child: TaskTree = ProjectOperator.copyTaskTree(_tree.children[i]);
            tree.children.push(child);
            child.parent = tree;
        }
        return tree;
    }
}

/**
 * Task Manager
 */
class TaskManager {
    /**
     * run task tree
     * @param tree
     */
    public static run(tree: TaskTree) {
        if (tree == null) {
            // finish all or error
            logger.info('Finish Project');
            return;
        }

        if (tree.type == SwfType.JOB) {
            // push local queue
            LocalQueue.push(() => {
                TaskManager.writeLogRunning(tree);
                TaskOperator.runJob(tree);
            });
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
                //TaskOperator.runJob(tree);
                break;
            case SwfType.FOR:
                TaskOperator.runFor(tree);
                break;
            case SwfType.IF:
                TaskOperator.runIf(tree);
                break;
            case SwfType.ELSE:
                TaskOperator.runIf(tree);
                break;
            case SwfType.BREAK:
                TaskOperator.runTask(tree);
                break;
            case SwfType.CONDITION:
                TaskOperator.runTask(tree);
                break;
            case SwfType.PSTUDY:
                // TODO make special
                TaskOperator.runPStudy(tree);
                break;
        }
    }

    /**
     * Completed tree. Write log.
     * @param tree Task
     */
    public static completed(tree: TaskTree) {
        TaskManager.writeLogCompleted(tree);
        if (tree.type == SwfType.BREAK) {
            let break_for = tree.parent;
            while (break_for.type != SwfType.FOR) {
                if (break_for.parent == null) {
                    logger.error('The "break"\'s parent isn\'t "For"');
                    return;
                }
                break_for = break_for.parent;
            }

            TaskManager.completed(break_for);
        } else {
            // run parent
            TaskManager.run(tree.parent);
        }
    }

    /**
     * Failed tree. Write log.
     * @param tree Task
     */
    public static failed(tree: TaskTree) {
        if (tree == null) {
            // finish all or error
            logger.info('Finish Project');
            return;
        }

        TaskManager.writeLogFailed(tree);
        if (tree.type == SwfType.CONDITION) {
            const if_tree: TaskTree = tree.parent;
            TaskManager.completed(if_tree)
            TaskManager.run(if_tree.parent);
        } else {
            TaskManager.failed(tree.parent);
        }
    }

    ///**
    // * Failed condition.
    // * @param tree Task
    // */
    //public static failedCondition(tree: TaskTree) {
    //    if (tree == null) {
    //        logger.info('task is null');
    //        return;
    //    }

    //    TaskManager.writeLogFailed(tree);
    //    TaskManager.writeLogCompleted(tree.parent);
    //    // run parent
    //    TaskManager.run(tree.parent.parent);
    //}

    /**
     * name of log file
     */
    private static name_logFile: string = 'swf.log';

    /**
     * Clean up log file and index file and copyed directry.
     * @param tree Task
     */
    public static cleanUp(tree: TaskTree) {
        const path_logFile: string = path.resolve(tree.local_path, TaskManager.name_logFile);
        const path_index = path.resolve(tree.local_path, TaskManager.name_indexFile);
        if (fs.existsSync(path_logFile)) {
            fs.unlinkSync(path_logFile);
        }
        if (fs.existsSync(path_index)) {
            fs.unlinkSync(path_index);
        }

        if (tree.type == SwfType.FOR || tree.type == SwfType.PSTUDY) {
            const parent_path = path.dirname(tree.local_path);
            const files = fs.readdirSync(parent_path);
            const regexp = new RegExp(`^${tree.path}_([0-9]+)$`);
            for (let i = 0; i < files.length; i++) {
                if (files[i].match(regexp)) {
                    serverUtility.unlinkDirectory(path.join(parent_path, files[i]))
                }
            }
        }

        for (let i = 0; i < tree.children.length; i++) {
            TaskManager.cleanUp(<TaskTree>tree.children[i]);
        }
        return;
    }

    /**
     * Asynchronous clean up project.
     * @param tree Task
     * @param callback The function to call when we have finished cleanup project
     */
    public static cleanUpAsync(tree: TaskTree, callback: ((err?: Error) => void)) {

        const queue: TaskTree[] = [];

        (function ready(tree: TaskTree) {
            queue.push(tree);
            tree.children.forEach(child => ready(child));
        })(tree);

        (function cleanup() {
            const tree = queue.shift();
            if (!tree) {
                callback();
                return;
            }
            const path_logFile: string = path.resolve(tree.local_path, TaskManager.name_logFile);
            const path_index = path.resolve(tree.local_path, TaskManager.name_indexFile);

            fs.unlink(path_logFile, (err) => {
                fs.unlink(path_index, (err) => {
                    if (tree.type !== SwfType.FOR && tree.type !== SwfType.PSTUDY) {
                        cleanup();
                        return;
                    }

                    const parent_path = path.dirname(tree.local_path);
                    const regexp = new RegExp(`^${tree.path}_([0-9]+)$`);

                    fs.readdir(parent_path, (err, files) => {
                        if (err) {
                            callback(err);
                            return;
                        }

                        const loop = () => {
                            const file = files.shift();
                            if (!file) {
                                cleanup();
                                return;
                            }
                            if (file.match(regexp)) {
                                serverUtility.unlinkDirectoryAsync(path.join(parent_path, file), loop);
                            }
                            else {
                                loop();
                            }
                        };

                        loop();
                    });
                });
            });
        })();
    }

    /**
     * Write log for running.
     * @param tree Task
     */
    private static writeLogRunning(tree: TaskTree) {
        if (TaskManager.isRun(tree)) {
            return;
        }

        logger.info(`Run ${tree.type} : ${tree.name}`);

        const dir_task: string = tree.local_path;
        const path_logFile: string = path.resolve(dir_task, TaskManager.name_logFile);
        const logJson: SwfLogJson = {
            name: tree.name,
            description: tree.description,
            state: SwfState.RUNNING,
            path: tree.local_path,
            type: tree.type,
            execution_start_date: new Date().toLocaleString(),
            execution_end_date: '',
            children: []
        };

        fs.writeFileSync(path_logFile, JSON.stringify(logJson, null, '\t'));
    }

    /**
     * Write log for completed.
     * @param tree Task
     */
    private static writeLogCompleted(tree: TaskTree) {
        if (!TaskManager.isRun(tree)) {
            TaskManager.writeLogRunning(tree);
        }

        const dir_task: string = tree.local_path;
        const path_logFile: string = path.resolve(dir_task, TaskManager.name_logFile);
        const data = fs.readFileSync(path_logFile);
        let logJson: SwfLogJson = JSON.parse(data.toString());

        logger.info(`Completed ${tree.type} : ${tree.name}`);

        logJson.execution_end_date = new Date().toLocaleString();
        logJson.state = SwfState.COMPLETED;
        fs.writeFileSync(path_logFile, JSON.stringify(logJson, null, '\t'));
    }

    /**
     * Write log for failed.
     * @param tree Task
     */
    private static writeLogFailed(tree: TaskTree) {
        logger.error(`Failed ${tree.type} : ${tree.name}`);
        logger.error(`path : ${tree.local_path}`);

        const dir_task: string = tree.local_path;
        const path_logFile: string = path.resolve(dir_task, TaskManager.name_logFile);
        const data = fs.readFileSync(path_logFile);
        let logJson: SwfLogJson = JSON.parse(data.toString());
        logJson.execution_end_date = new Date().toLocaleString();
        logJson.state = SwfState.FAILED;
        fs.writeFileSync(path_logFile, JSON.stringify(logJson, null, '\t'));
    }

    /**
     * Check whether task run.
     * @param tree Task
     * @return whether run task
     */
    public static isRun(tree: TaskTree): boolean {
        const path_logFile: string = path.resolve(tree.local_path, TaskManager.name_logFile);
        return fs.existsSync(path_logFile);
    }

    /**
     * Check whether task completed.
     * @param tree Task
     * @return whether task completed
     */
    public static isCompleted(tree: TaskTree): boolean {
        if (!TaskManager.isRun(tree)) {
            return false;
        }

        const path_logFile: string = path.resolve(tree.local_path, TaskManager.name_logFile);
        const data = fs.readFileSync(path_logFile);
        const logJson: SwfLogJson = JSON.parse(data.toString());

        const isCompleted: boolean = (logJson.state == SwfState.COMPLETED);
        return isCompleted;
    }

    /**
     * Check whether failed task.
     * @param tree Task
     * @return whether task failed
     */
    public static isFailed(tree: TaskTree): boolean {
        if (!TaskManager.isRun(tree)) {
            return false;
        }

        const path_logFile: string = path.resolve(tree.local_path, TaskManager.name_logFile);
        const data = fs.readFileSync(path_logFile);
        const logJson: SwfLogJson = JSON.parse(data.toString());

        const isCompleted: boolean = (logJson.state == SwfState.FAILED);
        return isCompleted;
    }

    /**
     * name of index file
     */
    private static name_indexFile = 'loop.idx.json';

    /**
     * Get index for Loop and PStudy.
     * @param tree Task
     * @return index of Loop and PStudy
     */
    public static getIndex(tree: TaskTree): number {
        const path_index = path.resolve(tree.local_path, TaskManager.name_indexFile);
        if (!fs.existsSync(path_index)) {
            return NaN;
        }
        const data: Buffer = fs.readFileSync(path_index);
        const json: ForIndex = JSON.parse(data.toString());
        return json.index;
    }

    /**
     * Set index for Loop and PStudy
     * @param tree Task
     * @param index of Loop and PStudy
     */
    public static setIndex(tree: TaskTree, index: number) {
        const path_index = path.resolve(tree.local_path, TaskManager.name_indexFile);
        if (fs.existsSync(path_index)) {
            fs.unlinkSync(path_index);
        }
        const json: ForIndex = { index: index };
        fs.writeFileSync(path_index, JSON.stringify(json, null, '\t'));
    }
}

/**
 * Task Operator
 */
class TaskOperator {
    /**
     * Run Workflow.
     * @param tree Task
     */
    public static runWorkflow(tree: TaskTree) {
        const workflow = <SwfWorkflowJson>tree;

        // check finish all children
        let isCompletedList = new Array<boolean>(tree.children.length);
        let isCompletedAll: boolean = true;
        for (let i = 0; i < isCompletedList.length; i++) {
            isCompletedList[i] = TaskManager.isCompleted(tree.children[i]);
            isCompletedAll = isCompletedAll && isCompletedList[i];
        }

        if (isCompletedAll) {
            // TODO check whether success

            // unlink file relation
            for (let i = 0; i < workflow.file_relations.length; i++) {
                const relation = workflow.file_relations[i];
                const path_dst: string = path.resolve(tree.local_path, relation.path_input_file);
                TaskOperator.unlink(path_dst);
            }

            TaskManager.completed(tree);
            return;
        }

        for (let index_task = 0; index_task < tree.children.length; index_task++) {
            const child = <TaskTree>tree.children[index_task];
            if (TaskManager.isRun(child)) {
                continue;
            }

            let isFinishPreTask: boolean = true;
            // check relation
            for (let i = 0; i < workflow.relations.length; i++) {
                const relation = workflow.relations[i];
                if (relation.index_after_task == index_task) {
                    isFinishPreTask = isFinishPreTask && isCompletedList[relation.index_before_task];
                }
            }
            for (let i = 0; i < workflow.file_relations.length; i++) {
                const relation = workflow.file_relations[i];
                if (relation.index_after_task == index_task) {
                    isFinishPreTask = isFinishPreTask && isCompletedList[relation.index_before_task];
                }
            }

            if (!isFinishPreTask) {
                continue;
            }

            // link file relation
            for (let i = 0; i < workflow.file_relations.length; i++) {
                const relation = workflow.file_relations[i];
                if (relation.index_after_task != index_task) {
                    continue;
                }

                let path_src: string = path.resolve(tree.local_path, relation.path_output_file);
                let path_dst: string = path.resolve(tree.local_path, relation.path_input_file);
                TaskOperator.link(path_src, path_dst);
            }
            TaskManager.run(child);
        }
    }

    /**
     * Run Task
     * @param tree Workflowask
     */
    public static runTask(tree: TaskTree) {
        const task = <SwfTaskJson>tree;

        if (!fs.existsSync(path.join(tree.local_path, task.script.path))) {
            logger.error('Script file is not found');
            failed();
            return
        }

        let command: string;
        if (serverUtility.isLinux()) {
            // TODO test Linux
            if (task.script.type == SwfScriptType.BASH || path.extname(task.script.path) == '.sh') {
                command = `sh ${task.script.path};\n`;
            } else if (task.script.type == SwfScriptType.LUA || path.extname(task.script.path) == '.lua') {
                command = `lua ${task.script.path};\n`;
            }
        } else {
            // Windows
            if (task.script.type == SwfScriptType.BATCH || path.extname(task.script.path) == '.bat') {
                command = task.script.path;
            } else if (task.script.type == SwfScriptType.LUA || path.extname(task.script.path) == '.lua') {
                command = `${path.resolve('lua.exe')} ${task.script.path};\n`;
            } else {
                command = task.script.path;
            }
        }

        TaskOperator.exec(command, tree.local_path, completed, failed);

        function completed() {
            let isCompleted = true;
            for (let i = 0; i < task.output_files.length; i++) {
                const file_path = task.output_files[i].path
                isCompleted = isCompleted && fs.existsSync(path.join(tree.local_path, file_path));
            }

            if (isCompleted) {
                TaskManager.completed(tree);
            } else {
                TaskManager.failed(tree);
            }
        }

        function failed() {
            TaskManager.failed(tree);
        }
    }

    /**
     * Run RemoteTask
     * @param tree RemoteTask
     */
    public static runRemoteTask(tree: TaskTree) {
        const remoteTask = <SwfRemoteTaskJson><SwfTaskJson>tree;
        const client = new ssh2.Client();

        if (!fs.existsSync(path.join(tree.local_path, remoteTask.script.path))) {
            logger.error('Script file is not found');
            failed();
            return
        }

        let config: ssh2.ConnectConfig = {
            host: remoteTask.host.host,
            port: 22,
            username: remoteTask.host.username,
        };

        // TODO get password from dialog
        if (remoteTask.host.privateKey) {
            config.privateKey = fs.readFileSync(remoteTask.host.privateKey);
            config.passphrase = remoteTask.host.pass;
        } else {
            config.password = remoteTask.host.pass;
        }

        client.connect(config);
        client.on('ready', readyCallback);

        function readyCallback() {
            TaskOperator.setUpRemote(remoteTask, client, runScript, failed);
        }


        function runScript() {
            let command: string;
            if (remoteTask.script.type == SwfScriptType.BASH || path.extname(remoteTask.script.path) == '.sh') {
                command = `sh ${remoteTask.script.path}\n`;
            } else if (remoteTask.script.type == SwfScriptType.LUA || path.extname(remoteTask.script.path) == '.lua') {
                command = `lua ${remoteTask.script.path}\n`;
            } else {
                // default
                command += `./${remoteTask.script.path}\n`;
            }

            TaskOperator.execRemote(client, command, tree.remote_path, execCallback, failed);

            function execCallback() {
                // TODO check whether success
                TaskOperator.cleanUpRemote(remoteTask, client, completed, failed);
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
    }

    /**
     * Run Job.
     * @param tree Job
     */
    public static runJob(tree: TaskTree) {
        const job = <SwfJobJson><SwfTaskJson>tree;
        const client = new ssh2.Client();

        var t = path.join(tree.local_path, job.script.path);
        if (!fs.existsSync(path.join(tree.local_path, job.script.path))) {
            logger.error('Script file is not found');
            failed();
            return
        }

        let config: ssh2.ConnectConfig = {
            host: job.host.host,
            port: 22,
            username: job.host.username,
        }

        if (job.host.privateKey) {
            config.privateKey = fs.readFileSync(job.host.privateKey);
            config.passphrase = job.host.pass;
        } else {
            config.password = job.host.pass;
        }

        client.connect(config);
        client.on('ready', readyCallback);

        function readyCallback() {
            TaskOperator.setUpRemote(job, client, submit, failed);
        }

        function submit() {
            let command: string = '';
            command += `cd ${tree.remote_path}\n`;
            command += `sh ${job.script.path}\n`;

            client.exec(command, submitCallback);

            function submitCallback(err: Error, channel: ssh2.ClientChannel) {
                if (err) {
                    TaskManager.failed(tree);
                    logger.error(`error : ${err}`);
                    logger.error(`working directory : ${tree.remote_path}`);
                    logger.error(`command : ${command}`);

                    return;
                }

                channel.on('close', onCloseCallback);
                channel.on('data', onOutCallback);
                channel.stderr.on('data', onErrCallback);

                let jobId: string = '';
                function onCloseCallback(exitCode: number | null, signalName?: string) {
                    // TODO check whether success

                    //logger.info(`Stream :: close :: code: ${exitCode}, signal: ${signalName}`);
                    // set interval 10 sec.
                    const intervalId: NodeJS.Timer = setInterval(checkFinish, 10000);

                    function checkFinish() {
                        // check job scheduler
                        if (jobId == '') {
                            return;
                        }

                        let command: string = '';
                        if (job.host.job_scheduler == SwfJobScheduler.TCS) {
                            command += `pjstat ${jobId}\n`;
                        } else if (job.host.job_scheduler == SwfJobScheduler.TORQUE) {
                            command += `qstat -l ${jobId} -x\n`;
                        } else {
                            // default TCS
                            command += `pjsub ${job.script.path}\n`;
                        }

                        client.exec(command, getStateCallback);

                        function getStateCallback(err: Error, channel: ssh2.ClientChannel) {
                            if (err) {
                                TaskManager.failed(tree);
                                logger.error(`error : ${err}`);
                                logger.error(`working directory : ${tree.remote_path}`);
                                logger.error(`command : ${command}`);

                                return;
                            }

                            channel.on('close', onCloseStateCallback);
                            channel.on('data', onOutStateCallback);
                            channel.stderr.on('data', onErrCallback);
                        }

                        function onCloseStateCallback(exitCode: number | null, signalName?: string) {
                        }

                        function onOutStateCallback(data) {
                            const stdout: string = String(data);
                            // check state of job
                            let isFinish = false;
                            if (job.host.job_scheduler == SwfJobScheduler.TCS) {
                                const regExp: RegExp = /JOB_ID/i;
                                isFinish = (!regExp.test(stdout));
                            } else if (job.host.job_scheduler == SwfJobScheduler.TORQUE) {
                                const regExp: RegExp = /<job_state>C<\/job_state>/i;
                                isFinish = (regExp.test(stdout));
                            } else {
                                // default TCS
                                const regExp: RegExp = /JOB_ID/i;
                                isFinish = (!regExp.test(stdout));
                            }

                            if (isFinish) {
                                clearInterval(intervalId);
                                TaskOperator.cleanUpRemote(job, client, completed, failed);
                            }
                        }
                    }
                }

                function onOutCallback(data) {
                    // TODO test
                    const stdout = new String(data);
                    let regEtp: RegExp;
                    if (job.host.job_scheduler == SwfJobScheduler.TCS) {
                        regEtp = /Job\s(\d+)\ssubmitted/i;
                    } else if (job.host.job_scheduler == SwfJobScheduler.TORQUE) {
                        regEtp = /(\d+)/;
                    } else {
                        // default TCS
                        regEtp = /Job\s(\d+)\ssubmitted/i;
                    }

                    if (stdout.search(regEtp) != -1) {
                        jobId = stdout.match(regEtp)[1];
                    }
                    logger.info(`submitted ${job.type} : ${job.name}`);
                    logger.info(`Job ID : ${jobId}`);
                    logger.info(`STDOUT : ${data}`);
                }

                function onErrCallback(data) {
                    TaskManager.failed(tree);
                    logger.error(`STDERR : ${data}`);
                }
            }
        }

        function completed() {
            // TODO check whether success
            TaskManager.completed(tree);
            client.end();
            LocalQueue.finish();
        }

        function failed() {
            TaskManager.failed(tree);
            client.end();
            LocalQueue.finish();
        }
    }

    /**
     * Run Lopp.
     * @param tree Loop
     */
    public static runFor(tree: TaskTree) {
        const loop = <SwfForJson>tree;

        let index: number = TaskManager.getIndex(tree);
        if (isNaN(index)) {
            index = loop.forParam.start;
        } else {

            // increment
            index += loop.forParam.step;
        }
        TaskManager.setIndex(tree, index);

        if (loop.forParam.end < index) {
            // TODO check whether success
            TaskManager.completed(tree);
            return;
        }

        let workflow: SwfWorkflowJson = ProjectOperator.copyTaskTree(tree);
        workflow.name = `${loop.name}_${index}`;
        workflow.path = `${loop.path}_${index}`;
        workflow.type = SwfType.WORKFLOW;

        const child: TaskTree = <TaskTree>workflow;
        child.parent = tree;

        ProjectOperator.setPathAbsolute(child, path.join(path.dirname(tree.local_path), child.path));

        // copy directory
        serverUtility.copyFolder(tree.local_path, child.local_path);
        TaskManager.cleanUp(child);
        TaskManager.setIndex(child, index);

        TaskManager.run(child);
    }

    /**
     * Run If.
     * @param tree If
     */
    public static runIf(tree: TaskTree) {
        const condition_tree: TaskTree = tree.children[0];

        if (!TaskManager.isRun(condition_tree)) {
            TaskManager.run(condition_tree);
        } else if (TaskManager.isCompleted(condition_tree)) {
            // TODO solve other way
            const else_index = tree.parent.children.indexOf(tree) + 1;
            if (else_index < tree.parent.children.length) {
                const else_tree: TaskTree = tree.parent.children[else_index];
                if (else_tree.type == SwfType.ELSE) {
                    TaskManager.completed(else_tree);
                }
            }
            TaskOperator.runWorkflow(tree);
        } else {
            if (tree.type == SwfType.ELSE) {
                TaskManager.completed(condition_tree);
            }
        }
    }

    /**
     * Run Condtion.
     * @param tree Condition
     */
    public static runCondition(tree: TaskTree) {
        const condition = <SwfTaskJson>tree;

        if (!fs.existsSync(path.join(tree.local_path, condition.script.path))) {
            TaskManager.completed(tree);
            return;
        }

        let command: string;
        if (serverUtility.isLinux()) {
            // TODO test Linux
            if (condition.script.type == SwfScriptType.BASH || path.extname(condition.script.path) == '.sh') {
                command = `sh ${condition.script.path};\n`;
            } else if (condition.script.type == SwfScriptType.LUA || path.extname(condition.script.path) == '.lua') {
                command = `lua ${condition.script.path};\n`;
            }
        } else {
            // Windows
            if (condition.script.type == SwfScriptType.BATCH || path.extname(condition.script.path) == '.bat') {
                command = condition.script.path;
            } else if (condition.script.type == SwfScriptType.LUA || path.extname(condition.script.path) == '.lua') {
                command = `${path.resolve('lua.exe')} ${condition.script.path};\n`;
            } else {
                command = condition.script.path;
            }
        }

        TaskOperator.exec(command, tree.local_path, completed, failed);

        function completed() {
            let isCompleted = true;
            for (let i = 0; i < condition.output_files.length; i++) {
                const file_path = condition.output_files[i].path
                isCompleted = isCompleted && fs.existsSync(path.join(tree.local_path, file_path));
            }

            if (isCompleted) {
                TaskManager.completed(tree);
            } else {
                TaskManager.failed(tree);
            }
        }

        function failed() {
            TaskManager.failed(tree);
        }
    }

    /**
     * Run PStudy.
     * @param tree PStudy
     */
    public static runPStudy(tree: TaskTree) {
        const pstudy = <SwfPStudyJson><SwfTaskJson>tree;

        let index: number = TaskManager.getIndex(tree);
        if (isNaN(index)) {
            index = 0;
        } else {
            // increment
            index++;
        }

        TaskManager.setIndex(tree, index);

        const parameter_file_path: string = path.resolve(tree.local_path, pstudy.parameter_file.path);
        const data: Buffer = fs.readFileSync(parameter_file_path);
        const parameter: SwfPSParameterJson = JSON.parse(data.toString());
        var ps_size = TaskOperator.getSizePSSpace(parameter.target_params);

        if (ps_size <= index) {
            let isCompleted = true;
            if (tree.hidden_children != null) {
                for (let i = 0; i < tree.hidden_children.length; i++) {
                    isCompleted = isCompleted && TaskManager.isCompleted(tree.hidden_children[i]);
                }
            }
            if (isCompleted) {
                TaskManager.completed(tree);
            }
            return;
        }

        let workflow: SwfWorkflowJson = ProjectOperator.copyTaskTree(tree);
        workflow.name = `${pstudy.name}_${index}`;
        workflow.path = `${pstudy.path}_${index}`;
        workflow.type = SwfType.WORKFLOW;

        const child: TaskTree = <TaskTree>workflow;
        child.parent = tree;
        if (tree.hidden_children == null) {
            tree.hidden_children = new Array<TaskTree>();
        }
        tree.hidden_children.push(child)

        ProjectOperator.setPathAbsolute(child, path.join(path.dirname(tree.local_path), child.path));
        serverUtility.copyFolder(tree.local_path, child.local_path);
        TaskManager.cleanUp(child);
        TaskManager.setIndex(child, index);

        const src_path = path.join(tree.local_path, parameter.target_file);
        const dst_path = path.join(child.local_path, parameter.target_file.replace('.svy', ''));
        const values: Object = TaskOperator.getPSVector(parameter.target_params, index);
        serverUtility.writeFileKeywordReplaced(src_path, dst_path, values);

        TaskManager.run(child);
        TaskManager.run(tree);
    }

    /**
     * Get parameter vector of PStudy space.
     * @param psSpace PStudy space
     * @param index index of vector for PStudy space.
     * @return parameter vector of PStudy space
     */
    private static getPSVector(psSpace: Array<SwfPSAxisJson>, index: number): Object {
        let vector: Object = {};
        for (let i = 0; i < psSpace.length; i++) {
            const psAxis: SwfPSAxisJson = psSpace[i];
            const length = TaskOperator.getSizePSAxis(psAxis);
            const position: number = index % length;
            if (psAxis.list != null) {
                vector[psAxis.keyword] = psAxis.list[position];
            } else {
                // check direction
                vector[psAxis.keyword] = (0 < psAxis.step ? psAxis.min : psAxis.max) + psAxis.step * position;
            }
            index = Math.floor(index / length);
        }

        return vector;
    }

    /**
     * Get size of PStudy space.
     * @param psSpace
     * @return size of PStudy space
     */
    private static getSizePSSpace(psSpace: Array<SwfPSAxisJson>): number {
        let size = 1;
        for (let i = 0; i < psSpace.length; i++) {
            size *= TaskOperator.getSizePSAxis(psSpace[i]);
        }
        return size;
    }

    /**
     * Get size of PStudy axis.
     * @param psAxis PStudy axis
     * @return size of PStudy axis
     */
    private static getSizePSAxis(psAxis: SwfPSAxisJson): number {
        let size = 0;
        if (psAxis.list != null) {
            size = psAxis.list.length;
        } else {
            let length = Math.floor((psAxis.max - psAxis.min) / Math.abs(psAxis.step));
            if (length < 1) {
                logger.error('Wrong parameter of parameter study.');
                logger.error(`keyword: ${psAxis.keyword}, min: ${psAxis.min}, max: ${psAxis.max}, step: ${psAxis.step}`);
                length = 0;
            }
            size = length + 1;
        }
        return size;
    }

    /**
     * Link output and input of task.
     * @param src_path path of source file
     * @param dst_path path of destination file
     */
    private static link(src_path: string, dst_path: string) {
        if (fs.existsSync(dst_path) && !fs.statSync(dst_path).isDirectory()) {
            fs.unlinkSync(dst_path);
        }

        // make hard link
        fs.linkSync(src_path, dst_path);

        //// make symbolic link
        //const path_src_relative: string = path.relative(path_dst, path_src);
        //fs.symlinkSync(path_src_relative, path_dst);
    }

    /**
     * Unlink output and input of task.
     * @param dst_path path of destination file
     */
    private static unlink(dst_path: string) {
        if (fs.existsSync(dst_path)) {
            fs.unlinkSync(dst_path);
        }
    }

    /**
     * Execute server side.
     * @param command command for execution
     * @param working_dir path of directory for execution
     * @param callback function to call when end of execution without error
     * @param callbackErr function ro call when we get error
     */
    private static exec(command: string, working_dir: string, callback?: (() => void), callbackErr?: (() => void)) {
        const exec = child_process.exec;
        const option: child_process.ExecOptions = {
            cwd: working_dir
        };

        exec(command, option, execCallback);

        function execCallback(err: Error, stdout: string, stderr: string) {
            if (err) {
                logger.error(`error : ${err}`);
                logger.error(`STDERR : ${stderr}`);
                logger.error(`STDOUT : ${stdout}`);
                logger.error(`command : ${command}`);
                logger.error(`working_dir : ${working_dir}`);
                if (callbackErr) {
                    callbackErr();
                }
                return;
            }

            if (callback) {
                callback();
            }
        }
    }

    /**
     * Execute remote side.
     * @param client connection of remote side
     * @param command command for execution
     * @param working_dir path of directory for execution
     * @param callback function to call when end of execution without error
     * @param callbackErr function ro call when we get error
     */
    private static execRemote(client: ssh2.Client, command: string, working_dir: string, callback?: (() => void), callbackErr?: (() => void)) {
        if (command != '') {
            command = `cd ${working_dir};\n` + command;
        }

        client.exec(command, execCallback);

        function execCallback(err: Error, channel: ssh2.ClientChannel) {
            if (err) {
                logger.error(`error : ${err}`);
                logger.error(`command : ${command}`);
                logger.error(`working_dir : ${working_dir}`);
                if (callbackErr) {
                    callbackErr();
                }
                return;
            }

            channel.on('close', onCloseCallback);
            channel.on('data', onOutCallback);
            channel.stderr.on('data', onErrCallback);

            function onCloseCallback(exitCode: number | null, signalName?: string) {
                if (callback) {
                    callback();
                }
            }

            function onOutCallback(data) {
                logger.info(`STDOUT : ${data}`);
            }

            function onErrCallback(data) {
                logger.error(`STDERR : ${data}`);
            }
        }
    }

    /**
     * Make directory remote side.
     * @param client connection of remote side
     * @param path path of directory you want
     * @param working_dir path of directory for execution
     * @param callback function to call when end of execution without error
     * @param callbackErr function ro call when we get error
     */
    private static mkdirRemote(client: ssh2.Client, path: string, working_dir: string, callback?: (() => void), callbackErr?: (() => void)) {
        const command: string = `mkdir -p ${path};`;
        TaskOperator.execRemote(client, command, working_dir, callback, callbackErr);
    }

    /**
     * Remove file remote side
     * @param client connection of remote side
     * @param path path of file you want
     * @param working_dir path of directory for execution
     * @param callback function to call when end of execution without error
     * @param callbackErr function ro call when we get error
     */
    private static rmFileRemote(client: ssh2.Client, path: string, working_dir: string, callback?: (() => void), callbackErr?: (() => void)) {
        const command: string = `rm ${path};`;
        TaskOperator.execRemote(client, command, working_dir, callback, callbackErr);
    }

    /**
     * Set up remote to execute RemoteTask
     * @param remoteTask taeget RemoteTask
     * @param client connection of remote side
     * @param callback function to call when end of execution without error
     * @param callbackErr function ro call when we get error
     */
    private static setUpRemote(remoteTask: SwfRemoteTaskJson, client: ssh2.Client, callback?: (() => void), callbackErr?: (() => void)) {
        // make working directory
        TaskOperator.mkdirRemote(client, (<TaskTree>remoteTask).remote_path, '', mkdirCallback, callbackErr);

        function mkdirCallback() {
            // send files
            compressFiles();
        }

        let tarFile_name: string = 'send_files.tar.gz';
        function compressFiles() {
            let command: string = `tar czvf "${tarFile_name}"`;
            if (serverUtility.isWindows()) {
                // Windows
                command = `${path.resolve('tar.exe')} czvf "${tarFile_name}"`;
            }
            // send_files
            for (let i = 0; i < remoteTask.send_files.length; i++) {
                const file = remoteTask.send_files[i];
                command += ` "${file.path}"`;
            }
            // input_files
            for (let i = 0; i < remoteTask.input_files.length; i++) {
                const file = remoteTask.input_files[i];
                command += ` "${file.path}"`;
            }
            // script file
            if (remoteTask.script.path != '') {
                const file = remoteTask.script;
                command += ` "${file.path}"`;
            }
            // job script file
            if (remoteTask.type == SwfType.JOB) {
                const job = <SwfJobJson>remoteTask;
                if (job.job_script.path != '') {
                    const file = job.job_script;
                    command += ` "${file.path}"`;
                }
            }

            TaskOperator.exec(command, (<TaskTree>remoteTask).local_path, compressCallback, callbackErr);
        }

        function compressCallback() {
            // send file
            client.sftp(sftpCallback);
        }

        function sftpCallback(err: Error, sftp: ssh2.SFTPWrapper) {
            if (err) {
                logger.error('connecting SFTP is failed');
                logger.error(err);
                callbackErr();
                return;
            }

            // send script file
            const local_path: string = path.join((<TaskTree>remoteTask).local_path, tarFile_name);
            const remote_path: string = path.posix.join((<TaskTree>remoteTask).remote_path, tarFile_name)
            sftp.fastPut(local_path, remote_path, sendFileCallback);

            function sendFileCallback(err: Error) {
                if (err) {
                    logger.error(`ERR ${remoteTask.type} : ${remoteTask.name}`);
                    logger.error(`error : ${err}`);
                    logger.error(`path_local : ${local_path}`);
                    logger.error(`path_remote : ${remote_path}`);
                    callbackErr();
                    return;
                }

                extractFilesRemote();
            }
        }

        function extractFilesRemote() {
            const command: string = `tar xvf "${tarFile_name}";`;

            TaskOperator.execRemote(client, command, (<TaskTree>remoteTask).remote_path, extractCallback, callbackErr);
        }

        function extractCallback() {
            // remove compressed files
            fs.unlinkSync(path.join((<TaskTree>remoteTask).local_path, tarFile_name));
            // if this failed, callback next
            TaskOperator.rmFileRemote(client, tarFile_name, (<TaskTree>remoteTask).remote_path, callback, callback);
        }

    }

    /**
     * Clean up remote after execute RemoteTask
     * @param remoteTask taeget RemoteTask
     * @param client connection of remote side
     * @param callback function to call when end of execution without error
     * @param callbackErr function ro call when we get error
     */
    private static cleanUpRemote(remoteTask: SwfRemoteTaskJson, client: ssh2.Client, callback?: (() => void), callbackErr?: (() => void)) {
        let tarFile_name: string = 'recieve_files.tar.gz';
        if (remoteTask.receive_files.length + remoteTask.output_files.length < 1) {
            callback();
            return
        }

        compressFilesRemote();

        function compressFilesRemote() {
            let command: string = `tar czvf "${tarFile_name}"`;
            // receive_files
            for (let i = 0; i < remoteTask.receive_files.length; i++) {
                const file = remoteTask.receive_files[i];
                command += ` "${file.path}"`;
            }
            // output_files
            for (let i = 0; i < remoteTask.output_files.length; i++) {
                const file = remoteTask.output_files[i];
                command += ` "${file.path}"`;
            }

            TaskOperator.execRemote(client, command, (<TaskTree>remoteTask).remote_path, compressCallback, callbackErr);
        }

        function compressCallback() {
            // recieve file
            client.sftp(sftpCallback);
        }

        function sftpCallback(err: Error, sftp: ssh2.SFTPWrapper) {
            if (err) {
                logger.error('connecting SFTP is failed');
                logger.error(err);
                callbackErr();
                return;
            }

            // send script file
            const local_path: string = path.join((<TaskTree>remoteTask).local_path, tarFile_name);
            const remote_path: string = path.posix.join((<TaskTree>remoteTask).remote_path, tarFile_name)
            sftp.fastGet(remote_path, local_path, recieveFileCallback);

            function recieveFileCallback(err: Error) {
                if (err) {
                    logger.error(`ERR ${remoteTask.type} : ${remoteTask.name}`);
                    logger.error(`error : ${err}`);
                    logger.error(`path_local : ${local_path}`);
                    logger.error(`path_remote : ${remote_path}`);
                    callbackErr();
                    return;
                }
                extractFiles();
            }
        }

        function extractFiles() {
            let command: string = `tar xvf "${tarFile_name}";`;
            if (serverUtility.isWindows()) {
                // Windows
                command = `"${path.resolve('tar.exe')}" xvf "${tarFile_name}"`;
            }

            TaskOperator.exec(command, (<TaskTree>remoteTask).local_path, extractCallback, callbackErr);
        }

        function extractCallback() {
            // remove compressed files
            fs.unlinkSync(path.join((<TaskTree>remoteTask).local_path, tarFile_name));
            // if this failed, callback next
            TaskOperator.rmFileRemote(client, tarFile_name, (<TaskTree>remoteTask).remote_path, callback, callback);
        }
    }

}

/**
 * Tree of task.
 */
interface TaskTree extends SwfTreeJson {
    /**
     * parent of tree
     */
    parent: TaskTree;
    /**
     * children of tree
     */
    children: Array<TaskTree>;
    /**
     * path of directory of task on local
     */
    local_path: string;
    /**
     * path of directory of task on remote
     */
    remote_path?: string;
    /**
     * created children by tree
     */
    hidden_children?: Array<TaskTree>;
}

/**
 * local job queue
 */
class LocalQueue {
    /**
     * upper number limit for job submit
     */
    private static MAX_JOB = 5;
    /**
     * number of job submited
     */
    private static num_job = 0;
    /**
     * queue of job
     */
    private static queue: Array<() => void> = new Array<() => void>();

    /**
     * Push job queue.
     * @param job function to submit job
     */
    public static push(job: (() => void)) {
        LocalQueue.queue.push(job);

        LocalQueue.checkQueue();
    }

    /**
     * Finish submited Job.
     */
    public static finish() {
        LocalQueue.num_job--;

        LocalQueue.checkQueue();
    }

    /**
     * Check whether job can be submit.
     */
    private static checkQueue() {
        while (0 < LocalQueue.queue.length && LocalQueue.num_job < LocalQueue.MAX_JOB) {
            const job = LocalQueue.queue.shift();
            if (job != null) {
                job();
                LocalQueue.num_job++;
            }
        }
    }
}

export = ProjectOperator;