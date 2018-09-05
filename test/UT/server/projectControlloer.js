const path = require("path");
const fs = require("fs-extra");

//setup test framework
const chai = require("chai");
const expect = chai.expect;
const sinon = require("sinon");
chai.use(require("sinon-chai"));
chai.use(require("chai-fs"));
chai.use(require("chai-json-schema"));
const rewire = require("rewire");

//testee
const projectController = rewire("../../../app/routes/projectController");
const onRunProject = projectController.__get__("onRunProject");

//test data
const testDirRoot = "WHEEL_TEST_TMP";
const projectRootDir = path.resolve(testDirRoot, "testProject.wheel");

//helper functions
const { projectJsonFilename, componentJsonFilename } = require("../../../app/db/db");
const home = rewire("../../../app/routes/home");
const createNewProject = home.__get__("createNewProject");
const workflowEditor = rewire("../../../app/routes/workflowEditor2");
const onCreateNode = workflowEditor.__get__("onCreateNode");
const onUpdateNode = workflowEditor.__get__("onUpdateNode");
const onAddInputFile = workflowEditor.__get__("onAddInputFile");
const onAddOutputFile = workflowEditor.__get__("onAddOutputFile");
const onAddLink = workflowEditor.__get__("onAddLink");
const onAddFileLink = workflowEditor.__get__("onAddFileLink");
const { openProject, setCwd } = require("../../../app/routes/projectResource");

//stubs
const emit = sinon.stub();
const cb = sinon.stub();
const dummyLogger = { error: ()=>{}, warn: ()=>{}, info: ()=>{}, debug: ()=>{}, stdout: sinon.stub(), stderr: sinon.stub(), sshout: sinon.stub(), ssherr: sinon.stub() }; //show error message

//never change dummyLogger !!
//because dummyLogger is used in this test assertions
//if you need to check log output, assign console.log to each member of dummyLogger as follows
// dummyLogger.error=console.log;
// dummyLogger.warn=console.log;
// dummyLogger.info=console.log;
// dummyLogger.debug=console.log;
projectController.__set__("logger", dummyLogger);
home.__set__("logger", dummyLogger);
workflowEditor.__set__("logger", dummyLogger);

