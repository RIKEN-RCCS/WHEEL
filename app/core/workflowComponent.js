"use strict";
const uuidv1 = require("uuid/v1");

class BaseWorkflowComponent {
  constructor(pos, parent) {
    //parent components's ID
    this.parent = parent || "this is root";

    /**cordinate in workflow editor screen
     * {pos.x: pageX, pos.y: pageY}
     */
    this.pos = pos;

    this.ID = uuidv1();
    this.type = null;
    this.name = null;
    this.description = null;

    /**
     * component state
     * possible value is one of
     *  - 'not-started'
     *  - 'stage-in'   (task only) transfering files to remote host
     *  - 'waiting'    (task only) waiting to run due to job submit number limitation
     *  - 'running'    running
     *  - 'queued'     (task only) submit to batch system
     *  - 'stage-out'  (task only) transfering files from  remote host
     *  - 'finished'   finished
     *  - 'failed'     error occurred before task finish
     *  - 'unknown'    failed to check status (e.g. qstat command failed)
     */
    this.state = "not-started";
  }
}

class Source extends BaseWorkflowComponent {
  constructor(pos, parent) {
    super(pos, parent);
    this.type = "source";
    this.uploadOnDemand = false;
    this.outputFiles = [{ name: "", dst: [] }];
  }
}

class Viewer extends BaseWorkflowComponent {
  constructor(pos, parent) {
    super(pos, parent);
    this.type = "viewer";
    this.inputFiles = [];
  }
}

class GeneralComponent extends BaseWorkflowComponent {
  constructor(pos, parent) {
    super(pos, parent);

    /**pointers to previous component */
    this.previous = [];

    /**pointers to next component */
    this.next = [];

    /**
     * input files from other component
     * each element of inputFiles should be following
     * {
     *   name: "filename or dirname",
     *   src:[
     *   {srcNode: "ID of src node1", srcName: "name in src node1"},
     *   {srcNode: "ID of src node2", srcName: "name in src node2"},
     *   ]
     * }
     */
    this.inputFiles = [];

    /**
     * output files which will be passed to other component
     * each element of outputFiles should be following
     * if name is null or white space, original file name will be used
     * {
     *   name: "filename, dirname or glob pattern",
     *   dst:[
     *     {dstNode: "ID of dst node1", dstName: "name in dst node1"},
     *     {dstNode: "ID of dst node2", dstName: "name in dst node2"}
     *   ]
     * }
     */
    this.outputFiles = [];

    /**
     * flag for clean up temporary working directory on remote host
     * 0: do cleanup
     * 1: do not cleanup
     * 2: same as parent
     */
    this.cleanupFlag = 2;
  }
}

/**
 * javascript representation of wheel's task
 */
class Task extends GeneralComponent {
  constructor(...args) {
    super(...args);
    this.type = "task";

    /**filename of entry point of this task */
    this.script = null;

    /**hostname where this task will execute on */
    this.host = "localhost";

    /**run as batch job or not*/
    this.useJobScheduler = false;

    /**queue name */
    this.queue = null;

    //note on filters
    //if include filter is set, matched files are transferd if it does not match exclude filter
    /**include filter for recieve files from remote host */
    this.include = null;

    /**exclude filter for recieve files from remote host */
    this.exclude = null;
  }
}

/**
 * representation of conditional branch
 */
class If extends GeneralComponent {
  constructor(...args) {
    super(...args);
    this.type = "if";

    /**
     * shell script file name or javascript expression to determin condifion
     * If script returns 0 or expression evaluted to truthy value,
     * next tasks will be executed, otherwise else tasks will be executed
     */
    this.condition = null;

    /**task pointers which will be executed if condition is false */
    this.else = [];
  }
}

class Workflow extends GeneralComponent {
  constructor(pos, ...args) {
    //define pseudo position for root workflow
    const pos2 = pos || { x: 0, y: 0 };
    super(pos2, ...args);
    this.type = "workflow";
  }
}

class ParameterStudy extends GeneralComponent {
  constructor(...args) {
    super(...args);
    this.type = "parameterStudy";
    this.parameterFile = null;
    this.numTotal = null;
    this.numFinished = null;
    this.numFailed = null;
    this.forceOverwrite = false;
  }
}

class For extends GeneralComponent {
  constructor(...args) {
    super(...args);
    this.type = "for";
    this.start = null;
    this.end = null;
    this.step = null;
  }
}

class While extends GeneralComponent {
  constructor(...args) {
    super(...args);
    this.type = "while";
    this.condition = null;
  }
}

/*
 * loop over kind of array
 */
class Foreach extends GeneralComponent {
  constructor(...args) {
    super(...args);
    this.type = "foreach";
    this.indexList = [];
  }
}

/*
 * factory method for workflow component class
 */
function componentFactory(type, ...args) {
  let component;

  switch (type) {
    case "task":
      component = new Task(...args);
      break;
    case "workflow":
      component = new Workflow(...args);
      break;
    case "PS":
      component = new ParameterStudy(...args);
      break;
    case "if":
      component = new If(...args);
      break;
    case "for":
      component = new For(...args);
      break;
    case "while":
      component = new While(...args);
      break;
    case "foreach":
      component = new Foreach(...args);
      break;
    case "source":
      component = new Source(...args);
      break;
    case "viewer":
      component = new Viewer(...args);
      break;
    default:
      component = null;
  }
  return component;
}

function hasChild(component) {
  return component.type === "workflow" || component.type === "parameterStudy" || component.type === "for" || component.type === "while" || component.type === "foreach";
}

function isInitialComponent(component) {
  if (component.type === "source" && component.outputFiles[0].dst.length > 0) {
    return true;
  }
  if (component.type === "viewer") {
    return true;
  }
  if (component.previous.length > 0) {
    return false;
  }

  if (component.inputFiles.length > 0) {
    for (const inputFile of component.inputFiles) {
      const isConnected = inputFile.src.some((e)=>{
        if (e.srcNode === component.parent) {
          return false;
        }
        return e.srcNode !== null;
      });
      if (isConnected) {
        return false;
      }
    }
  }
  return true;
}


module.exports = {
  componentFactory,
  hasChild,
  isInitialComponent
};