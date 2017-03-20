/**
 * config parameter
 */
var config = {
    extension: {
        project: '.prj.json',
        workflow: '.wf.json',
        task: '.tsk.json',
        remotetask: '.rtsk.json',
        job: '.jb.json',
        tree: '.tree.json',
        loop: '.lp.json',
        if: '.if.json',
        else: '.els.json',
        condition: '.cnd.json',
        break: '.brk.json',
        pstudy: '.ps.json'
    },
    default_filename: 'define',
    submit_script: 'submit.sh',
    system_name: 'swf',
    file_types: {
        file: 'file',
        files: 'files',
        directory: 'directory'
    },
    json_types: {
        task: 'Task',
        workflow: 'Workflow',
        remotetask: 'RemoteTask',
        job: 'Job',
        loop: 'Loop',
        if: 'If',
        else: 'Else',
        condition: 'Condition',
        break: 'Break',
        pstudy: 'PStudy'
    },
    node_color: {
        task: '#FF0000',
        remotetask: '#FF6600',
        job: '#FFCC00',
        workflow: '#0066FF',
        loop: '#0000FF',
        break: '#00FFCC',
        condition: 'violet',
        if: '#00FF66',
        else: '#00FF00',
        pstudy: '#6600FF'
    },
    state_color: {
        planning: 'white',
        running: 'cyan',
        rerunning: 'orange',
        waiting: 'yellow',
        completed: '#00ff00',
        failed: 'red'
    },
    plug_color: {
        file: 'cyan',
        files: 'magenta',
        directory: 'yellow',
        flow: 'orange'
    },
    scheduler: {
        TCS: 'TCS',
        TORQUE: 'TORQUE'
    },
    state: {
        planning: 'Planning',
        running: 'Running',
        rerunning: 'ReRunning',
        waiting: 'Waiting',
        completed: 'Completed',
        failed: 'Failed'
    },
    reload_project_ms: 2000
};
//# sourceMappingURL=commonParam.js.map