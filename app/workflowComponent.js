
/*
 * javascript representation of wheel's task 
 *
 */
class Task{
  constructor(){
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
    this.state='pre runnnig'
  }
}
/*
 * task absrtuct class of task containers 
 */
class BaseTaskGraph{
  constructor(){
    this._type=null;
    this.description=null;
    this.path=null;
    this.nodes=[];
    this.start=[];
    this.inputFiles=[];
    this.outputFiles=[];
    this.cleanupFlag=null;
  }

  /**
   * 指定されたindexの子要素を返します
   */
  getNode(index){
    return this._nodes[index];
  }
}
class Workflow extends BaseTaskGraph{
  constructor(){
    super();
    this._type='workflow';
  }
}
class ParameterStudy extends BaseTaskGraph{
  constructor(){
    super();
    this._type='parameterStudy';
    this.parameters=[];
  }
}

/*
 * control flow classes
 */
class BaseControlFlow{
  constructor(){
    this._type=null;
    this.previous=[];
    this.next=[];
    this.blockStart=null;
  }
}
class Loop extends BaseControlFlow{
  constructor(){
    super();
    this._type='loop';
    this.condition=null;
  }
}
class If extends BaseControlFlow{
  constructor(){
    super();
    this._type='if';
    this.condition=null;
    this.elseBlockStart=null;
  }
}
/*
 * loop over kind of array
 */
class Foreach extends BaseControlFlow{
  constructor(){
    super();
    this._type='foreach';
    this.indexList=[];
  }
}


