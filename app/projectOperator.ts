//inport = OpenLogJsonEvent;
import fs = require('fs');
import path = require('path');
import ssh2 = require('ssh2');
import child_process = require('child_process');
import logger = require('./logger');
import serverUtility = require('./serverUtility');
import remote = require('./remote');

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
    LOOP: 'Loop',
    IF: 'If',
    ELSE: 'Else',
    BREAK: 'Break',
    PSTADY: 'PStudy'
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
 * operator of SWF project
 */
class ProjectOperator {
    private projectJson: SwfProjectJson;
    private tree: TaskTree;

    public constructor(path_project: string) {
        this.projectJson = serverUtility.createProjectJson(path_project);
        const dir_project = path.dirname(path_project);
        const path_workflow = path.resolve(dir_project, this.projectJson.path_workflow);
        let treeJson: SwfTreeJson = serverUtility.createTreeJson(path_workflow);
        this.tree = ProjectOperator.createTaskTree(treeJson);
        ProjectOperator.setPathAbsolute(this.tree, this.projectJson.log);
    }

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

    public clean() {
        TaskManager.cleanUp(this.tree);
   }

    /**
     * set absolute path of directory of the task
     */
    private static setPathAbsolute(tree: TaskTree, logJson: SwfLogJson) {
        tree.path = logJson.path;

        if (tree.children.length != logJson.children.length) {
            logger.error('mismatch children workflow and log.');
            return;
        }

        for (let i = 0; i < tree.children.length; i++) {
            this.setPathAbsolute(tree.children[i], logJson.children[i]);
        }
    }

    /**
     * set parent
     */
    private static createTaskTree(treeJson: SwfTreeJson, parent: TaskTree = null): TaskTree {
        let tree = <TaskTree>treeJson;
        tree.parent = parent;
        for (let i = 0; i < treeJson.children.length; i++) {
            this.createTaskTree(treeJson.children[i], tree);
        }
        return tree;
    }

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
        return;
    }
}

/**
 * Task Manager
 */
class TaskManager {
    public static run(tree: TaskTree) {
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
    }

    public static completed(tree: TaskTree) {
        TaskManager.writeLogCompleted(tree);
        // run parent
        TaskManager.run(tree.parent);
    }

    public static failed(tree: TaskTree) {
        if (tree == null) {
            // finish all or error
            logger.info('Finish Project');
            return;
        }

        TaskManager.writeLogFailed(tree);
        TaskManager.failed(tree.parent);
    }

    public static failedCondition(tree: TaskTree) {
        if (tree == null) {
            logger.info('task is null');
            return;
        }

        TaskManager.writeLogFailed(tree);
        TaskManager.writeLogCompleted(tree.parent);
        // run parent
        TaskManager.run(tree.parent.parent);
    }

    private static name_logFile: string = 'swf.log';

    public static cleanUp(tree: TaskTree) {
        const path_logFile: string = path.resolve(tree.path, TaskManager.name_logFile);
        const path_index = path.resolve(tree.path, TaskManager.name_indexFile);
        if (fs.existsSync(path_logFile)) {
            fs.unlinkSync(path_logFile);
        }
        if (fs.existsSync(path_index)) {
            fs.unlinkSync(path_index);
        }

        for (let i = 0; i < tree.children.length; i++) {
            TaskManager.cleanUp(<TaskTree>tree.children[i]);
        }
        return;
    }

