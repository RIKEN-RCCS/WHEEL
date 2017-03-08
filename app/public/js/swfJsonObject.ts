/**
 * Swf File Json definition
 */
interface SwfFileJson {
    name: string;
    description: string;
    path: string;
    type: string;
    required: boolean;
}

/**
 * Swf Task Json definition
 */
interface SwfTaskJson {
    name: string;
    description: string;
    path: string;
    /**
     * type of task
     * Task, Workflow, RemoteTask, Job
     */
    type: string;
    script: SwfFileJson;
    input_files: SwfFileJson[];
    output_files: SwfFileJson[];
    send_files: SwfFileJson[];
    receive_files: SwfFileJson[];
    clean_up: boolean;
    max_size_recieve_file: number;
}

/**
 * Swf Relation Json definition
 */
interface SwfRelationJson {
    index_before_task: number;
    index_after_task: number;
}

/**
 * Swf Relation files Json definition
 */
interface SwfFileRelationJson extends SwfRelationJson {
    path_output_file: string;
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
    x: number;
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
 * parameter of loop 
 */
interface ForParam {
    start: number;
    end: number;
    step: number;
}

/**
 * index of loop 
 */
interface ForIndex {
    index: number;
}

/**
 *
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
    username: string,
    privateKey?: string
}

// /**
//  * json file definition for remote host list
//  */
// interface SwfHostJsons {
//     hosts: SwfHostJson[];
// }

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
    condition_file: SwfFileJson;
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
    else_file: SwfFileJson;
    host: SwfHostJson;
    job_script: SwfFile;
    oldPath: string;
}
