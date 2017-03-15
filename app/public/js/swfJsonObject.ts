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
     * output file path name
     */
    path_output_file: string;
    /**
     * input file path name
     */
    path_input_file: string;
}

// /**
//  * Swf File Relation Json definition
//  */
// interface SwfFileRelationJson extends SwfRelationJson {
//     relations_file: Array<SwfRelationFilesJson>;
// }

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
    children_file: SwfFileJson[];
    relations: SwfRelationJson[];
    file_relations: SwfFileRelationJson[];
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
    index: number;
}

/**
 * Swf Loop Json definition
 */
interface SwfLoopJson extends SwfWorkflowJson {
    forParam: ForParam;
}

/**
 * Swf Host Json definition
 */
interface SwfHostJson {
    name: string;
    description: string;
    path: string;
    host: string;
    job_scheduler: string;
    username: string;
    privateKey?: string;
    pass?: string;
}

/**
 * Swf Remote Task Json definition
 */
interface SwfRemoteTaskJson extends SwfTaskJson {
    host: SwfHostJson;
}

/**
 * Swf Job Json definition
 */
interface SwfJobJson extends SwfRemoteTaskJson {
    job_script: SwfFileJson;
}

/**
 * log json
 */
interface SwfLogJson {
    /**
     * task name
     */
    name: string;
    /**
     *
     */
    description: string;
    /**
     * task state
     * Planing, Running, ReRunning, Waiting, Completed, Failed
     */
    state: string;
    /**
     * path to directory of task
     */
    path: string;
    /**
     * type of task
     * Task, Workflow, RemoteTask, Job
     */
    type: string;
    /**
     *
     */
    execution_start_date: string;
    /**
     *
     */
    execution_end_date: string;
    /**
     *
     */
    host?: SwfHostJson;
    /**
     *
     */
    children: SwfLogJson[]
}

/**
 * "if", "else" or "else if" statement
 */
interface SwfIfJson extends SwfWorkflowJson {
    condition_file: SwfFileJson;
    else_file: SwfFileJson;
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
    parameter_file: SwfFileJson;
}

/**
 * parameter study define
 */
interface SwfPSParameterJson {
    target_file: string,
    target_params: Array<SwfPSAxisJson>;
}

/**
 * parameter study define target_param
 */
interface SwfPSAxisJson {
    keyword: string;
    type: string;
    /**
     * parameter of "for" statement
     */
    min: number | null;
    max: number | null;
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
    name: string;
    description: string;
    state: string;
    path: string;
    path_workflow: string;
    log: SwfLogJson;
}

/**
 * tree json
 */
interface SwfTreeJson extends SwfWorkflowJson {
    children: SwfTreeJson[];
    forParam: ForParam;
    condition: SwfFileJson;
    host: SwfHostJson;
    job_script: SwfFile;
    parameter_file: SwfFile;
    oldPath: string;
    script_param: {
        cores: number;
        nodes: number;
    };
}