    private static writeLogRunning(tree: TaskTree) {
        if (TaskManager.isRun(tree)) {
            return;
        }

        logger.info(`Run ${tree.type} : ${tree.name}`);

        const dir_task: string = tree.path;
        const path_logFile: string = path.resolve(dir_task, TaskManager.name_logFile);
        const logJson: SwfLogJson = {
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
    }

    private static writeLogCompleted(tree: TaskTree) {
        const dir_task: string = tree.path;
        const path_logFile: string = path.resolve(dir_task, TaskManager.name_logFile);
        const data = fs.readFileSync(path_logFile);
        let logJson: SwfLogJson = JSON.parse(data.toString());

        logger.info(`Completed ${tree.type} : ${tree.name}`);

        logJson.execution_end_date = new Date().toLocaleString();
        logJson.state = SwfState.COMPLETED;
        fs.writeFileSync(path_logFile, JSON.stringify(logJson, null, '\t'));
    }

    private static writeLogFailed(tree: TaskTree) {
        logger.error(`Failed ${tree.type} : ${tree.name}`);
        logger.error(`path : ${tree.path}`);

        const dir_task: string = tree.path;
        const path_logFile: string = path.resolve(dir_task, TaskManager.name_logFile);
        const data = fs.readFileSync(path_logFile);
        let logJson: SwfLogJson = JSON.parse(data.toString());
        logJson.execution_end_date = new Date().toLocaleString();
        logJson.state = SwfState.FAILED;
        fs.writeFileSync(path_logFile, JSON.stringify(logJson, null, '\t'));
    }

    public static isRun(tree: TaskTree): boolean {
        const path_logFile: string = path.resolve(tree.path, TaskManager.name_logFile);
        return fs.existsSync(path_logFile);
    }

    public static isCompleted(tree: TaskTree): boolean {
        if (!TaskManager.isRun(tree)) {
            return false;
        }

        const path_logFile: string = path.resolve(tree.path, TaskManager.name_logFile);
        const data = fs.readFileSync(path_logFile);
        const logJson: SwfLogJson = JSON.parse(data.toString());

        const isCompleted: boolean = (logJson.state == SwfState.COMPLETED);
        return isCompleted;
    }

    public static isFailed(tree: TaskTree): boolean {
        if (!TaskManager.isRun(tree)) {
            return false;
        }

        const path_logFile: string = path.resolve(tree.path, TaskManager.name_logFile);
        const data = fs.readFileSync(path_logFile);
        const logJson: SwfLogJson = JSON.parse(data.toString());

        const isCompleted: boolean = (logJson.state == SwfState.FAILED);
        return isCompleted;
    }

    private static name_indexFile = 'loop.idx.json';
    public static getIndex(tree: TaskTree): number {
        const path_index = path.resolve(tree.path, TaskManager.name_indexFile);
        if (!fs.existsSync(path_index)) {
            return NaN;
        }
        const data: Buffer = fs.readFileSync(path_index);
        const json: ForIndex = JSON.parse(data.toString());
        return json.index;
    }

    public static setIndex(tree: TaskTree, index: number) {
        const path_index = path.resolve(tree.path, TaskManager.name_indexFile);
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
                const path_dst: string = path.resolve(workflow.path, relation.path_input_file);
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

                const path_src: string = path.resolve(workflow.path, relation.path_output_file);
                const path_dst: string = path.resolve(workflow.path, relation.path_input_file);
                TaskOperator.link(path_src, path_dst);
            }
            TaskManager.run(child);
        }
    }

    public static runTask(tree: TaskTree) {
        const task = <SwfTaskJson>tree;

        if (!fs.existsSync(path.join(task.path, task.script.path))) {
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

        TaskOperator.exec(command, task.path, completed, failed);

        function completed() {
            let isCompleted = true;
            for (let i = 0; i < task.output_files.length; i++) {
                const file_path = task.output_files[i].path
                isCompleted = isCompleted && fs.existsSync(path.join(task.path, file_path));
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

    public static runRemoteTask(tree: TaskTree) {
        const remoteTask = <SwfRemoteTaskJson><SwfTaskJson>tree;
        const client = new ssh2.Client();

        if (!fs.existsSync(path.join(remoteTask.path, remoteTask.script.path))) {
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

        const dir_remote = TaskOperator.getDirRemote(remoteTask);
        client.connect(config);
        client.on('ready', readyCallback);

        function readyCallback() {
            TaskOperator.setUpRemote(remoteTask, client, dir_remote, runScript, failed);
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
    }

    public static runJob(tree: TaskTree) {
        const job = <SwfJobJson><SwfTaskJson>tree;
        const client = new ssh2.Client();

        var t = path.join(job.path, job.script.path);
        if (!fs.existsSync(path.join(job.path, job.script.path))) {
            logger.error('Script file is not found');
            failed();
            return
        }

        let config: ssh2.ConnectConfig = {
            host: job.host.host,
            port: 22,
            username: job.host.username,
        }

        // TODO get password from dialog
        if (job.host.privateKey) {
            config.privateKey = fs.readFileSync(job.host.privateKey);
            config.passphrase = job.host.pass;
        } else {
            config.password = job.host.pass;
        }

        const dir_remote = TaskOperator.getDirRemote(job);

        client.connect(config);
        client.on('ready', readyCallback);

        function readyCallback() {
            TaskOperator.setUpRemote(job, client, dir_remote, runScript, failed);
        }


        function runScript() {
            let command: string = '';
            command += `cd ${dir_remote}\n`;
            if (job.host.job_scheduler == SwfJobScheduler.TCS) {
                command += `sh ${job.script.path}\n`;
            } else if (job.host.job_scheduler == SwfJobScheduler.TORQUE) {
                command += `sh ${job.script.path}\n`;
            } else {
                // default TCS
                command += `sh ${job.script.path}\n`;
            }

            client.exec(command, execCallback);

            function execCallback(err: Error, channel: ssh2.ClientChannel) {
                if (err) {
                    TaskManager.failed(tree);
                    logger.error(`error : ${err}`);
                    logger.error(`working directory : ${job.host.path}`);
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
                    const intervalId: NodeJS.Timer = setInterval(checkFinish, 2000);

                    function checkFinish() {
                        // check job scheduler
                        if (jobId == '') {
                            return;
                        }

                        let command: string = '';
                        if (job.host.job_scheduler == SwfJobScheduler.TCS) {
                            command += `pjstat ${jobId} -s\n`;
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
                                logger.error(`working directory : ${job.host.path}`);
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
                                const regExp: RegExp = /STATE(\s?)*:(\s?)*EXT/i;
                                isFinish = (regExp.test(stdout));
                            } else if (job.host.job_scheduler == SwfJobScheduler.TORQUE) {
                                const regExp: RegExp = /<job_state>C<\/job_state>/i;
                                isFinish = (regExp.test(stdout));
                            } else {
                                // default TCS
                                const regExp: RegExp = /STATE(\s?)*:(\s?)*EXT/i;
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
        }

        function failed() {
            TaskManager.failed(tree);
            client.end();
        }
    }

    public static runLoop(tree: TaskTree) {
        const loop = <SwfLoopJson>tree;

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

        let workflow: SwfWorkflowJson = {
            name: `${loop.name}[${index}]`,
            description: loop.description,
            path: `${loop.path}[${index}]`,
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

        const child: TaskTree = <TaskTree>workflow;
        child.children = tree.children;
        child.parent = tree;
        TaskManager.cleanUp(child);

        // copy directory
        serverUtility.copyFolder(loop.path, child.path);
        TaskManager.setIndex(child, index);

        TaskManager.run(child);
    }

    public static runIf(tree: TaskTree) {
        const conditionTree: TaskTree = tree.children[0]
        if (!TaskManager.isRun(conditionTree)) {
            TaskManager.run(conditionTree);
        } else if (TaskManager.isCompleted(conditionTree)) {
            if (tree.type == SwfType.ELSE) {
                // TODO solve other way
                const index = tree.parent.children.indexOf(tree);
                const ifTree: TaskTree = tree.parent.children[index - 1];
                if (TaskManager.isCompleted(ifTree.children[0])) {
                    TaskManager.completed(tree);
                    return;
                }
            }
            TaskOperator.runWorkflow(tree);
        } else if (TaskManager.isFailed(conditionTree)) {
            TaskManager.completed(tree);
        }
    }

    public static runCondition(tree: TaskTree) {
        const condition = <SwfTaskJson>tree;

        if (!fs.existsSync(path.join(condition.path, condition.script.path))) {
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

        TaskOperator.exec(command, condition.path, completed, failed);

        function completed() {
            let isCompleted = true;
            for (let i = 0; i < condition.output_files.length; i++) {
                const file_path = condition.output_files[i].path
                isCompleted = isCompleted && fs.existsSync(path.join(condition.path, file_path));
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

    public static runPStudy(tree: TaskTree) {
        const pstudy = <SwfPStudyJson><SwfTaskJson>tree;

        let index: number = TaskManager.getIndex(tree);
        if (isNaN(index)) {
            index = 0;
        } else {
            // increment
            index++;
        }

        const parameter_file_path: string = path.resolve(pstudy.path, pstudy.parameter_file.path);
        const data: Buffer = fs.readFileSync(parameter_file_path);
        const parameter: SwfPSParameterJson = JSON.parse(data.toString());
        var ps_size = TaskOperator.getSizePSSpace(parameter.target_params);
        if (ps_size <= index) {
            // TODO check whether success
            TaskManager.completed(tree);
            return;
        }

        TaskManager.setIndex(tree, index);

        let workflow: SwfWorkflowJson = {
            name: `${pstudy.name}[${index}]`,
            description: pstudy.description,
            path: `${pstudy.path}[${index}]`,
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

        const child: TaskTree = <TaskTree>workflow;
        child.children = tree.children;
        child.parent = tree;

        // copy directory
        serverUtility.copyFolder(pstudy.path, child.path);
        TaskManager.cleanUp(child);
        //TaskManager.setIndex(child, index);

        const src_path = path.join(pstudy.path, parameter.target_file);
        const dst_path = path.join(child.path, parameter.target_file.replace('.svy', ''));
        const values: Object = TaskOperator.getPSVector(parameter.target_params, index);
        serverUtility.writeFileKeywordReplaced(src_path, dst_path, values);

        TaskManager.run(child);
        TaskManager.run(tree);
    }

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

    private static getSizePSSpace(psSpace: Array<SwfPSAxisJson>): number {
        let size = 1;
        for (let i = 0; i < psSpace.length; i++) {
            size *= TaskOperator.getSizePSAxis(psSpace[i]);
        }
        return size;
    }

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

    private static link(src_path: string, dst_path: string) {
        if (fs.existsSync(dst_path)) {
            fs.unlinkSync(dst_path);
        }

        // make hard link
        fs.linkSync(src_path, dst_path);

        //// make symbolic link
        //const path_src_relative: string = path.relative(path_dst, path_src);
        //fs.symlinkSync(path_src_relative, path_dst);
    }

    private static unlink(dst_path: string) {
        if (fs.existsSync(dst_path)) {
            fs.unlinkSync(dst_path);
        }
    }

    private static exec(command: string, working_dir: string, callback?: () => void, callbackErr?: () => void) {
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

            if (callbackErr) {
                callback();
            }
        }
    }

    private static execRemote(client: ssh2.Client, command: string, working_dir: string, callback?: () => void, callbackErr?: () => void) {
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

    private static mkdirRemote(client: ssh2.Client, path: string, working_dir: string, callback?: () => void, callbackErr?: () => void) {
        const command: string = `mkdir -p ${path};`;
        TaskOperator.execRemote(client, command, working_dir, callback, callbackErr);
    }

    private static rmFileRemote(client: ssh2.Client, path: string, working_dir: string, callback?: () => void, callbackErr?: () => void) {
        const command: string = `rm ${path};`;
        TaskOperator.execRemote(client, command, working_dir, callback, callbackErr);
    }

    private static setUpRemote(remoteTask: SwfRemoteTaskJson, client: ssh2.Client, dir_remote: string, callback: () => void, callbackErr: () => void) {
        // make working directory
        TaskOperator.mkdirRemote(client, dir_remote, '', mkdirCallback, callbackErr);

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

            TaskOperator.exec(command, remoteTask.path, compressCallback, callbackErr);
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
            const local_path: string = path.join(remoteTask.path, tarFile_name);
            const remote_path: string = path.posix.join(dir_remote, tarFile_name)
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

            TaskOperator.execRemote(client, command, dir_remote, extractCallback, callbackErr);
        }

        function extractCallback() {
            // remove compressed files
            fs.unlinkSync(path.join(remoteTask.path, tarFile_name));
            // if this failed, callback next
            TaskOperator.rmFileRemote(client, tarFile_name, dir_remote, callback, callback);
        }

    }

    private static cleanUpRemote(remoteTask: SwfRemoteTaskJson, client: ssh2.Client, dir_remote: string, callback: () => void, callbackErr: () => void) {
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

            TaskOperator.execRemote(client, command, dir_remote, compressCallback, callbackErr);
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
            const local_path: string = path.join(remoteTask.path, tarFile_name);
            const remote_path: string = path.posix.join(dir_remote, tarFile_name)
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

            TaskOperator.exec(command, remoteTask.path, extractCallback, callbackErr);
        }

        function extractCallback() {
            // remove compressed files
            fs.unlinkSync(path.join(remoteTask.path, tarFile_name));
            // if this failed, callback next
            TaskOperator.rmFileRemote(client, tarFile_name, dir_remote, callback, callback);
        }
    }

    private static getDirRemote(remoteTask: SwfRemoteTaskJson): string {
        const date = new Date();
        const name_dir_time: string = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
        const path_from_root = getPathFromRoot(<TaskTree>remoteTask);
        const dir_remote: string = path.posix.join(remoteTask.host.path, name_dir_time, path_from_root);
        return dir_remote;

        // set path from root
        function getPathFromRoot(tree: TaskTree) {
            let root = tree;
            while (root.parent != null) {
                root = root.parent;
            }
            // for linux
            return path.relative(root.path, tree.path).replace('\\', '/');
        }
    }

}

interface TaskTree extends SwfTreeJson {
    parent: TaskTree;
    children: Array<TaskTree>;
}

export = ProjectOperator;