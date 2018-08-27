const path = require("path");
const fs = require("fs-extra");
const {projectJsonFilename, componentJsonFilename} = require("../../../app/db/db");
const componentFactory = require("../../../app/routes/workflowComponent");
const {getComponentDir} = require("../../../app/routes/workflowUtil");
const getSchema = require("../../../app/routes/workflowComponentSchemas");
const {setCwd} = require("../../../app/routes/projectResource");

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
workflowEditor.__set__("logger", {error: ()=>{}, warn: ()=>{}, info: ()=>{}, debug: ()=>{}}); //default logger stub
//workflowEditor.__set__("logger", {error: console.log, warn: ()=>{}, info: ()=>{}, debug: ()=>{}});//show error message
//workflowEditor.__set__("logger", {error: console.log, warn: console.log, info: console.log, debug: console.log});//send all log to console
workflowEditor.__set__("gitAdd", ()=>{});

const grandsonSchema={
  type: "array",
  items:{
    required: ["pos", "type"],
    properties:{
      type : {enum: ["task", "if", "workflow", "parameterStudy", "for", "while", "foreach"]},
      pos: getSchema("pos")
    }
  }
}

describe("workflow editor UT", function(){
  let components;
  let wf1Schema;
  let task0Schema;
  let foreach0Schema;
  let rootSchema;
  const projectRootDir = path.resolve(testDirRoot, "testProject.wheel");
  beforeEach(async function(){
    cb.reset();
    emit.reset();

    /*
     * create dummy project
     *
     * root--+--task0
     *       +--wf1----+---task1
     *       |         +---wf2------task2
     *       +--foreach0 <-- no children !!
     *
     * dependency:
     *  - task0 -> wf1
     *  - wf1 -> foreach0
     *
     * file dependency:
     *  - task0(foo) -> wf1(bar)
     *  - wf1(hoge) -> foreach0(hoge)
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

    rootWf.name ="root"
    task0.name = "task0";
    wf1.name="wf1";
    task1.name="task1";
    wf2.name="wf2";
    task2.name="task2";
    foreach0.name="foreach0";

    task0.next.push(wf1.ID);
    wf1.previous.push(task0.ID);
    wf1.next.push(foreach0.ID);
    foreach0.previous.push(wf1.ID);

    task0.outputFiles.push({name: "foo", dst:[{dstNode: wf1.ID, dstName: "bar"}]});
    wf1.outputFiles.push({name: "hoge", dst:[{dstNode: foreach0.ID, dstName: "hoge"}]});
    wf1.inputFiles.push({name: "bar", src:[{srcNode: task0.ID, srcName: "foo"}]});
    task1.inputFiles.push({name: "baz", src:[{srcNode: task0.ID, srcName: "foo"}]});
    foreach0.inputFiles.push({name: "hoge", src:[{srcNode: wf1.ID, srcName: "hoge"}]});

    components={
      root: rootWf,
      wf1: wf1,
      wf2: wf2,
      foreach0: foreach0,
      task0: task0,
      task1: task1,
      task2: task2
    }

    wf1Schema = getSchema("workflow");
    wf1Schema.properties.name = { enum:["wf1"]};
    wf1Schema.properties.ID = {enum: [components.wf1.ID]};
    wf1Schema.properties.parent = {enum: [components.root.ID]};
    wf1Schema.properties.next.items = [{enum:[components.foreach0.ID]}];
    wf1Schema.properties.next.minItems=1;
    wf1Schema.properties.next.maxItems=1;
    wf1Schema.properties.previous.items = [{enum:[components.task0.ID]}];
    wf1Schema.properties.previous.minItems=1;
    wf1Schema.properties.previous.maxItems=1;
    wf1Schema.properties.inputFiles.items = [
      {
        properties:{
          name: {enum: ["bar"]},
          src: {
            type: "array",
            items:[
              {
                properties:
                {
                  srcNode: {enum:[components.task0.ID]},
                  srcName: {enum:["foo"]}
                }
              }
            ],
            additionalItems: false
          }
        }
      }
    ];
    wf1Schema.properties.inputFiles.minItems=1;
    wf1Schema.properties.inputFiles.maxItems=1;
    wf1Schema.properties.outputFiles.items = [
      {
        properties:{
          name: {enum: ["hoge"]},
          dst: {
            type: "array",
            items:[
              {
                properties:
                {
                  dstNode: {enum:[components.foreach0.ID]},
                  dstName: {enum:["hoge"]}
                }
              }
            ],
            additionalItems: false
          }
        }
      }
    ];
    wf1Schema.properties.outputFiles.minItems=1;
    wf1Schema.properties.outputFiles.maxItems=1;

    task0Schema = getSchema("task");
    task0Schema.properties.name = { enum:["task0"]};
    task0Schema.properties.ID = {enum: [components.task0.ID]};
    task0Schema.properties.parent = {enum: [components.root.ID]};
    task0Schema.properties.next.items = [{enum:[components.wf1.ID]}];
    task0Schema.properties.next.minItems = 1;
    task0Schema.properties.next.maxItems = 1;
    task0Schema.properties.outputFiles.items = [
      {
        properties:{
          name: {enum: ["foo"]},
          dst: {
            type: "array",
            items:[
              {
                properties:
                {
                  dstNode: {enum:[components.wf1.ID]},
                  dstName: {enum:["bar"]}
                }
              }
            ],
            additionalItems: false
          }
        }
      }
    ];
    task0Schema.properties.outputFiles.minItems = 1;
    task0Schema.properties.outputFiles.maxItems = 1;

    foreach0Schema = getSchema("foreach");
    foreach0Schema.properties.name = { enum:["foreach0"]};
    foreach0Schema.properties.ID = {enum: [components.foreach0.ID]};
    foreach0Schema.properties.parent = {enum: [components.root.ID]};
    foreach0Schema.properties.previous.items= [{enum: [components.wf1.ID]}];
    foreach0Schema.properties.previous.minItems = 1;
    foreach0Schema.properties.previous.maxItems = 1;
    foreach0Schema.properties.inputFiles.items=[
      {
        properties:{
          name: {enum:["hoge"]},
          src:{
            type: "array",
            items:[
              {
                properties:{
                  srcNode: {enum:[components.wf1.ID]},
                  srcName: {enum:["hoge"]}
                }
              }
            ]
          }
        }
      }
    ];
    foreach0Schema.properties.inputFiles.minItems = 1;
    foreach0Schema.properties.inputFiles.maxItems = 1;

    rootSchema = getSchema("workflow");
    rootSchema.properties.ID = {enum: [components.root.ID]};
    rootSchema.required.push("descendants");
    rootSchema.properties.descendants={
      type: "array",
      items: [
        foreach0Schema,
        task0Schema,
        wf1Schema
      ],
      minItems: 3,
      maxItems: 3
    }

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
    setCwd(projectRootDir, projectRootDir);
  });
  afterEach(async function(){
    await fs.remove(testDirRoot);
  });

  describe("#onWorkflowRequest", function(){
    it("should send root, child, and grandson json data", async function(){
      await onWorkflowRequest(emit, projectRootDir, components.root.ID, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      grandsonSchema.minLength=2;
      grandsonSchema.maxLength=2;
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
    it("should send wf1, child, and grandson json data", async function(){
      setCwd(projectRootDir, path.join(projectRootDir, "wf1"));
      await onWorkflowRequest(emit, projectRootDir, components.wf1.ID, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      grandsonSchema.minLength=1;
      grandsonSchema.maxLength=1;
      expect(emit.args[0][1]).to.jsonSchema({
        properties: {
          ID: {enum: [components.wf1.ID]},
          descendants:{
            type: "array",
            items:{
              properties:{
                parent: {enum:[ components.wf1.ID]},
                ID:{enum:[components.task1.ID, components.wf2.ID]},
                descendants: grandsonSchema
              },
              required:["parent","ID"]
            },
            minLength: 2,
            maxLength: 2
          }
        },
        required: ["ID", "descendants"]
      });
    });
  });
  describe("#onCreateNode", function(){
    it("should create new node under wf1", async function(){
      setCwd(projectRootDir, path.join(projectRootDir, "wf1"));
      await onCreateNode(emit, projectRootDir, {type: "task", pos: {x: 10, y: 10}}, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      expect(emit.args[0][1]).to.jsonSchema({
        properties:{
          descendants:{
            type: "array",
            items:{
              properties:{
                parent: {enum: [components.wf1.ID]},
                name: {enum:["task0","task1","wf2"]}
              }
            }
          }
        },
        required:["descendants"]
      });
      const task0= getSchema("task");
      task0.properties.name = { enum:["task0"]};
      task0.properties.parent = {enum: [components.wf1.ID]};
      expect(path.join(projectRootDir, "wf1","task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0);
    });
  });
  describe("#onUpdateNode", function(){
    it("should rename wf1 to wf4", async function(){
      await onUpdateNode(emit, projectRootDir, components.wf1.ID, "name", "wf4", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      wf1Schema.properties.name = { enum:["wf4"]};
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
      expect(path.join(projectRootDir, "wf1")).not.to.be.path();
      expect(path.join(projectRootDir, "wf4")).to.be.directory().with.contents(["wf2", "task1", componentJsonFilename]);
      expect(path.join(projectRootDir, "wf4", componentJsonFilename)).to.be.file().with.json.using.schema(wf1Schema);
      expect(await getComponentDir(projectRootDir,components.wf1.ID)).to.equal(path.resolve(projectRootDir, "wf4"));
    });
    it("should update task0's script property", async function(){
      await onUpdateNode(emit, projectRootDir, components.task0.ID, "script", "run.sh", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      task0Schema.properties.script={enum:["run.sh"]};
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);
    });
    it("should update foreach's indexList property", async function(){
      await onUpdateNode(emit, projectRootDir, components.foreach0.ID, "indexList", ["foo", "bar", "baz"], cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
      foreach0Schema.properties.indexList={
        type: "array",
        items:[
          {enum: ["foo"]},
          {enum: ["bar"]},
          {enum: ["baz"]}
        ],
        additionalItems: false
      }
      expect(path.join(projectRootDir, "foreach0", componentJsonFilename)).to.be.a.file().with.json.using.schema(foreach0Schema);
    });
    it("should not rename root workflow", async function(){
      await onUpdateNode(emit, projectRootDir, components.root.ID, "name", "hoge", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(false);
      expect(emit).not.to.have.been.called;
      expect(path.join(projectRootDir)).to.be.a.directory().with.contents(["task0", "wf1", "foreach0", projectJsonFilename, componentJsonFilename]);
    });
    it("should not update inputFiles", async function(){
      await onUpdateNode(emit, projectRootDir, components.task0.ID, "inputFiles", "hoge", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(false);
      expect(emit).not.to.have.been.called;
    });
    it("should not update outputFiles", async function(){
      await onUpdateNode(emit, projectRootDir, components.task0.ID, "outputFiles", "hoge", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(false);
      expect(emit).not.to.have.been.called;
    });
  });
  describe("#onRemoveNode", function(){
    it("should remove wf1 and its descendants", async function(){
      await onRemoveNode(emit, projectRootDir, components.wf1.ID, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");

      // wf1's entry in task0 and foreac0 should be removed
      task0Schema.properties.outputFiles={
        type: "array",
        items: [
          {
            properties: {
              "name" :{ enum: ["foo"]},
              "dst":{type: "array", minItems: 0, maxItems: 0},
              required: ["name", "dst"]
            }
          }
        ],
        minItems: 1,
        maxItems: 1
      };
      task0Schema.properties.next={type: "array", minItems: 0, maxItems: 0};
      foreach0Schema.inputFiles ={
        type: "array",
        items: [
          {
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
        minItems: 1,
        maxItems: 1
      };
      foreach0Schema.properties.previous={type: "array", minItems: 0, maxItems: 0};

      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);
      expect(path.join(projectRootDir, "foreach0", componentJsonFilename)).to.be.a.file().with.json.using.schema(foreach0Schema);

      rootSchema.properties.descendants.items =rootSchema.properties.descendants.items.filter((e)=>{
        return e.properties.ID.enum[0] !== components.wf1.ID;
      });
      rootSchema.properties.descendants.minItems = 2;
      rootSchema.properties.descendants.maxItems = 2;
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);

      expect(path.join(projectRootDir, "wf1")).not.to.be.path();

      // check componentPath in projectJson
      expect(path.join(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
        properties:{
          componentPath: {
            patternProperties: {
              "^.*$": {type: "string", pattern: "^(?!.*wf1).*$"}
            },
            minProperties: 3,
            maxProperties: 3
          }
        },
        required: ["componentPath"]
      });

    });
  });
  describe("#onAddInputFile", function(){
    it("should add not connected inputFile entry to wf1", async function(){
      await onAddInputFile(emit, projectRootDir, components.wf1.ID, "piyo", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");

      wf1Schema.properties.inputFiles.items.push({
        properties:{
          name: {enum:["piyo"]},
          src: {type: "array", maxItems:0}
        }
      });
      wf1Schema.properties.inputFiles.minItems=2;
      wf1Schema.properties.inputFiles.maxItems=2;
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);
    });
  });
  describe("#onAddOutputFile", function(){
    it("should  add not connected outputFile entry to wf1", async function(){
      await onAddOutputFile(emit, projectRootDir, components.wf1.ID, "piyo", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");

      wf1Schema.properties.outputFiles.items.push({
        properties:{
          name: {enum:["piyo"]},
          dst: {type: "array", maxItems:0}
        }
      });
      wf1Schema.properties.outputFiles.minItems=2;
      wf1Schema.properties.outputFiles.maxItems=2;

      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);
    });
  });
  describe("#onRemoveInputFile", function(){
    it("should remove inputfile entry from wf1", async function(){
      await onRemoveInputFile(emit, projectRootDir, components.wf1.ID, "bar", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");

      delete wf1Schema.properties.inputFiles.items;
      wf1Schema.properties.inputFiles.minItems=0;
      wf1Schema.properties.inputFiles.maxItems=0;

      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);
      task0Schema.properties.outputFiles.items[0].dst={type: "array", minItems: 0, maxItems: 0}
      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);

      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
  });
  describe("#onRemoveOutputFile", function(){
    it("should remove outputfile entry from wf1", async function(){
      await onRemoveOutputFile(emit, projectRootDir, components.wf1.ID, "hoge", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");

      delete wf1Schema.properties.outputFiles.items;
      wf1Schema.properties.outputFiles.minItems=0;
      wf1Schema.properties.outputFiles.maxItems=0;

      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);

      foreach0Schema.properties.inputFiles.items[0].src={type: "array", minItems: 0, maxItems: 0}
      expect(path.join(projectRootDir, "foreach0", componentJsonFilename)).to.be.a.file().with.json.using.schema(foreach0Schema);

      expect(emit.args[0][1]).to.jsonSchema(rootSchema);

    });
  });
  describe("#onRenameInputFile", function(){
    it("should rename inputFile entry of wf1", async function(){
      await onRenameInputFile(emit, projectRootDir, components.wf1.ID, "bar", "barbar", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      wf1Schema.properties.inputFiles.items[0].properties.name={enum:["barbar"]};
      task0Schema.properties.outputFiles.items[0].properties.dst.items[0].properties.dstName={enum:["barbar"]};

      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);
      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
  });
  describe("#onRenameOutputFile", function(){
    it("should rename outputFile entry of wf1", async function(){
      await onRenameOutputFile(emit, projectRootDir, components.wf1.ID, "hoge", "hogehoge", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      wf1Schema.properties.outputFiles.items[0].properties.name={enum:["hogehoge"]};
      foreach0Schema.properties.inputFiles.items[0].properties.src.items[0].properties.srcName={enum:["hogehoge"]};

      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);
      expect(path.join(projectRootDir, "foreach0", componentJsonFilename)).to.be.a.file().with.json.using.schema(foreach0Schema);
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
  });
  describe("#onAddLink", function(){
    it("should add new link from task0 to foreach0", async function(){
      await onAddLink(emit, projectRootDir, {src: components.task0.ID, dst: components.foreach0.ID, isElse: false}, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      task0Schema.properties.next.items[1]={enum: [components.foreach0.ID]};
      task0Schema.properties.next.maxItems=2;
      task0Schema.properties.next.minItems=2;
      foreach0Schema.properties.previous.items[1]={enum:[components.task0.ID]};
      foreach0Schema.properties.previous.maxItems=2;
      foreach0Schema.properties.previous.minItems=2;

      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);
      expect(path.join(projectRootDir, "foreach0", componentJsonFilename)).to.be.a.file().with.json.using.schema(foreach0Schema);
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
  });
  describe("#onRemoveLink", function(){
    it("should remove link from task0 to wf1", async function(){
      await onRemoveLink(emit, projectRootDir, {src: components.task0.ID, dst: components.wf1.ID, isElse: false}, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");

      delete task0Schema.properties.next.items;
      task0Schema.properties.next.minItems=0;
      task0Schema.properties.next.maxItems=0;
      delete wf1Schema.properties.previous.items;
      wf1Schema.properties.previous.minItems=0;
      wf1Schema.properties.previous.maxItems=0;

      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);
      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
  });
  describe("#onAddFileLink", function(){
    it("should add new file link from task0 to foreach0", async function(){
      await onAddFileLink(emit, projectRootDir, components.task0.ID, "foo", components.foreach0.ID, "hoge", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");

      task0Schema.properties.outputFiles.items[0].properties.dst.items.push({
        properties:{
          dstName: {enum:["hoge"]},
          dstNode: {enum:[components.foreach0.ID]}
        }
      });
      foreach0Schema.properties.inputFiles.items[0].properties.src.items.push({
        properties:{
          dstName: {enum:["foo"]},
          dstNode: {enum:[components.task0.ID]}
        }
      });

      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);
      expect(path.join(projectRootDir, "foreach0", componentJsonFilename)).to.be.a.file().with.json.using.schema(foreach0Schema);
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
  });
  describe("#onRemoveFileLink", function(){
    it("should remove file link from task0 to wf1", async function(){
      await onRemoveFileLink(emit, projectRootDir, components.task0.ID, "foo", components.wf1.ID, "bar", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");

      delete task0Schema.properties.outputFiles.items[0].properties.dst.items
      task0Schema.properties.outputFiles.items[0].properties.dst.minItems=0;
      task0Schema.properties.outputFiles.items[0].properties.dst.maxItems=0;
      delete wf1Schema.properties.inputFiles.items[0].properties.src.items;
      wf1Schema.properties.inputFiles.items[0].properties.src.minItems=0;
      wf1Schema.properties.inputFiles.items[0].properties.src.maxItems=0;

      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);
      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
  });
});
