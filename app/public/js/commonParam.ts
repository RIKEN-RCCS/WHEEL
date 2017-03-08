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
        break: '.brk.json'
    },
    default_filename: 'define',
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
        task: 'orangered',
        remotetask: 'coral',
        job: 'gold',
        workflow: 'royalblue',
        loop: 'skyblue',
        break: 'pink',
        condition: 'violet',
        if: 'springgreen',
        else: 'forestgreen'
    },
    state_color: {
        planning: 'white',
        running: 'cyan',
        rerunning: 'orange',
        waiting: 'yellow',
        completed: 'green',
        failed: 'red'
    },
    plug_color: {
        file: 'cyan',
        files: 'magenta',
        directory: 'yellow',
        flow: 'orange'
    }
};