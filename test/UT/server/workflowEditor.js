const path = require("path");
const fs = require("fs-extra");
const {projectJsonFilename, componentJsonFilename} = require("../../../app/db/db");
const componentFactory = require("../../../app/routes/workflowComponent");
const project  = require("../../../app/routes/project");

// setup test framework
const chai = require("chai");
const expect = chai.expect;
const sinon = require("sinon");
chai.use(require("sinon-chai"));
chai.use(require('chai-fs'));
chai.use(require('chai-json-schema'));
const rewire = require("rewire");

//testee
const workflowEditor = rewire("../../../app/routes/workflowEditor2");
const onWorkflowRequest           = workflowEditor.__get__("onWorkflowRequest");
const onCreateNode                = workflowEditor.__get__("onCreateNode");
const onUpdateNode                = workflowEditor.__get__("onUpdateNode");
const onRemoveNode                = workflowEditor.__get__("onRemoveNode");
const onAddInputFile              = workflowEditor.__get__("onAddInputFile");
const onAddOutputFile             = workflowEditor.__get__("onAddOutputFile");

const onRemoveInputFile           = workflowEditor.__get__("onRemoveInputFile");
const onRemoveOutputFile          = workflowEditor.__get__("onRemoveOutputFile");
const onRenameInputFile           = workflowEditor.__get__("onRenameInputFile");
const onRenameOutputFile          = workflowEditor.__get__("onRenameOutputFile");
const onAddLink                   = workflowEditor.__get__("onAddLink");
const onRemoveLink                = workflowEditor.__get__("onRemoveLink");
const onAddFileLink               = workflowEditor.__get__("onAddFileLink");
const onRemoveFileLink            = workflowEditor.__get__("onRemoveFileLink");

//test data
const testDirRoot = "WHEEL_TEST_TMP"
//stubs
const emit = sinon.stub();
const cb = sinon.stub();
// workflowEditor.__set__("logger", {error: console.log, warn: console.log, info: console.log, debug: console.log});//send all log to console
workflowEditor.__set__("logger", {error: console.log, warn: ()=>{}, info: ()=>{}, debug: ()=>{}});//show error message
//workflowEditor.__set__("logger", {error: ()=>{}, warn: ()=>{}, info: ()=>{}, debug: ()=>{}}); //default logger stub
workflowEditor.__set__("gitAdd", ()=>{});

