/*
 * javascript representation of wheel's task 
 *
 */
class Task{
  constructor(pos){
    this._type='task';
    this.name=null;
    this.description=null;
    /** path for its directory */
    this.path=null;
    /** filename of entry point of this task*/
    this.script=null;
    this.inputFiles=[];
    this.outputFiles=[];
    /** 
     * flag for clean up temporary workspace on remote host
     * 0: do clenup
     * 1: do not clenup
     * 2: same as parent
     */
    this.cleanupFlag=null;
    this.maxSizeCollection=null;
    this.previous=[];
    this.next=[];
    this.host='localhost';
    this.jobScheduler=null;
    this.state='pre runnnig';
    this.x=pos.x;
    this.y=pos.y;
  }
}
/*
 * task absrtuct class of task containers 
 */
class BaseTaskGraph{
  constructor(pos){
    this._type=null;
    this.name=null;
    this.description=null;
    this.path=null;
    this.nodes=[];
    this.start=[];
    this.inputFiles=[];
    this.outputFiles=[];
    this.cleanupFlag=null;
    this.x=pos.x;
    this.y=pos.y;
  }

  /**
   * 指定されたindexの子要素を返します
   */
  getNode(index){
    return this._nodes[index];
  }
}
class Workflow extends BaseTaskGraph{
  constructor(pos){
    // define pseudo position to root workflow
    var pos2=pos || {x:0, y:0};
    super(pos2);
    this._type='workflow';
  }
}
class ParameterStudy extends BaseTaskGraph{
  constructor(pos){
    super(pos);
    this._type='parameterStudy';
    this.parameters=[];
  }
}

/*
 * control flow classes
 */
class BaseControlFlow{
  constructor(pos){
    this._type=null;
    this.name=null;
    this.previous=[];
    this.next=[];
    this.blockStart=null;
    this.x=pos.x;
    this.y=pos.y;
  }
}
class Loop extends BaseControlFlow{
  constructor(pos){
    super(pos);
    this._type='loop';
    this.condition=null;
  }
}
class If extends BaseControlFlow{
  constructor(pos){
    super(pos);
    this._type='if';
    this.condition=null;
    this.elseBlockStart=null;
  }
}
/*
 * loop over kind of array
 */
class Foreach extends BaseControlFlow{
  constructor(pos){
    super(pos);
    this._type='foreach';
    this.indexList=[];
  }
}

module.exports.Task=Task;
module.exports.Workflow=Workflow;
module.exports.ParameterStudy=ParameterStudy;
module.exports.Loop=Loop;
module.exports.If=If;
module.exports.Foreach=Foreach;
