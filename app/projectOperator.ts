//inport = OpenLogJsonEvent;
import fs = require('fs');
import path = require('path');
import ssh2 = require('ssh2');
import child_process = require('child_process');
import logger = require('./logger');
import serverUtility = require('./serverUtility');
import remote = require('./remote');

const SwfState = {
    PLANNING: "Planning",
    RUNNING: "Running",
    RERUNNING: "ReRunning",
    WAITING: "Waiting",
    COMPLETED: "Completed",
    FAILED: "Failed",
};

const SwfType = {
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

const SwfScriptType = {
    BASH: "Bash",
    LUA: "Lua"
};

const SwfJobScheduler = {
    TCS: "TCS",
    TORQUE: "TORQUE"
};

/**
 * operator of SWF project
 */
class ProjectOperator {
    private projectJson: SwfProjectJson;
    private treeJson: SwfTreeJson;

    public constructor(path_project: string) {
        this.projectJson = serverUtility.createProjectJson(path_project);
        const dir_project = path.dirname(path_project);
        const path_workflow = path.resolve(dir_project, this.projectJson.path_workflow);
        this.treeJson = serverUtility.createTreeJson(path_workflow);
        ProjectOperator.setPathAbsolute(this.treeJson, this.projectJson.log);
    }

    public run() {
        let tree: TaskTree = ProjectOperator.createTaskTree(this.treeJson);
        TaskManager.cleanUp(tree);
        logger.info(`Run Project : ${this.projectJson.name}`);
        this.projectJson.state = SwfState.RUNNING;
        TaskManager.run(tree);
    }

    /**
     * set absolute path of directory of the task
     */
    private static setPathAbsolute(treeJson: SwfTreeJson, logJson: SwfLogJson) {
        treeJson.path = logJson.path;

        if (treeJson.children.length != logJson.children.length) {
            logger.error('mismatch children workflow and log.');
            return;
        }

        for (let i = 0; i < treeJson.children.length; i++) {
            this.setPathAbsolute(treeJson.children[i], logJson.children[i]);
        }
    }

    /**
     * set parent
     */
    private static createTaskTree(treeJson: SwfTreeJson, parent: TaskTree = null) :TaskTree{
        let tree = <TaskTree>treeJson;
        tree.parent = parent;
        for (let i = 0; i < treeJson.children.length; i++) {
            this.createTaskTree(treeJson.children[i], tree);
        }
        return tree;
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
    }

    public static completed(tree: TaskTree) {
        TaskManager.writeLogCompleted(tree);
        // run parent
        TaskManager.run(tree.parent);
    }

    public static failed(tree: TaskTree) {
        TaskManager.writeLogFailed(tree);
    }

    private static name_logFile: string = 'swf.log';

    public static cleanUp(tree: TaskTree) {
        const path_logFile: string = path.resolve(tree.path, TaskManager.name_logFile);
        const path_index = path.resolve(tree.path, TaskManager.name_indexFile);
        fs.unlink(path_logFile, unlinkCallback);
        fs.unlink(path_index, unlinkCallback);

        for (let i = 0; i < tree.children.length; i++) {
            TaskManager.cleanUp(<TaskTree>tree.children[i]);
        }
        return;

        function unlinkCallback(err?: NodeJS.ErrnoException) {
        }
    }

    private static writeLogRunning(tree: TaskTree) {
        if (TaskManager.isRunTask(tree)) {
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
            execution_end_date: "",
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

    public static isRunTask(tree: TaskTree): boolean {
        const path_logFile: string = path.resolve(tree.path, TaskManager.name_logFile);
        return fs.existsSync(path_logFile);
    }

    public static isCompletedTask(tree: TaskTree): boolean {
        if (!TaskManager.isRunTask(tree)) {
            return false;
        }

        const path_logFile: string = path.resolve(tree.path, TaskManager.name_logFile);
        const data = fs.readFileSync(path_logFile);
        const logJson: SwfLogJson = JSON.parse(data.toString());

        const isFinish: boolean = (logJson.state == SwfState.COMPLETED);
        return isFinish;
    }

    private static  name_indexFile = 'loop.idx.json';
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
            isCompletedList[i] = TaskManager.isCompletedTask(tree.children[i]);
            isCompletedAll = isCompletedAll && isCompletedList[i];
        }

        if (isCompletedAll) {
            // TODO check whether success
            TaskManager.completed(tree);
            return;
        }

        for (let index_task = 0; index_task < tree.children.length; index_task++) {
            const child = <TaskTree>tree.children[index_task];
            if (TaskManager.isRunTask(child)) {
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

            // solve file relation
            // TODO delete link and copy
            for (let i = 0; i < workflow.file_relations.length; i++) {
                const relation = workflow.file_relations[i];
                if (relation.index_after_task != index_task) {
                    continue;
                }

                const path_src: string = path.resolve(workflow.path, relation.path_output_file);
                const path_dst: string = path.resolve(workflow.path, relation.path_input_file);
                TaskOperator.symLink(path_src, path_dst);
            }
            TaskManager.run(child);
        }
    }

    public static runTask(tree: TaskTree) {
        const task = <SwfTaskJson>tree;

        const exec = child_process.exec;
        let command: string;
        const option: child_process.ExecOptions = {
            cwd: task.path
        };

        if (serverUtility.isLinux()) {
            // TODO test Linux
            command = `sh ${task.script.path}`;
        } else {
            // Windows
            command = task.script.path;
        } 

        exec(command, option, execCallback);

        function execCallback(err: Error, stdout: string, stderr: string) {
            if (err) {
                TaskManager.failed(tree);
                logger.error(`error : ${err}`);
                logger.error(`STDERR : ${stderr}`);
                logger.error(`STDOUT : ${stdout}`);
                logger.error(`command : ${command}`);
                return;
            }

            // TODO check whether success
            TaskManager.completed(tree);
        }
    }

    public static runRemoteTask(tree: TaskTree) {
        const remoteTask = <SwfRemoteTaskJson><SwfTaskJson>tree;

        const client = new ssh2.Client();
        
        // TODO get password from dialog
        const config: ssh2.ConnectConfig = {
            host: remoteTask.host.host,
            port: 22,
            username: remoteTask.host.username,
            password: 'ideasideas'
        };

        const dir_remote = TaskOperator.getDirRemote(remoteTask);
        client.connect(config);
        client.on('ready', readyCallback);

        function readyCallback() {
            TaskOperator.setUpRemote(client, remoteTask, dir_remote, runScript);
        }


        function runScript() {
            let command: string = '';
            command += `cd ${dir_remote}\n`;
            if (remoteTask.script.type == SwfScriptType.BASH || path.extname(remoteTask.script.path) == '.sh') {
                command += `sh ${remoteTask.script.path}\n`;
            } else if (remoteTask.script.type == SwfScriptType.LUA || path.extname(remoteTask.script.path) == '.lua') {
                command += `lua ${remoteTask.script.path}\n`;
            } else {
                // default
                command += `./${remoteTask.script.path}\n`;
            }

            client.exec(command, execCallback);

            function execCallback(err: Error, channel: ssh2.ClientChannel) {
                if (err) {
                    TaskManager.failed(tree);
                    logger.error(`error : ${err}`);
                    logger.error(`working directory : ${remoteTask.host.path}`);
                    logger.error(`command : ${command}`);

                    return;
                }

                channel.on('close', onCloseCallback);
                channel.on('data', onOutCallback);
                channel.stderr.on('data', onErrCallback);

                function onCloseCallback(exitCode: number | null, signalName?: string) {
                    // TODO check whether success
                    TaskManager.completed(tree);

                    //logger.info(`Stream :: close :: code: ${exitCode}, signal: ${signalName}`);
                    client.end();
                }

                function onOutCallback(data) {
                    logger.info(`STDOUT : ${data}`);
                }

                function onErrCallback(data) {
                    TaskManager.failed(tree);
                    logger.error(`ERR ${remoteTask.type} : ${remoteTask.name}`);
                    logger.error(`STDERR : ${data}`);
                }
            }
        }
    }

    public static runJob(tree: TaskTree) {
        const job = <SwfJobJson><SwfTaskJson>tree;

        const client = new ssh2.Client();

        // TODO get password from dialog
        const config: ssh2.ConnectConfig = {
            host: job.host.host,
            port: 22,
            username: job.host.username,
            password: 'ideasideas'
        };

        const dir_remote = TaskOperator.getDirRemote(job);

        client.connect(config);
        client.on('ready', readyCallback);

        function readyCallback() {
            TaskOperator.setUpRemote(client, job, dir_remote, runScript);
        }


        function runScript() {
            let command: string = '';
            command += `cd ${dir_remote}\n`;
            if (job.host.job_scheduler == SwfJobScheduler.TCS) {
                command += `pjsub ${job.script.path}\n`;
            } else if (job.host.job_scheduler == SwfJobScheduler.TORQUE) {
                command += `qsub ${job.script.path}\n`;
            } else {
                // default TCS
                command += `pjsub ${job.script.path}\n`;
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

                let jobId :string = '';
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

                        function getStateCallback(err: Error, channel: ssh2.ClientChannel){
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
                                TaskManager.completed(tree);
                                client.end();
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
            max_size_recieve_file: loop.max_size_recieve_file,
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

    private static symLink(path_src: string, path_dst: string) {
        if (fs.existsSync(path_dst)) {
            fs.unlinkSync(path_dst);
        }

        if (serverUtility.isLinux()) {
            // make symbolic link for relative
            const path_src_relative: string = path.relative(path_dst, path_src);
            fs.symlinkSync(path_src_relative, path_dst);
        } else {
            // Windows cannot mklink for user's authority
            // copy file
            fs.linkSync(path_src, path_dst);
        }
    }

    private static setUpRemote(client: ssh2.Client, remoteTask: SwfRemoteTaskJson, dir_remote:string, callback: () => void) {
        // make working directory
        const command: string = `mkdir -p ${dir_remote}\n`;
        client.exec(command, mkdirCallback);

        function mkdirCallback(err: Error, channel: ssh2.ClientChannel) {
            if (err) {
                logger.error(`error : ${err}`);
                logger.error(`command : ${command}`);
                return;
            }

            // send files
            client.sftp(sftpCallback);
        }

        function sftpCallback(err: Error, sftp: ssh2.SFTPWrapper) {
            if (err) {
                logger.error(err);
                logger.error(`working directory : ${remoteTask.host.path}`);
                return;
            }

            // send necessary files
            let counter = 0;
            const count_files = remoteTask.send_files.length + remoteTask.input_files.length + 1;
            // send send_files
            for (let i = 0; i < remoteTask.send_files.length; i++) {
                const send_file = remoteTask.send_files[i];
                const path_local: string = path.resolve(remoteTask.path, send_file.path);
                const path_remote: string = path.posix.join(dir_remote, send_file.path);
                sftp.fastPut(path_local, path_remote, sendFileCallback);
            }
            // send input_files
            for (let i = 0; i < remoteTask.input_files.length; i++) {
                const send_file = remoteTask.input_files[i];
                const path_local: string = path.resolve(remoteTask.path, send_file.path);
                const path_remote: string = path.posix.join(dir_remote, send_file.path);
                sftp.fastPut(path_local, path_remote, sendFileCallback);
            }
            // send script file
            const path_local: string = path.resolve(remoteTask.path, remoteTask.script.path);
            const path_remote: string = path.posix.join(dir_remote, remoteTask.script.path);
            sftp.fastPut(path_local, path_remote, sendFileCallback);

            function sendFileCallback(err: Error) {
                if (err) {
                    logger.error(`ERR ${remoteTask.type} : ${remoteTask.name}`);
                    logger.error(`error : ${err}`);
                    logger.error(`path_local : ${path_local}`);
                    logger.error(`path_remote : ${path_remote}`);
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
    }

    private static getDirRemote(remoteTask: SwfRemoteTaskJson): string {
        const date = new Date();
        const name_dir_time: string = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
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