/**
 * Swf File Json definition
 */
interface SwfFileJson {
    /**
     * file name
     */
    name: string;
    /**
     * file description
     */
    description: string;
    /**
     * file path
     */
    path: string;
    /**
     * file type
     */
    type: string;
    /**
     * file required flag
     */
    required: boolean;
}

/**
 * Swf Task Json definition
 */
interface SwfTaskJson {
    /**
     * task name
     */
    name: string;
    /**
     * task description
     */
    description: string;
    /**
     * task path
     */
    path: string;
    /**
     * type of task
     * Task, Workflow, RemoteTask, Job
     */
    type: string;
    /**
     * script file
     */
    script: SwfFileJson;
    /**
     * input files
     */
    input_files: SwfFileJson[];
    /**
     * output_files
     */
    output_files: SwfFileJson[];
    /**
     * send files
     */
    send_files: SwfFileJson[];
    /**
     * receive files
     */
    receive_files: SwfFileJson[];
    /**
     * clean up flag
     */
    clean_up: boolean;
    /**
     * max size of rreceive file (kb)
     */
    max_size_receive_file: number;
}

/**
 * Swf Relation Json definition
 */
interface SwfRelationJson {
    /**
     * index of before task
     */
    index_before_task: number;
    /**
     * index of after task
     */
    index_after_task: number;
}

/**
 * Swf Relation files Json definition
 */
interface SwfFileRelationJson extends SwfRelationJson {
    /**
     * befor task index
     */
    index_before_task: number;
    /**
     * output file path name
     */
    path_output_file: string;
    /**
     * after task index
     */
    index_after_task: number;
    /**
     * input file path name
     */
    path_input_file: string;
}

/**
 * Swf Position on 2D
 */
interface Position2D {
    /**
     * x coordinate
     */
    x: number;
    /**
     * y coordinate
     */
    y: number;
}

/**
 * Swf Workflow Json definition
 */
interface SwfWorkflowJson extends SwfTaskJson {
    /**
     * children files
     */
    children_file: SwfFileJson[];
    /**
     * task relations
     */
    relations: SwfRelationJson[];
    /**
     * file relations
     */
    file_relations: SwfFileRelationJson[];
    /**
     * task posistions
     */
    positions: Position2D[];
}

/**
 * parameter of "for" statement
 */
interface ForParam {
    /**
     * start count
     */
    start: number;
    /**
     * end count
     */
    end: number;
    /**
     * step count
     */
    step: number;
}

/**
 * index of loop
 */
interface ForIndex {
    /**
     * index number
     */
    index: number;
}

/**
 * Swf Loop Json definition
 */
interface SwfForJson extends SwfWorkflowJson {
    /**
     * loop parameter
     */
    forParam: ForParam;
}

/**
 * Swf Host Json definition
 */
interface SwfHostJson {
    /**
     * representative name
     */
    name: string;
    /**
     * host description
     */
    description: string;
    /**
     * host path
     */
    path: string;
    /**
     * host name
     */
    host: string;
    /**
     * job sheduler name
     */
    job_scheduler: string;
    /**
     * user name
     */
    username: string;
    /**
     * private key filepath
     */
    privateKey?: string;
    /**
     * password or passphrase
     */
    pass?: string;
}

/**
 * Swf Remote Task Json definition
 */
interface SwfRemoteTaskJson extends SwfTaskJson {
    /**
     * host information
     */
    host: SwfHostJson;
}

/**
 * Swf Job Json definition
 */
interface SwfJobJson extends SwfRemoteTaskJson {
    /**
     * job script file
     */
    job_script: SwfFileJson;
}

/**
 * log json
 */
interface SwfLogJson {
    /**
     * log name
     */
    name: string;
    /**
     * log description
     */
    description: string;
    /**
     * task state ('Planing', 'Running', 'ReRunning', 'Waiting', 'Completed', 'Failed')
     */
    state: string;
    /**
     * path to directory of task
     */
    path: string;
    /**
     * type ('Task', 'Workflow', 'RemoteTask', 'Job', 'If', 'Else', 'Condition', 'Loop', 'Break')
     */
    type: string;
    /**
     * start date of execute task
     */
    execution_start_date: string;
    /**
     * end date of execute task
     */
    execution_end_date: string;
    /**
     * host information
     */
    host?: SwfHostJson;
    /**
     * display order
     */
    order?: number;
    /**
     * child logs
     */
    children: SwfLogJson[]
}

/**
 * "if", "else" or "else if" statement
 */
interface SwfIfJson extends SwfWorkflowJson {
    /**
     * condition file
     */
    condition_file: SwfFileJson;
}

/**
 * "break" statement
 */
interface SwfBreakJson extends SwfTaskJson {
}

/**
 * parameter study
 */
interface SwfPStudyJson extends SwfWorkflowJson {
    /**
     * parameter file
     */
    parameter_file: SwfFileJson;
}

/**
 * parameter study define
 */
interface SwfPSParameterJson {
    /**
     * target file
     */
    target_file: string,
    /**
     * target parameters
     */
    target_params: Array<SwfPSAxisJson>;
}

/**
 * parameter study define target_param
 */
interface SwfPSAxisJson {
    /**
     * keywork
     */
    keyword: string;
    /**
     * type
     */
    type: string;
    /**
     * parameter of "for" statement
     */
    min: number | null;
    /**
     * max number or null
     */
    max: number | null;
    /**
     * step number or null
     */
    step: number | null;
    /**
     * list of value
     */
    list: Array<string> | null;
}

/**
 * project json
 */
interface SwfProjectJson {
    /**
     * project name
     */
    name: string;
    /**
     * project description
     */
    description: string;
    /**
     * project state
     */
    state: string;
    /**
     * project path
     */
    path: string;
    /**
     * root workflow path
     */
    path_workflow: string;
    /**
     * log file
     */
    log?: SwfLogJson;
}

/**
 * script parameter
 */
interface ScriptParams {
    /**
     * cpu core number
     */
    cores: number;
    /**
     * node number
     */
    nodes: number;
}

/**
 * tree json
 */
interface SwfTreeJson extends SwfWorkflowJson {
    /**
     * children tree
     */
    children: SwfTreeJson[];
    /**
     * loop parameter for loop
     */
    forParam: ForParam;
    /**
     * condition parameter for if, else and break
     */
    condition: SwfFileJson;
    /**
     * host information for job and remotetask
     */
    host: SwfHostJson;
    /**
     * job script file for job
     */
    job_script: SwfFile;
    /**
     * parameter file for parameter study
     */
    parameter_file: SwfFile;
    /**
     * script parameter for job
     */
    script_param: ScriptParams;
    /**
     * old path
     */
    oldPath: string;
    /**
     * display order
     */
    order?: number;
}