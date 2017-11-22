const config = require('../config/server');
class BaseWorkflowComponent {
  constructor(pos, parent){
    this.type=null;
    this.name=null;
    this.description=null;

    /** relative path of its directory */
    this.path=null;

    /** position in parent workflow.nodes[] */
    this.index=null;

    /** pointers to previous node */
    this.previous=[];

    /** pointers to next node */
    this.next=[];

    /**
     * input files from other node
     * each element of inputFiles should be following
     * {
     *   name: "filename, dirname or regex",
     *   srcNode: "index of src node",
     *   srcName: "name in src node"
     * }
     */
    this.inputFiles=[];

    /**
     * output files which will be passed to other node
     * each element of outputFiles should be following
     * if name is null or white space, original file name will be used
     * {
     *   name: "filename, dirname or regex",
     *   dst:[
     *     {dstNode: "index of dst node1", dstName: "name in dst node1"},
     *     {dstNode: "index of dst node2", dstName: "name in dst node2"}
     *   ]
     * }
     */
    this.outputFiles=[];

    /**
     * flag for clean up temporary working directory on remote host
     * 0: do clenup
     * 1: do not clenup
     * 2: same as parent
     */
    this.cleanupFlag=null;

    /** cordinate in workflow editor screen
     * {pos.x: pageX, pos.y: pageY}
     */
    this.pos=pos;

    /**
     * parent node
     */
    this.parent=parent;
  }
}

/*
 * absrtuct class of workflow graph
 */
class BaseTaskGraph extends BaseWorkflowComponent{
  constructor(pos, parent){
    super(pos, parent);
    this.nodes=[];
    this.jsonFile=null;
  }
}

/**
 * javascript representation of wheel's task
 */
class Task extends BaseWorkflowComponent{
  constructor(pos, parent){
    super(pos, parent);
    this.type='task';
    /** filename of entry point of this task */
    this.script=null;
    /** hostname where this task will execute on */
    this.host='localhost';
    /** */
    this.jobScheduler=null;
    /**
     * task state
     * possible value is one of
     *  - 'not-started'
     *  - 'stage-in'   transfering files to remote host
     *  - 'waiting'    waiting to run due to job submit number limitation
     *  - 'running'    running
     *  - 'queued'     submit to batch system
     *  - 'stage-out'  transfering files from  remote host
     *  - 'finished'   finished
     *  - 'failed'     error occurred before task finish
     */
    this.state='not-started';

    // note on filters
    // if include filter is set, matched files are transferd whther it also match exclude filter
    /**
     * include filter for recieve files from remote host
     */
    this.include=null;

    /**
     * exclude filter for recieve files from remote host
     */
    this.exclude=null;

  }
}

/**
 * representation of conditional branch
 */
class If extends BaseWorkflowComponent{
  constructor(pos){
    super(pos);
    this.type='if';
    /**
     * shell script file name or javascript expression to determin condifion
     * If script returns 0 or expression evaluted to truthy value,
     * next tasks will be executed, otherwise else tasks will be executed
     */
    this.condition=null;

    /** task pointers which will be executed if condition is false */
    this.else=[];
  }
}

class Workflow extends BaseTaskGraph{
  constructor(pos, parent){
    // define pseudo position for root workflow
    var pos2=pos || {x:0, y:0};
    super(pos2, parent);
    this.jsonFile= `${config.default_filename}${config.extension.workflow}`;
    this.type='workflow';
  }
}
class ParameterStudy extends BaseTaskGraph{
  constructor(...args){
    super(...args);
    this.type='parameterStudy';
    this.jsonFile= `${config.default_filename}${config.extension.pstudy}`;
    this.parameterFile=null;
  }
}

class For extends BaseTaskGraph{
  constructor(...args){
    super(...args);
    this.type='for';
    this.jsonFile= `${config.default_filename}${config.extension.for}`;
    this.start=null;
    this.end=null;
    this.step=null;
  }
}
class While extends BaseTaskGraph{
  constructor(...args){
    super(...args);
    this.type='while';
    this.jsonFile= `${config.default_filename}${config.extension.while}`;
    this.condition=null;
  }
}
/*
 * loop over kind of array
 */
class Foreach extends BaseTaskGraph{
  constructor(pos){
    super(pos);
    this.type='foreach';
    this.jsonFile= `${config.default_filename}${config.extension.foreach}`;
    this.indexList=[];
  }
}

/*
 * factory method for workflow component class
 */
function factory(type, ...args){
  var node=null;
  switch(type){
    case 'task':
      node=new Task(...args);
      break;
    case 'workflow':
      node=new Workflow(...args);
      break;
    case 'PS':
      node=new ParameterStudy(...args);
      break;
    case 'if':
      node=new If(...args);
      break;
    case 'for':
      node=new For(...args);
      break;
    case 'while':
      node=new While(...args);
      break;
    case 'foreach':
      node=new Foreach(...args);
      break;
  }
  return node;
}

module.exports.factory=factory;