describe("workflow editor UT", function(){
  let ID;
  const projectRootDir = path.resolve(testDirRoot, "testProject.wheel");
  beforeEach(async function(){
    cb.reset();
    emit.reset();

    /*
     * create dummy project
     *
     * test workflow
     * root-+-task0
     *      +-foreach0          <-- no children !!
     *      +-wf1----+---task1
     *               +---wf2------task2
     */

    const projectJson ={
      "name": "Project name",
      "description": "dummy project.",
      "state": "not-started",
      "root" : path.resolve(testDirRoot),
      "ctime": "not used for this test",
      "mtime": "not used for this test",
      "componentPath":{}
    }

    const rootWf = componentFactory("workflow");
    const task0 = componentFactory("task", {x:0, y:0}, rootWf.ID);
    const wf1 = componentFactory("workflow", {x:1, y:1},  rootWf.ID);
    const foreach0 = componentFactory("foreach", {x:1, y:1},  rootWf.ID);
    const task1= componentFactory("task", {x:2, y:2},  wf1.ID);
    const wf2 = componentFactory("workflow", {x:3, y:3},  wf1.ID);
    const task2 = componentFactory("task", {x:4, y:4},  wf2.ID);

    ID={
      root: rootWf.ID,
      wf1: wf1.ID,
      wf2: wf2.ID,
      foreach0: foreach0.ID,
      task0: task0.ID,
      task1: task1.ID,
      task2: task2.ID
    };

    task0.name = "task0";
    wf1.name="wf1";
    task1.name="task1";
    wf2.name="wf2";
    task2.name="task2";
    foreach0.name="foreach0";

    task0.next.push(ID.wf1);
    wf1.next.push(ID.foreach0);
    wf1.previous.push(ID.task0);
    foreach0.previous.push(ID.task0);
    task0.outputFiles.push({name: "foo", dst:[{dstNode: ID.wf1, dstName: "bar"}, {dstNode: ID.task1, dstName: "baz", transit: ID.wf1}]});
    wf1.outputFiles.push({name: "hoge", dst:[{dstNode: ID.foreach0, dstName: "hoge"}]});
    wf1.inputFiles.push({name: "bar", src:[{srcNode: ID.task0, srcName: "foo"}]});
    task1.inputFiles.push({name: "baz", src:[{srcNode: ID.task0, srcName: "foo"}]});
    foreach0.inputFiles.push({name: "hoge", src:[{srcNode: ID.wf1, srcName: "hoge"}]});

    projectJson.componentPath[rootWf.ID]="./";
    projectJson.componentPath[task0.ID]="./task0";
    projectJson.componentPath[foreach0.ID]="./foreach0";
    projectJson.componentPath[wf1.ID]="./wf1";
    projectJson.componentPath[task1.ID]="./wf1/task1";
    projectJson.componentPath[wf2.ID]="./wf1/wf2";
    projectJson.componentPath[task2.ID]="./wf1/wf2/task2";

    await Promise.all([
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", projectJsonFilename), projectJson, {spaces: 4}),
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", componentJsonFilename), rootWf, {spaces: 4}),
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", "task0", componentJsonFilename), task0, {spaces: 4}),
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", "foreach0", componentJsonFilename), foreach0, {spaces: 4}),
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", "wf1", componentJsonFilename), wf1, {spaces: 4}),
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", "wf1", "task1", componentJsonFilename), task1, {spaces: 4}),
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", "wf1", "wf2", componentJsonFilename), wf2, {spaces: 4}),
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", "wf1", "wf2", "task2",componentJsonFilename), task2, {spaces: 4})
    ]);
    await project.setCwf(projectRootDir, path.join(projectRootDir, componentJsonFilename));
  });
  afterEach(async function(){
    await fs.remove(testDirRoot);
  });
  describe("#onWorkflowRequest", function(){
    it("should send root, child, and grandson json data", async function(){
      await onWorkflowRequest(emit, projectRootDir, ID.root, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      const emitted = emit.args[0][1];
      expect(emitted.ID).to.equal(ID.root);
      expect(emitted.descendants).to.have.lengthOf(3);
      expect(emitted.descendants[0].parent).to.equal(ID.root);
      expect(emitted.descendants[1].parent).to.equal(ID.root);
      expect(emitted.descendants[2].parent).to.equal(ID.root);
      for(const child of emitted.descendants){
        if(child.ID === ID.wf1){
          expect(child.descendants).to.have.lengthOf(2);
          expect(Object.keys(child.descendants[0])).to.have.members(["pos", "type"]);
          expect(Object.keys(child.descendants[1])).to.have.members(["pos", "type"]);
        }else if(child.ID === ID.foreach0){
          expect(child.descendants).to.be.an('array').and.empty;
        }
      }
    });
    it("should send wf1, child, and grandson json data", async function(){
      await onWorkflowRequest(emit, projectRootDir, ID.wf1, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      const emitted = emit.args[0][1];
      expect(emitted.ID).to.equal(ID.wf1);
      expect(emitted.descendants).to.have.lengthOf(2);
      expect(emitted.descendants[0].parent).to.equal(ID.wf1);
      expect(emitted.descendants[1].parent).to.equal(ID.wf1);
      for(const child of emitted.descendants){
        if(child.type === "workflow"){
          expect(child.descendants).to.have.lengthOf(1);
          expect(Object.keys(child.descendants[0])).to.have.members(["pos", "type"]);
        }
      }
    });
  });
  describe("#onCreateNode", function(){
    it("should create new node under wf1", async function(){
      await onCreateNode(emit, projectRootDir, {type: "task", pos: {x: 10, y: 10}}, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      const emitted = emit.args[0][1];
      expect(emitted.descendants).to.have.lengthOf(4);
      expect(path.join(projectRootDir, "task1")).to.be.a.directory().with.contents([componentJsonFilename]);
      expect(path.join(projectRootDir, "task1", componentJsonFilename)).to.be.a.file().with.json.using.schema({
        required : ["name"],
        properties: {
          name : {
            type: "string",
            pattern: "task1"
          }
        }
      });
    });
  });
  describe("#onUpdateNode", function(){
    it("should rename node", async function(){
      await onUpdateNode(emit, projectRootDir, ID.wf1, "name", "wf4", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      expect(path.join(projectRootDir, "wf1")).not.to.be.path();
      expect(path.join(projectRootDir, "wf4")).to.be.directory().with.contents(["wf2", "task1", componentJsonFilename]);
    });
    it("should update task1's script property", async function(){
      await onUpdateNode(emit, projectRootDir, ID.task0, "script", "run.sh", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      const emitted = emit.args[0][1];
      const task0 = emitted.descendants.find((e)=>{
        return e.ID === ID.task0;
      });
      expect(task0.script).to.equal("run.sh");
      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
        required : ["script"],
        properties: {
          script: {
            type: "string",
            pattern: "run.sh"
          }
        }
      });
    });
    it("should update foreach's indexList property", async function(){
      await onUpdateNode(emit, projectRootDir, ID.foreach0, "indexList", ["foo", "bar", "baz"], cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      const emitted = emit.args[0][1];
      const foreach0 = emitted.descendants.find((e)=>{
        return e.ID === ID.foreach0;
      });
      expect(foreach0.indexList).to.have.members(["foo", "bar", "baz"]);
      expect(path.join(projectRootDir, "foreach0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
        required : ["indexList"],
        properties: {
          indexList: {
            type: "array",
            items: [
              {type: "string", pattern: "foo"},
              {type: "string", pattern: "bar"},
              {type: "string", pattern: "baz"}
            ]
          }
        }
      });
    });
    it("should not rename root workflow", async function(){
      await onUpdateNode(emit, projectRootDir, ID.root, "name", "hoge", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(false);
      expect(emit).not.to.have.been.called;
      expect(path.join(projectRootDir)).to.be.a.directory().with.contents(["task0", "wf1", "foreach0", projectJsonFilename, componentJsonFilename]);
    });
    it("should not update inputFiles", async function(){
      await onUpdateNode(emit, projectRootDir, ID.task0, "inputFiles", "hoge", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(false);
      expect(emit).not.to.have.been.called;
    });
    it("should not update outputFiles", async function(){
      await onUpdateNode(emit, projectRootDir, ID.task0, "outputFiles", "hoge", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(false);
      expect(emit).not.to.have.been.called;
    });
  });
  describe("#onRemoveNode", function(){
    it("should remove wf1 and its descendants", async function(){
      await onRemoveNode(emit, projectRootDir, ID.wf1, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      expect(emit.args[0][1]).to.be.jsonSchema({
        properties: {
          descendants: {
            type: "array",
            minItems: 2,
            maxItems: 2
          }
        },
        required: ["descendants"]
      });
      expect(path.join(projectRootDir, "wf1")).not.to.be.path();
      expect(path.join(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
        properties:{
          componentPath: {
            type: "object",
            minProperties: 3,
            maxProperties: 3
          }
        },
        required: ["componentPath"]
      });
      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
        properties: {
          outputFiles:{
            type: "array",
            items: [
              {
                type: "object",
                properties: {
                  "name" :{
                    type: "string",
                    pattern: "foo"
                  },
                  "dst":{
                    type: "array",
                    minItems: 0,
                    maxItems: 0
                  },
                  required: ["name", "dst"]
                }
              }
            ],
            additionalItems: false
          },
          required: ["outputFiles"]
        }
      });
      expect(path.join(projectRootDir, "foreach0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
        properties: {
          inputFiles:{
            type: "array",
            items: [
              {
                type: "object",
                properties: {
                  "name" :{
                    type: "null"
                  },
                  "src":{
                    type: "array",
                    minItems: 0,
                    maxItems: 0
                  },
                  required: ["name", "src"]
                }
              },
              {
                type: "object",
                properties: {
                  "name" :{
                    type: "string",
                    pattern: "hoge"
                  },
                  "src":{
                    type: "array",
                    minItems: 0,
                    maxItems: 0
                  },
                  required: ["name", "src"]
                }
              }
            ],
            additionalItems: false
          },
          required: ["inputFiles"]
        }
      });
    });
  });

  describe("#onAddInputFile", function(){
    it("should add not connected inputFile entry to wf1", async function(){
      await onAddInputFile(emit, projectRootDir, ID.wf1, "piyo", cb);
      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema({
        properties: {
          outputFiles:{
            type: "array",
            items: [
              {
                type: "object",
                properties:{
                  name: {
                    type: "null",
                  },
                  "src":{
                    type: "array",
                    minItems: 0,
                    maxItems: 0
                  }
                },
                required: ["name", "dst"]
              },
              {
                type: "object",
                properties: {
                  "name" :{
                    type: "string",
                    pattern: "hoge"
                  },
                  "dst":{
                    type: "array",
                    minItems: 1,
                    maxItems: 1
                  },
                  required: ["name", "dst"]
                }
              }
            ],
            additionalItems: false
          },
          inputFiles:{
            type: "array",
            items:[
              {
                type: "object",
                properties:{
                  name: {
                    type: "null",
                  },
                  "src":{
                    type: "array",
                    minItems: 0,
                    maxItems: 0
                  }
                },
                required: ["name", "src"]
              },
              {
                type: "object",
                properties:{
                  name: {
                    type: "string",
                    pattern: "bar"
                  },
                  "src":{
                    type: "array",
                    minItems: 1,
                    maxItems: 1
                  }
                },
                required: ["name", "src"]
              },
              {
                type: "object",
                properties:{
                  name: {
                    type: "string",
                    pattern: "piyo"
                  },
                  "src":{
                    type: "array",
                    minItems: 0,
                    maxItems: 0
                  }
                },
                required: ["name", "src"]
              }
            ]
          },
          required: ["outputFiles", "inputFiles"]
        }
      });
    });
  });
  describe("#onAddOutputFile", function(){
    it("should  add not connected outputFile entry to wf1", async function(){
      await onAddOutputFile(emit, projectRootDir, ID.wf1, "piyo", cb);
      //TODO 続きのテストを書く
    });
  });
  describe("#onRemoveInputFile", function(){
    it("should remove inputfile entry from wf1", async function(){
    });
  });
  describe("#onRemoveOutputFile", function(){
    it("should remove outputfile entry from wf1", async function(){
    });
  });
  describe("#onRenameInputFile", function(){
    it("should rename inputFile entry of wf1", async function(){
    });
  });
  describe("#onRenameOutputFile", function(){
    it("should rename outputFile entry of wf1", async function(){
    });
  });
  describe("#onAddLink", function(){
    it("should add new link from task0 to foreach0", async function(){
    });
  });
  describe("#onRemoveLink", function(){
    it("should remove link from task0 to wf1", async function(){
    });
  });
  describe("#onAddFileLink", function(){
    it("should add new file link from task0 to foreach0", async function(){
    });
  });
  describe("#onRemoveFileLink", function(){
    it("should remove file link from task0 to wf1", async function(){
    });
  });
});