const sio = {};
sio.emit = sinon.stub();
//
//TODO pass stub to askPassword for remote task test
//
describe("project Controller UT", function() {
  this.timeout(10000);
  beforeEach(async()=>{
    await fs.remove(testDirRoot);
    emit.reset();
    cb.reset();
    sio.emit.reset();
    dummyLogger.stdout.reset();
    dummyLogger.stderr.reset();
    dummyLogger.sshout.reset();
    dummyLogger.ssherr.reset();
    await createNewProject(projectRootDir, "testProject");
    await openProject(projectRootDir);
  });
  after(async()=>{
    await fs.remove(testDirRoot);
  });
  describe("#onRunProject", ()=>{
    describe("one local task", ()=>{
      beforeEach(async()=>{
        await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        const task0 = await fs.readJson(path.join(projectRootDir, "task0", componentJsonFilename));
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", "run.sh");
        await fs.outputFile(path.join(projectRootDir, "task0", "run.sh"), "#!/bin/bash\npwd\n");
      });
      it("should run project and successfully finish", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout).to.have.been.calledOnce;
        expect(dummyLogger.stdout).to.have.been.calledWithMatch(path.resolve(projectRootDir, "task0"));
        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;
        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            status: "finished"
          }
        });
        expect(path.resolve(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            status: "finished"
          }
        });
      });
    });
    describe("3 local tasks with execution order dependency", ()=>{
      beforeEach(async()=>{
        await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        const task0 = await fs.readJson(path.join(projectRootDir, "task0", componentJsonFilename));
        const task1 = await fs.readJson(path.join(projectRootDir, "task1", componentJsonFilename));
        const task2 = await fs.readJson(path.join(projectRootDir, "task2", componentJsonFilename));
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", "run.sh");
        await onUpdateNode(emit, projectRootDir, task1.ID, "script", "run.sh");
        await onUpdateNode(emit, projectRootDir, task2.ID, "script", "run.sh");
        await fs.outputFile(path.join(projectRootDir, "task0", "run.sh"), "#!/bin/bash\npwd\n");
        await fs.outputFile(path.join(projectRootDir, "task1", "run.sh"), "#!/bin/bash\npwd\n");
        await fs.outputFile(path.join(projectRootDir, "task2", "run.sh"), "#!/bin/bash\npwd\n");
        await onAddLink(emit, projectRootDir, { src: task0.ID, dst: task1.ID, isElse: false });
        await onAddLink(emit, projectRootDir, { src: task1.ID, dst: task2.ID, isElse: false });
      });
      it("should run project and successfully finish", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout).to.have.been.calledThrice;
        const firstCall = dummyLogger.stdout.getCall(0);
        expect(firstCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "task0"));
        const secondCall = dummyLogger.stdout.getCall(1);
        expect(secondCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "task1"));
        const thirdCall = dummyLogger.stdout.getCall(2);
        expect(thirdCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "task2"));
        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;
        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            status: "finished"
          }
        });
        expect(path.resolve(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            status: "finished"
          }
        });
        expect(path.resolve(projectRootDir, "task1", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            status: "finished"
          }
        });
        expect(path.resolve(projectRootDir, "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            status: "finished"
          }
        });
      });
    });
    describe("3 local tasks with file dependency", ()=>{
      beforeEach(async()=>{
        await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        const task0 = await fs.readJson(path.join(projectRootDir, "task0", componentJsonFilename));
        const task1 = await fs.readJson(path.join(projectRootDir, "task1", componentJsonFilename));
        const task2 = await fs.readJson(path.join(projectRootDir, "task2", componentJsonFilename));
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", "run.sh");
        await onUpdateNode(emit, projectRootDir, task1.ID, "script", "run.sh");
        await onUpdateNode(emit, projectRootDir, task2.ID, "script", "run.sh");
        await fs.outputFile(path.join(projectRootDir, "task0", "run.sh"), "#!/bin/bash\npwd\n");
        await fs.outputFile(path.join(projectRootDir, "task0", "a"), "a");
        await fs.outputFile(path.join(projectRootDir, "task1", "run.sh"), "#!/bin/bash\npwd\n");
        await fs.outputFile(path.join(projectRootDir, "task2", "run.sh"), "#!/bin/bash\npwd\n");
        await onAddOutputFile(emit, projectRootDir, task0.ID, "a");
        await onAddOutputFile(emit, projectRootDir, task1.ID, "b");
        await onAddInputFile(emit, projectRootDir, task1.ID, "b");
        await onAddInputFile(emit, projectRootDir, task2.ID, "c");
        await onAddFileLink(emit, projectRootDir, task0.ID, "a", task1.ID, "b");
        await onAddFileLink(emit, projectRootDir, task1.ID, "b", task2.ID, "c");
      });
      it("should run project and successfully finish", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout).to.have.been.calledThrice;
        const firstCall = dummyLogger.stdout.getCall(0);
        expect(firstCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "task0"));
        const secondCall = dummyLogger.stdout.getCall(1);
        expect(secondCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "task1"));
        const thirdCall = dummyLogger.stdout.getCall(2);
        expect(thirdCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "task2"));
        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;
        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            status: "finished"
          }
        });
        expect(path.resolve(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            status: "finished"
          }
        });
        expect(path.resolve(projectRootDir, "task1", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            status: "finished"
          }
        });
        expect(path.resolve(projectRootDir, "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            status: "finished"
          }
        });
        expect(path.resolve(projectRootDir, "task0", "a")).to.be.a.file().with.contents("a");
        expect(path.resolve(projectRootDir, "task1", "b")).to.be.a.file().with.contents("a");
        expect(path.resolve(projectRootDir, "task2", "c")).to.be.a.file().with.contents("a");
      });
    });
    describe("task in the sub workflow", ()=>{
      beforeEach(async()=>{
        await onCreateNode(emit, projectRootDir, { type: "workflow", pos: { x: 10, y: 10 } });
        const wf0= await fs.readJson(path.join(projectRootDir, "workflow0", componentJsonFilename));

        setCwd(projectRootDir, path.join(projectRootDir, "workflow0"));
        await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        const task0= await fs.readJson(path.join(projectRootDir, "workflow0", "task0", componentJsonFilename));
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", "run.sh");
        await fs.outputFile(path.join(projectRootDir, "workflow0","task0", "run.sh"), "#!/bin/bash\npwd\n");
      });
      it("should run project and successfully finish", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout).to.have.been.calledOnce;
        const firstCall = dummyLogger.stdout.getCall(0);
        expect(firstCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "workflow0","task0"));
        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;
        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            status: "finished"
          }
        });
        expect(path.resolve(projectRootDir, "workflow0", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            status: "finished"
          }
        });
      });
    });
    describe("file dependncy between parent and child", ()=>{
      beforeEach(async()=>{
        await onCreateNode(emit, projectRootDir, { type: "workflow", pos: { x: 10, y: 10 } });
        const wf0= await fs.readJson(path.join(projectRootDir, "workflow0", componentJsonFilename));
        await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        const parentTask0= await fs.readJson(path.join(projectRootDir, "task0", componentJsonFilename));
        const parentTask1= await fs.readJson(path.join(projectRootDir, "task1", componentJsonFilename));
        await onUpdateNode(emit, projectRootDir, parentTask0.ID, "script", "run.sh");
        await onUpdateNode(emit, projectRootDir, parentTask1.ID, "script", "run.sh");

        setCwd(projectRootDir, path.join(projectRootDir, "workflow0"));
        await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        const childTask0= await fs.readJson(path.join(projectRootDir, "workflow0", "task0", componentJsonFilename));
        const childTask1= await fs.readJson(path.join(projectRootDir, "workflow0", "task1", componentJsonFilename));
        await onUpdateNode(emit, projectRootDir, childTask0.ID, "script", "run.sh");
        await onUpdateNode(emit, projectRootDir, childTask1.ID, "script", "run.sh");

        // add file dependency
        await fs.outputFile(path.join(projectRootDir, "task0", "a"), "a");
        await onAddOutputFile(emit, projectRootDir, parentTask0.ID, "a");
        await onAddInputFile(emit, projectRootDir, wf0.ID, "b");
        await onAddInputFile(emit, projectRootDir, childTask0.ID, "c");
        await onAddOutputFile(emit, projectRootDir, childTask0.ID, "c");
        await onAddInputFile(emit, projectRootDir, childTask1.ID, "d");
        await onAddOutputFile(emit, projectRootDir, childTask1.ID, "d");
        await onAddOutputFile(emit, projectRootDir, wf0.ID, "e");
        await onAddInputFile(emit, projectRootDir, parentTask1.ID, "f");

        await onAddFileLink(emit, projectRootDir, parentTask0.ID, "a", wf0.ID, "b");
        await onAddFileLink(emit, projectRootDir, "parent", "b", childTask0.ID, "c");
        await onAddFileLink(emit, projectRootDir, childTask0.ID, "c", childTask1.ID, "d");
        await onAddFileLink(emit, projectRootDir, childTask1.ID, "d", "parent", "e");
        await onAddFileLink(emit, projectRootDir, wf0.ID, "e", parentTask1.ID, "f");

        // create script
        await fs.outputFile(path.join(projectRootDir, "task0", "run.sh"), "#!/bin/bash\npwd\n");
        await fs.outputFile(path.join(projectRootDir, "task1", "run.sh"), "#!/bin/bash\npwd\n");
        await fs.outputFile(path.join(projectRootDir, "workflow0","task0", "run.sh"), "#!/bin/bash\npwd\n");
        await fs.outputFile(path.join(projectRootDir, "workflow0","task1", "run.sh"), "#!/bin/bash\npwd\n");
      });
      it("should run project and successfully finish", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout).to.have.been.calledOnce;
        const firstCall = dummyLogger.stdout.getCall(0);
        expect(firstCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "task0"));
        const secondCall = dummyLogger.stdout.getCall(1);
        expect(secondCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "workflow0","task0"));
        const thirdCall = dummyLogger.stdout.getCall(2);
        expect(thirdCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "workflow0","task1"));
        const fourthCall = dummyLogger.stdout.getCall(3);
        expect(fourthCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "task1"));

        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;
        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            status: "finished"
          }
        });
        expect(path.resolve(projectRootDir, "workflow0", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            status: "finished"
          }
        });

        expect(path.resolve(projectRootDir, "task0", "a")).to.be.a.file().with.contents("a");
        expect(path.resolve(projectRootDir, "workflow0", "b")).to.be.not.a.file();
        expect(path.resolve(projectRootDir, "workflow0", "task0", "c")).to.be.a.file().with.contents("a");
        expect(path.resolve(projectRootDir, "workflow0", "task1", "d")).to.be.a.file().with.contents("a");
        expect(path.resolve(projectRootDir, "workflow0", "e")).to.be.not.a.file();
        expect(path.resolve(projectRootDir, "task1", "f")).to.be.a.file().with.contents("a");
      });
    });
  });
});
