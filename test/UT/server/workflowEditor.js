const path = require("path");
const fs = require("fs-extra");
const { projectJsonFilename, componentJsonFilename } = require("../../../app/db/db");
const componentFactory = require("../../../app/routes/workflowComponent");
const { getComponentDir } = require("../../../app/routes/workflowUtil");
const getSchema = require("../../../app/db/jsonSchemas");
const { openProject, setCwd } = require("../../../app/routes/projectResource");

//setup test framework
const chai = require("chai");
const expect = chai.expect;
const sinon = require("sinon");
chai.use(require("sinon-chai"));
chai.use(require("chai-fs"));
chai.use(require("chai-json-schema"));
const rewire = require("rewire");

//testee
const workflowEditor = rewire("../../../app/routes/workflowEditor2");
const onWorkflowRequest = workflowEditor.__get__("onWorkflowRequest");
const onCreateNode = workflowEditor.__get__("onCreateNode");
const onUpdateNode = workflowEditor.__get__("onUpdateNode");
const onRemoveNode = workflowEditor.__get__("onRemoveNode");
const onAddInputFile = workflowEditor.__get__("onAddInputFile");
const onAddOutputFile = workflowEditor.__get__("onAddOutputFile");
const onRemoveInputFile = workflowEditor.__get__("onRemoveInputFile");
const onRemoveOutputFile = workflowEditor.__get__("onRemoveOutputFile");
const onRenameInputFile = workflowEditor.__get__("onRenameInputFile");
const onRenameOutputFile = workflowEditor.__get__("onRenameOutputFile");
const onAddLink = workflowEditor.__get__("onAddLink");
const onRemoveLink = workflowEditor.__get__("onRemoveLink");
const onAddFileLink = workflowEditor.__get__("onAddFileLink");
const onRemoveFileLink = workflowEditor.__get__("onRemoveFileLink");

//test data
const testDirRoot = "WHEEL_TEST_TMP";
//stubs
const emit = sinon.stub();
const cb = sinon.stub();
const dummySilentLogger = { error: ()=>{}, warn: ()=>{}, info: ()=>{}, debug: ()=>{} }; //default logger stub
const dummyLogger = { error: console.log, warn: ()=>{}, info: ()=>{}, debug: ()=>{} }; //show error message
const dummyVerboseLogger = { error: console.log, warn: console.log, info: console.log, debug: console.log }; //show error message
workflowEditor.__set__("logger", dummySilentLogger);
const home = rewire("../../../app/routes/home");
home.__set__("logger", dummySilentLogger);
const createNewProject = home.__get__("createNewProject");

const grandsonSchema = {
  type: "array",
  items: {
    required: ["pos", "type"],
    properties: {
      type: { enum: ["task", "if", "workflow", "parameterStudy", "for", "while", "foreach"] },
      pos: getSchema("pos")
    }
  }
};

describe("workflow editor UT", ()=>{
  let components;
  let wf1Schema;
  let wf2Schema;
  let task0Schema;
  let task1Schema;
  let task2Schema;
  let foreach0Schema;
  let rootSchema;
  const projectRootDir = path.resolve(testDirRoot, "testProject.wheel");
  beforeEach(async()=>{
    await fs.remove(testDirRoot);
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

    await createNewProject(projectRootDir, "dummy project");
    const rootWf = await fs.readJson(path.join(projectRootDir, componentJsonFilename));

    const task0 = componentFactory("task", { x: 0, y: 0 }, rootWf.ID);
    const wf1 = componentFactory("workflow", { x: 1, y: 1 }, rootWf.ID);
    const foreach0 = componentFactory("foreach", { x: 1, y: 1 }, rootWf.ID);
    const task1 = componentFactory("task", { x: 2, y: 2 }, wf1.ID);
    const wf2 = componentFactory("workflow", { x: 3, y: 3 }, wf1.ID);
    const task2 = componentFactory("task", { x: 4, y: 4 }, wf2.ID);

    task0.name = "task0";
    wf1.name = "wf1";
    task1.name = "task1";
    wf2.name = "wf2";
    task2.name = "task2";
    foreach0.name = "foreach0";

    task0.next.push(wf1.ID);
    wf1.previous.push(task0.ID);
    wf1.next.push(foreach0.ID);
    foreach0.previous.push(wf1.ID);

    task0.outputFiles.push({ name: "foo", dst: [{ dstNode: wf1.ID, dstName: "bar" }] });
    wf1.outputFiles.push({ name: "hoge", dst: [{ dstNode: foreach0.ID, dstName: "hoge" }] });
    wf1.inputFiles.push({ name: "bar", src: [{ srcNode: task0.ID, srcName: "foo" }] });
    foreach0.inputFiles.push({ name: "hoge", src: [{ srcNode: wf1.ID, srcName: "hoge" }] });
    task1.outputFiles.push({ name: "a", dst: [] });
    task1.inputFiles.push({ name: "f", src: [] });
    wf2.inputFiles.push({ name: "b", src: [] });
    wf2.outputFiles.push({ name: "e", dst: [] });
    task2.inputFiles.push({ name: "c", src: [] });
    task2.outputFiles.push({ name: "d", dst: [] });

    components = {
      root: rootWf,
      wf1,
      wf2,
      foreach0,
      task0,
      task1,
      task2
    };

    wf1Schema = getSchema("workflow", "wf1");
    wf1Schema.properties.ID = { enum: [components.wf1.ID] };
    wf1Schema.properties.parent = { enum: [components.root.ID] };
    wf1Schema.addValue("next", components.foreach0.ID);
    wf1Schema.addValue("previous", components.task0.ID);
    wf1Schema.addInputFile("bar", components.task0.ID, "foo");
    wf1Schema.addOutputFile("hoge", components.foreach0.ID, "hoge");

    wf2Schema = getSchema("workflow", "wf2");
    wf2Schema.properties.ID = { enum: [components.wf2.ID] };
    wf2Schema.properties.parent = { enum: [components.wf1.ID] };
    wf2Schema.addInputFile("b");
    wf2Schema.addOutputFile("e");

    task0Schema = getSchema("task", "task0");
    task0Schema.properties.ID = { enum: [components.task0.ID] };
    task0Schema.properties.parent = { enum: [components.root.ID] };
    task0Schema.addValue("next", components.wf1.ID);
    task0Schema.addOutputFile("foo", components.wf1.ID, "bar");

    task1Schema = getSchema("task", "task1");
    task1Schema.properties.ID = { enum: [components.task1.ID] };
    task1Schema.properties.parent = { enum: [components.wf1.ID] };
    task1Schema.addOutputFile("a");
    task1Schema.addInputFile("f");

    task2Schema = getSchema("task", "task2");
    task2Schema.properties.ID = { enum: [components.task2.ID] };
    task2Schema.properties.parent = { enum: [components.wf2.ID] };
    task2Schema.addOutputFile("d");
    task2Schema.addInputFile("c");

    foreach0Schema = getSchema("foreach", "foreach0");
    foreach0Schema.properties.ID = { enum: [components.foreach0.ID] };
    foreach0Schema.properties.parent = { enum: [components.root.ID] };
    foreach0Schema.addValue("previous", components.wf1.ID);
    foreach0Schema.addInputFile("hoge", components.wf1.ID, "hoge");

    rootSchema = getSchema("workflow", "dummy project");
    rootSchema.properties.ID = { enum: [components.root.ID] };
    rootSchema.required.push("descendants");
    rootSchema.properties.descendants = {
      type: "array",
      items: [
        foreach0Schema,
        task0Schema,
        wf1Schema
      ],
      minItems: 3,
      maxItems: 3
    };

    const projectJson = await fs.readJson(path.join(projectRootDir, projectJsonFilename));
    projectJson.componentPath[rootWf.ID] = "./";
    projectJson.componentPath[task0.ID] = "./task0";
    projectJson.componentPath[foreach0.ID] = "./foreach0";
    projectJson.componentPath[wf1.ID] = "./wf1";
    projectJson.componentPath[task1.ID] = "./wf1/task1";
    projectJson.componentPath[wf2.ID] = "./wf1/wf2";
    projectJson.componentPath[task2.ID] = "./wf1/wf2/task2";

    await Promise.all([
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", projectJsonFilename), projectJson, { spaces: 4 }),
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", componentJsonFilename), rootWf, { spaces: 4 }),
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", "task0", componentJsonFilename), task0, { spaces: 4 }),
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", "foreach0", componentJsonFilename), foreach0, { spaces: 4 }),
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", "wf1", componentJsonFilename), wf1, { spaces: 4 }),
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", "wf1", "task1", componentJsonFilename), task1, { spaces: 4 }),
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", "wf1", "wf2", componentJsonFilename), wf2, { spaces: 4 }),
      fs.outputJson(path.join(testDirRoot, "testProject.wheel", "wf1", "wf2", "task2", componentJsonFilename), task2, { spaces: 4 })
    ]);
    await openProject(projectRootDir);
  });
  after(async()=>{
    await fs.remove(testDirRoot);
  });

  describe("#onWorkflowRequest", ()=>{
    it("should send root, child, and grandson json data", async()=>{
      await onWorkflowRequest(emit, projectRootDir, components.root.ID, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      grandsonSchema.minLength = 2;
      grandsonSchema.maxLength = 2;
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
    it("should send wf1, child, and grandson json data", async()=>{
      setCwd(projectRootDir, path.join(projectRootDir, "wf1"));
      await onWorkflowRequest(emit, projectRootDir, components.wf1.ID, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      grandsonSchema.minLength = 1;
      grandsonSchema.maxLength = 1;
      expect(emit.args[0][1]).to.jsonSchema({
        properties: {
          ID: { enum: [components.wf1.ID] },
          descendants: {
            type: "array",
            items: {
              properties: {
                parent: { enum: [components.wf1.ID] },
                ID: { enum: [components.task1.ID, components.wf2.ID] },
                descendants: grandsonSchema
              },
              required: ["parent", "ID"]
            },
            minLength: 2,
            maxLength: 2
          }
        },
        required: ["ID", "descendants"]
      });
    });
  });
  describe("#onCreateNode", ()=>{
    it("should create new node under wf1", async()=>{
      setCwd(projectRootDir, path.join(projectRootDir, "wf1"));
      const newTask0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } }, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      expect(emit.args[0][1]).to.jsonSchema({
        properties: {
          descendants: {
            type: "array",
            items: {
              properties: {
                parent: { enum: [components.wf1.ID] },
                name: { enum: ["task0", "task1", "wf2"] }
              }
            },
            uniqueItems: true
          }
        },
        required: ["descendants"]
      });
      const newTask0Schema = getSchema("task", "task0");
      newTask0Schema.properties.parent = { enum: [components.wf1.ID] };
      newTask0Schema.properties.ID = { enum: [newTask0.ID] };
      expect(path.join(projectRootDir, "wf1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(newTask0Schema);
    });
  });
  describe("#onUpdateNode", ()=>{
    it("should rename wf1 to wf4", async()=>{
      await onUpdateNode(emit, projectRootDir, components.wf1.ID, "name", "wf4", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      wf1Schema.properties.name = { enum: ["wf4"] };
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
      expect(path.join(projectRootDir, "wf1")).not.to.be.path();
      expect(path.join(projectRootDir, "wf4")).to.be.directory().with.contents(["wf2", "task1", componentJsonFilename]);
      expect(path.join(projectRootDir, "wf4", componentJsonFilename)).to.be.file().with.json.using.schema(wf1Schema);
      expect(await getComponentDir(projectRootDir, components.wf1.ID)).to.equal(path.resolve(projectRootDir, "wf4"));
    });
    it("should update task0's script property", async()=>{
      await onUpdateNode(emit, projectRootDir, components.task0.ID, "script", "run.sh", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      task0Schema.properties.script = { enum: ["run.sh"] };
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);
    });
    it("should update foreach's indexList property", async()=>{
      await onUpdateNode(emit, projectRootDir, components.foreach0.ID, "indexList", ["foo", "bar", "baz"], cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      foreach0Schema.properties.indexList.items = [
        { enum: ["foo"] },
        { enum: ["bar"] },
        { enum: ["baz"] }
      ];
      foreach0Schema.properties.indexList.minItems = 3;
      foreach0Schema.properties.indexList.maxItems = 3;
      foreach0Schema.properties.indexList.additionalItems = false;

      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
      expect(path.join(projectRootDir, "foreach0", componentJsonFilename)).to.be.a.file().with.json.using.schema(foreach0Schema);
    });
    it("should not rename root workflow", async()=>{
      await onUpdateNode(emit, projectRootDir, components.root.ID, "name", "hoge", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(false);
      expect(emit).not.to.have.been.called;
      expect(path.join(projectRootDir)).to.be.a.directory().with.contents([".git", "task0", "wf1", "foreach0", projectJsonFilename, componentJsonFilename]);
    });
    it("should not update inputFiles", async()=>{
      await onUpdateNode(emit, projectRootDir, components.task0.ID, "inputFiles", "hoge", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(false);
      expect(emit).not.to.have.been.called;
    });
    it("should not update outputFiles", async()=>{
      await onUpdateNode(emit, projectRootDir, components.task0.ID, "outputFiles", "hoge", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(false);
      expect(emit).not.to.have.been.called;
    });
  });
  describe("#onRemoveNode", ()=>{
    it("should remove wf1 and its descendants", async()=>{
      await onRemoveNode(emit, projectRootDir, components.wf1.ID, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");

      //wf1's entry in task0 and foreac0 should be removed
      task0Schema.properties.outputFiles.items[0].dst = getSchema("emptyArray");
      task0Schema.properties.next = getSchema("emptyArray");
      foreach0Schema.properties.inputFiles.items[0].src = getSchema("emptyArray");
      foreach0Schema.properties.previous = getSchema("emptyArray");
      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);
      expect(path.join(projectRootDir, "foreach0", componentJsonFilename)).to.be.a.file().with.json.using.schema(foreach0Schema);

      rootSchema.properties.descendants.items = rootSchema.properties.descendants.items.filter((e)=>{
        return e.properties.ID.enum[0] !== components.wf1.ID;
      });
      rootSchema.properties.descendants.minItems = 2;
      rootSchema.properties.descendants.maxItems = 2;
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);

      expect(path.join(projectRootDir, "wf1")).not.to.be.path();

      //check componentPath in projectJson
      expect(path.join(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
        properties: {
          componentPath: {
            patternProperties: {
              "^.*$": { type: "string", pattern: "^(?!.*wf1).*$" }
            },
            minProperties: 3,
            maxProperties: 3
          }
        },
        required: ["componentPath"]
      });
    });
  });
  describe("#onAddInputFile", ()=>{
    it("should add not connected inputFile entry to wf1", async()=>{
      await onAddInputFile(emit, projectRootDir, components.wf1.ID, "piyo", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      wf1Schema.addInputFile("piyo");
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);
    });
  });
  describe("#onAddOutputFile", ()=>{
    it("should  add not connected outputFile entry to wf1", async()=>{
      await onAddOutputFile(emit, projectRootDir, components.wf1.ID, "piyo", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      wf1Schema.addOutputFile("piyo");
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);
    });
  });
  describe("#onRemoveInputFile", ()=>{
    it("should remove inputfile entry from wf1", async()=>{
      await onRemoveInputFile(emit, projectRootDir, components.wf1.ID, "bar", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      wf1Schema.properties.inputFiles = getSchema("emptyArray");
      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);
      task0Schema.properties.outputFiles.items[0].dst = getSchema("emptyArray");
      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
  });
  describe("#onRemoveOutputFile", ()=>{
    it("should remove outputfile entry from wf1", async()=>{
      await onRemoveOutputFile(emit, projectRootDir, components.wf1.ID, "hoge", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      wf1Schema.properties.outputFiles = getSchema("emptyArray");
      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);
      foreach0Schema.properties.inputFiles.items[0].src = getSchema("emptyArray");
      expect(path.join(projectRootDir, "foreach0", componentJsonFilename)).to.be.a.file().with.json.using.schema(foreach0Schema);
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
  });
  describe("#onRenameInputFile", ()=>{
    it("should rename inputFile entry of wf1", async()=>{
      await onRenameInputFile(emit, projectRootDir, components.wf1.ID, 0, "barbar", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      wf1Schema.properties.inputFiles.items[0].properties.name = { enum: ["barbar"] };
      task0Schema.properties.outputFiles.items[0].properties.dst.items[0].properties.dstName = { enum: ["barbar"] };
      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);
      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
  });
  describe("#onRenameOutputFile", ()=>{
    it("should rename outputFile entry of wf1", async()=>{
      await onRenameOutputFile(emit, projectRootDir, components.wf1.ID, 0, "hogehoge", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      wf1Schema.properties.outputFiles.items[0].properties.name = { enum: ["hogehoge"] };
      foreach0Schema.properties.inputFiles.items[0].properties.src.items[0].properties.srcName = { enum: ["hogehoge"] };
      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);
      expect(path.join(projectRootDir, "foreach0", componentJsonFilename)).to.be.a.file().with.json.using.schema(foreach0Schema);
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
  });
  describe("#onAddLink", ()=>{
    it("should add new link from task0 to foreach0", async()=>{
      await onAddLink(emit, projectRootDir, { src: components.task0.ID, dst: components.foreach0.ID, isElse: false }, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      task0Schema.addValue("next", components.foreach0.ID);
      foreach0Schema.addValue("previous", components.task0.ID);
      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);
      expect(path.join(projectRootDir, "foreach0", componentJsonFilename)).to.be.a.file().with.json.using.schema(foreach0Schema);
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
  });
  describe("#onRemoveLink", ()=>{
    it("should remove link from task0 to wf1", async()=>{
      await onRemoveLink(emit, projectRootDir, { src: components.task0.ID, dst: components.wf1.ID, isElse: false }, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      task0Schema.properties.next = getSchema("emptyArray");
      wf1Schema.properties.previous = getSchema("emptyArray");
      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);
      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
  });
  describe("#onAddFileLink", ()=>{
    it("should add new file link from task0 to foreach0", async()=>{
      await onAddFileLink(emit, projectRootDir, components.task0.ID, "foo", components.foreach0.ID, "hoge", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      task0Schema.addOutputFileLink(0, components.foreach0.ID, "hoge");
      foreach0Schema.addInputFileLink(0, components.task0.ID, "foo");
      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);
      expect(path.join(projectRootDir, "foreach0", componentJsonFilename)).to.be.a.file().with.json.using.schema(foreach0Schema);
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
    it("should add new file link from upper level to task2 via wf2 with 'parent' keyword", async()=>{
      setCwd(projectRootDir, path.join(projectRootDir, "wf1", "wf2"));
      await onAddFileLink(emit, projectRootDir, "parent", "b", components.task2.ID, "c");
      wf2Schema.addInputFileLink(0, components.task2.ID, "c", true);
      task2Schema.addInputFileLink(0, components.wf2.ID, "b");
      expect(path.join(projectRootDir, "wf1", "wf2", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf2Schema);
      expect(path.join(projectRootDir, "wf1", "wf2", "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema(task2Schema);
    });
    it("should add new file link from upper level to task2 via wf2 with wf2's ID", async()=>{
      setCwd(projectRootDir, path.join(projectRootDir, "wf1", "wf2"));
      await onAddFileLink(emit, projectRootDir, components.wf2.ID, "b", components.task2.ID, "c");
      wf2Schema.addInputFileLink(0, components.task2.ID, "c", true);
      task2Schema.addInputFileLink(0, components.wf2.ID, "b");
      expect(path.join(projectRootDir, "wf1", "wf2", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf2Schema);
      expect(path.join(projectRootDir, "wf1", "wf2", "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema(task2Schema);
    });
    it("should add new file link from task2 to upper level via wf2 with 'parent' keyword", async()=>{
      setCwd(projectRootDir, path.join(projectRootDir, "wf1", "wf2"));
      await onAddFileLink(emit, projectRootDir, components.task2.ID, "d", "parent", "e");
      wf2Schema.addOutputFileLink(0, components.task2.ID, "d", true);
      task2Schema.addOutputFileLink(0, components.wf2.ID, "e");
      expect(path.join(projectRootDir, "wf1", "wf2", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf2Schema);
      expect(path.join(projectRootDir, "wf1", "wf2", "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema(task2Schema);
    });
    it("should add new file link from task2 to upper level via wf2 with wf2's ID", async()=>{
      setCwd(projectRootDir, path.join(projectRootDir, "wf1", "wf2"));
      await onAddFileLink(emit, projectRootDir, components.task2.ID, "d", components.wf2.ID, "e");
      wf2Schema.addOutputFileLink(0, components.task2.ID, "d", true);
      task2Schema.addOutputFileLink(0, components.wf2.ID, "e");
      expect(path.join(projectRootDir, "wf1", "wf2", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf2Schema);
      expect(path.join(projectRootDir, "wf1", "wf2", "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema(task2Schema);
    });
  });
  describe("#onRemoveFileLink", ()=>{
    it("should remove file link from task0 to wf1", async()=>{
      await onRemoveFileLink(emit, projectRootDir, components.task0.ID, "foo", components.wf1.ID, "bar", cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("workflow");
      task0Schema.properties.outputFiles.items[0].properties.dst = getSchema("emptyArray");
      wf1Schema.properties.inputFiles.items[0].properties.src = getSchema("emptyArray");
      expect(path.join(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema(task0Schema);
      expect(path.join(projectRootDir, "wf1", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf1Schema);
      expect(emit.args[0][1]).to.jsonSchema(rootSchema);
    });
    it("should add new file link from upper level to task2 via wf2 and remove with 'parent' keyword", async()=>{
      setCwd(projectRootDir, path.join(projectRootDir, "wf1", "wf2"));
      await onAddFileLink(emit, projectRootDir, "parent", "b", components.task2.ID, "c");
      wf2Schema.addOutputFileLink(0, components.task2.ID, "d", true);
      task2Schema.addOutputFileLink(0, components.wf2.ID, "e");
      expect(path.join(projectRootDir, "wf1", "wf2", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf2Schema);
      expect(path.join(projectRootDir, "wf1", "wf2", "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema(task2Schema);

      //actual test start here
      await onRemoveFileLink(emit, projectRootDir, "parent", "b", components.task2.ID, "c");
      wf2Schema.properties.inputFiles.items[0].properties.forwardTo = getSchema("emptyArray");
      task2Schema.properties.inputFiles.items[0].properties.src = getSchema("emptyArray");
      expect(path.join(projectRootDir, "wf1", "wf2", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf2Schema);
      expect(path.join(projectRootDir, "wf1", "wf2", "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema(task2Schema);
    });
    it("should add new file link from upper level to task2 via wf2 and remove with wf2's ID", async()=>{
      setCwd(projectRootDir, path.join(projectRootDir, "wf1", "wf2"));
      await onAddFileLink(emit, projectRootDir, components.wf2.ID, "b", components.task2.ID, "c");
      wf2Schema.addOutputFileLink(0, components.task2.ID, "d", true);
      task2Schema.addOutputFileLink(0, components.wf2.ID, "e");
      expect(path.join(projectRootDir, "wf1", "wf2", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf2Schema);
      expect(path.join(projectRootDir, "wf1", "wf2", "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema(task2Schema);

      //actual test start here
      await onRemoveFileLink(emit, projectRootDir, "parent", "b", components.task2.ID, "c");
      wf2Schema.properties.inputFiles.items[0].properties.forwardTo = getSchema("emptyArray");
      task2Schema.properties.inputFiles.items[0].properties.src.items = getSchema("emptyArray");
      expect(path.join(projectRootDir, "wf1", "wf2", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf2Schema);
      expect(path.join(projectRootDir, "wf1", "wf2", "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema(task2Schema);
    });
    it("should add new file link from task2 to upper level via wf2 and remove with 'parent' keyword", async()=>{
      setCwd(projectRootDir, path.join(projectRootDir, "wf1", "wf2"));
      await onAddFileLink(emit, projectRootDir, components.task2.ID, "d", "parent", "e");
      wf2Schema.addOutputFileLink(0, components.task2.ID, "d", true);
      task2Schema.addOutputFileLink(0, components.wf2.ID, "e");
      expect(path.join(projectRootDir, "wf1", "wf2", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf2Schema);
      expect(path.join(projectRootDir, "wf1", "wf2", "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema(task2Schema);

      //actual test start here
      await onRemoveFileLink(emit, projectRootDir, components.task2.ID, "d", "parent", "e");
      wf2Schema.properties.inputFiles.items[0].properties.forwardTo = getSchema("emptyArray");
      task2Schema.properties.inputFiles.items[0].properties.src.items = getSchema("emptyArray");
      expect(path.join(projectRootDir, "wf1", "wf2", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf2Schema);
      expect(path.join(projectRootDir, "wf1", "wf2", "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema(task2Schema);
    });
    it("should add new file link from task2 to upper level via wf2 and remove with wf2's ID", async()=>{
      setCwd(projectRootDir, path.join(projectRootDir, "wf1", "wf2"));
      await onAddFileLink(emit, projectRootDir, components.task2.ID, "d", "parent", "e");
      wf2Schema.addOutputFileLink(0, components.task2.ID, "d", true);
      task2Schema.addOutputFileLink(0, components.wf2.ID, "e");
      expect(path.join(projectRootDir, "wf1", "wf2", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf2Schema);
      expect(path.join(projectRootDir, "wf1", "wf2", "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema(task2Schema);

      //actual test start here
      await onRemoveFileLink(emit, projectRootDir, components.task2.ID, "d", components.wf2.ID, "e");
      wf2Schema.properties.inputFiles.items[0].properties.forwardTo = getSchema("emptyArray");
      task2Schema.properties.inputFiles.items[0].properties.src.items = getSchema("emptyArray");
      expect(path.join(projectRootDir, "wf1", "wf2", componentJsonFilename)).to.be.a.file().with.json.using.schema(wf2Schema);
      expect(path.join(projectRootDir, "wf1", "wf2", "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema(task2Schema);
    });
  });
});
