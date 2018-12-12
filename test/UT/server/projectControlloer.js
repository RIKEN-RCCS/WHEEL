const path = require("path");
const fs = require("fs-extra");
const os = require("os");

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

const { scriptName, pwdCmd, scriptHeader, referenceEnv } = require("./testScript");
const scriptPwd = `${scriptHeader}\n${pwdCmd}`;
const { escapeRegExp } = require("../../../app/lib/utility");

//stubs
const emit = sinon.stub();
const cb = sinon.stub();
const dummyLogger = { error: ()=>{}, warn: ()=>{}, info: ()=>{}, debug: ()=>{}, stdout: sinon.stub(), stderr: sinon.stub(), sshout: sinon.stub(), ssherr: sinon.stub() }; //ignore error message
dummyLogger.error = console.log;
dummyLogger.warn = console.log;
//dummyLogger.info=console.log;
//dummyLogger.debug=console.log;
//dummyLogger.stdout=console.log;
//sinon.spy(dummyLogger, "stdout");

projectController.__set__("getLogger", ()=>{
  return dummyLogger;
});

const sio = {};
sio.emit = sinon.stub();
//
//TODO pass stub to askPassword for remote task test
//
describe("project Controller UT", function() {
  this.timeout(0);
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
        const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);
        await fs.outputFile(path.join(projectRootDir, "task0", scriptName), scriptPwd);
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
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state", "ancestorsName"],
          properties: {
            state: { enum: ["finished"] },
            ancestorsName: { enum: [""] }
          }
        });
      });
    });
    describe("3 local tasks with execution order dependency", ()=>{
      beforeEach(async()=>{
        const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        const task1 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        const task2 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);
        await onUpdateNode(emit, projectRootDir, task1.ID, "script", scriptName);
        await onUpdateNode(emit, projectRootDir, task2.ID, "script", scriptName);
        await fs.outputFile(path.join(projectRootDir, "task0", scriptName), scriptPwd);
        await fs.outputFile(path.join(projectRootDir, "task1", scriptName), scriptPwd);
        await fs.outputFile(path.join(projectRootDir, "task2", scriptName), scriptPwd);
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
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "task1", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
      });
    });
    describe("3 local tasks with file dependency", ()=>{
      beforeEach(async()=>{
        const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        const task1 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        const task2 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);
        await onUpdateNode(emit, projectRootDir, task1.ID, "script", scriptName);
        await onUpdateNode(emit, projectRootDir, task2.ID, "script", scriptName);
        await fs.outputFile(path.join(projectRootDir, "task0", scriptName), scriptPwd);
        await fs.outputFile(path.join(projectRootDir, "task0", "a"), "a");
        await fs.outputFile(path.join(projectRootDir, "task1", scriptName), scriptPwd);
        await fs.outputFile(path.join(projectRootDir, "task2", scriptName), scriptPwd);
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
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "task1", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "task2", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "task0", "a")).to.be.a.file().with.contents("a");
        expect(path.resolve(projectRootDir, "task1", "b")).to.be.a.file().with.contents("a");
        expect(path.resolve(projectRootDir, "task2", "c")).to.be.a.file().with.contents("a");
      });
    });
    describe("task in the sub workflow", ()=>{
      beforeEach(async()=>{
        const wf0 = await onCreateNode(emit, projectRootDir, { type: "workflow", pos: { x: 10, y: 10 } });
        setCwd(projectRootDir, path.join(projectRootDir, "workflow0"));
        const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);
        await fs.outputFile(path.join(projectRootDir, "workflow0", "task0", scriptName), scriptPwd);
      });
      it("should run project and successfully finish", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout).to.have.been.calledOnce;
        const firstCall = dummyLogger.stdout.getCall(0);
        expect(firstCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "workflow0", "task0"));
        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;
        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "workflow0", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
      });
    });
    describe("file dependency between parent and child", ()=>{
      beforeEach(async()=>{
        const wf0 = await onCreateNode(emit, projectRootDir, { type: "workflow", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, wf0.ID, "name", "wf0");
        const parentTask0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        const parentTask1 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, parentTask0.ID, "name", "parentTask0");
        await onUpdateNode(emit, projectRootDir, parentTask0.ID, "script", scriptName);
        await onUpdateNode(emit, projectRootDir, parentTask1.ID, "name", "parentTask1");
        await onUpdateNode(emit, projectRootDir, parentTask1.ID, "script", scriptName);

        setCwd(projectRootDir, path.join(projectRootDir, "wf0"));
        const childTask0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        const childTask1 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, childTask0.ID, "name", "childTask0");
        await onUpdateNode(emit, projectRootDir, childTask0.ID, "script", scriptName);
        await onUpdateNode(emit, projectRootDir, childTask1.ID, "name", "childTask1");
        await onUpdateNode(emit, projectRootDir, childTask1.ID, "script", scriptName);

        //add file dependency
        await fs.outputFile(path.join(projectRootDir, "parentTask0", "a"), "a");
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

        //create script
        await fs.outputFile(path.join(projectRootDir, "parentTask0", scriptName), scriptPwd);
        await fs.outputFile(path.join(projectRootDir, "parentTask1", scriptName), scriptPwd);
        await fs.outputFile(path.join(projectRootDir, "wf0", "childTask0", scriptName), scriptPwd);
        await fs.outputFile(path.join(projectRootDir, "wf0", "childTask1", scriptName), scriptPwd);
      });
      it("should run project and successfully finish", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout.callCount).to.equal(4);
        const firstCall = dummyLogger.stdout.getCall(0);
        expect(firstCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "parentTask0"));
        const secondCall = dummyLogger.stdout.getCall(1);
        expect(secondCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "wf0", "childTask0"));
        const thirdCall = dummyLogger.stdout.getCall(2);
        expect(thirdCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "wf0", "childTask1"));
        const fourthCall = dummyLogger.stdout.getCall(3);
        expect(fourthCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "parentTask1"));

        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;
        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "parentTask0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "parentTask1", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "wf0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "wf0", "childTask0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "wf0", "childTask1", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });

        expect(path.resolve(projectRootDir, "parentTask0", "a")).to.be.a.file().with.contents("a");
        expect(path.resolve(projectRootDir, "wf0", "b")).not.to.be.a.path();
        expect(path.resolve(projectRootDir, "wf0", "childTask0", "c")).to.be.a.file().with.contents("a");
        expect(path.resolve(projectRootDir, "wf0", "childTask1", "d")).to.be.a.file().with.contents("a");
        expect(path.resolve(projectRootDir, "wf0", "e")).not.to.be.a.path();
        expect(path.resolve(projectRootDir, "parentTask1", "f")).to.be.a.file().with.contents("a");
      });
    });
    describe("If component", ()=>{
      beforeEach(async()=>{
        const if0 = await onCreateNode(emit, projectRootDir, { type: "if", pos: { x: 10, y: 10 } });
        const if1 = await onCreateNode(emit, projectRootDir, { type: "if", pos: { x: 10, y: 10 } });
        const if2 = await onCreateNode(emit, projectRootDir, { type: "if", pos: { x: 10, y: 10 } });
        const if3 = await onCreateNode(emit, projectRootDir, { type: "if", pos: { x: 10, y: 10 } });
        const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        const task1 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, if0.ID, "condition", scriptName);
        await onUpdateNode(emit, projectRootDir, if1.ID, "condition", scriptName);
        await onUpdateNode(emit, projectRootDir, if2.ID, "condition", "true");
        await onUpdateNode(emit, projectRootDir, if3.ID, "condition", "(()=>{return false})()");
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);
        await onUpdateNode(emit, projectRootDir, task1.ID, "script", scriptName);
        await onAddLink(emit, projectRootDir, { src: if0.ID, dst: task0.ID, isElse: false });
        await onAddLink(emit, projectRootDir, { src: if0.ID, dst: task1.ID, isElse: true });
        await onAddLink(emit, projectRootDir, { src: if1.ID, dst: task1.ID, isElse: false });
        await onAddLink(emit, projectRootDir, { src: if1.ID, dst: task0.ID, isElse: true });
        await onAddLink(emit, projectRootDir, { src: if2.ID, dst: task0.ID, isElse: false });
        await onAddLink(emit, projectRootDir, { src: if2.ID, dst: task1.ID, isElse: true });
        await onAddLink(emit, projectRootDir, { src: if3.ID, dst: task1.ID, isElse: false });
        await onAddLink(emit, projectRootDir, { src: if3.ID, dst: task0.ID, isElse: true });
        await fs.outputFile(path.join(projectRootDir, "if0", scriptName), "#!/bin/bash\nexit 0\n");
        await fs.outputFile(path.join(projectRootDir, "if1", scriptName), "#!/bin/bash\nexit 1\n");
        await fs.outputFile(path.join(projectRootDir, "task0", scriptName), scriptPwd);
        await fs.outputFile(path.join(projectRootDir, "task1", scriptName), scriptPwd);
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
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "task1", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["not-started"] }
          }
        });
        expect(path.resolve(projectRootDir, "if0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "if1", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "if2", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "if3", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
      });
    });
    describe("task in a For component", ()=>{
      beforeEach(async()=>{
        const for0 = await onCreateNode(emit, projectRootDir, { type: "for", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, for0.ID, "start", 0);
        await onUpdateNode(emit, projectRootDir, for0.ID, "end", 2);
        await onUpdateNode(emit, projectRootDir, for0.ID, "step", 1);
        setCwd(projectRootDir, path.join(projectRootDir, "for0"));
        const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);
        await fs.outputFile(path.join(projectRootDir, "for0", "task0", scriptName), scriptPwd);
      });
      it("should run project and successfully finish", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout).to.have.been.calledThrice;
        const firstCall = dummyLogger.stdout.getCall(0);
        expect(firstCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "for0_0", "task0"));
        const secondCall = dummyLogger.stdout.getCall(1);
        expect(secondCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "for0_1", "task0"));
        const thirdCall = dummyLogger.stdout.getCall(2);
        expect(thirdCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "for0_2", "task0"));
        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;
        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0_0", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0_2", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
      });
    });
    describe("task in a While component", ()=>{
      beforeEach(async()=>{
        const while0 = await onCreateNode(emit, projectRootDir, { type: "while", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, while0.ID, "condition", "WHEEL_CURRENT_INDEX < 2");
        setCwd(projectRootDir, path.join(projectRootDir, "while0"));
        const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);
        await fs.outputFile(path.join(projectRootDir, "while0", "task0", scriptName), scriptPwd);
      });
      it("should run project and successfully finish", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout).to.have.been.calledTwice;
        const firstCall = dummyLogger.stdout.getCall(0);
        expect(firstCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "while0_0", "task0"));
        const secondCall = dummyLogger.stdout.getCall(1);
        expect(secondCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "while0_1", "task0"));
        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;
        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "while0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "while0", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "while0_0", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "while0_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
      });
    });
    describe("task in a Foreach component", ()=>{
      beforeEach(async()=>{
        const foreach0 = await onCreateNode(emit, projectRootDir, { type: "foreach", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, foreach0.ID, "indexList", ["foo", "bar", "baz", "fizz"]);
        setCwd(projectRootDir, path.join(projectRootDir, "foreach0"));
        const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);
        await fs.outputFile(path.join(projectRootDir, "foreach0", "task0", scriptName), scriptPwd);
      });
      it("should run project and successfully finish", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout.callCount).to.equal(4);
        const firstCall = dummyLogger.stdout.getCall(0);
        expect(firstCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "foreach0_foo", "task0"));
        const secondCall = dummyLogger.stdout.getCall(1);
        expect(secondCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "foreach0_bar", "task0"));
        const thirdCall = dummyLogger.stdout.getCall(2);
        expect(thirdCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "foreach0_baz", "task0"));
        const fourthCall = dummyLogger.stdout.getCall(3);
        expect(fourthCall).to.have.been.calledWithMatch(path.resolve(projectRootDir, "foreach0_fizz", "task0"));
        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;
        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "foreach0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "foreach0", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "foreach0_foo", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "foreach0_bar", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "foreach0_baz", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "foreach0_fizz", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
      });
    });
    describe("file dependency between task in the For component", ()=>{
      beforeEach(async()=>{
        const for0 = await onCreateNode(emit, projectRootDir, { type: "for", pos: { x: 10, y: 10 } });
        const parentTask0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        const parentTask1 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, for0.ID, "start", 0);
        await onUpdateNode(emit, projectRootDir, for0.ID, "end", 2);
        await onUpdateNode(emit, projectRootDir, for0.ID, "step", 1);
        await onUpdateNode(emit, projectRootDir, parentTask0.ID, "name", "parentTask0");
        await onUpdateNode(emit, projectRootDir, parentTask1.ID, "name", "parentTask1");
        await onUpdateNode(emit, projectRootDir, parentTask0.ID, "script", scriptName);
        await onUpdateNode(emit, projectRootDir, parentTask1.ID, "script", scriptName);

        await onAddOutputFile(emit, projectRootDir, parentTask0.ID, "a");
        await onAddInputFile(emit, projectRootDir, for0.ID, "b");
        await onAddOutputFile(emit, projectRootDir, for0.ID, "e");
        await onAddInputFile(emit, projectRootDir, parentTask1.ID, "f");
        await onAddFileLink(emit, projectRootDir, parentTask0.ID, "a", for0.ID, "b");
        await onAddFileLink(emit, projectRootDir, for0.ID, "e", parentTask1.ID, "f");

        setCwd(projectRootDir, path.join(projectRootDir, "for0"));
        const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);
        await onAddInputFile(emit, projectRootDir, task0.ID, "c");
        await onAddOutputFile(emit, projectRootDir, task0.ID, "d");
        await onAddFileLink(emit, projectRootDir, for0.ID, "b", task0.ID, "c");
        await onAddFileLink(emit, projectRootDir, task0.ID, "d", for0.ID, "e");

        await fs.outputFile(path.join(projectRootDir, "parentTask0", "a"), "a");
        await fs.outputFile(path.join(projectRootDir, "parentTask0", scriptName), scriptPwd);
        await fs.outputFile(path.join(projectRootDir, "parentTask1", scriptName), scriptPwd);
        await fs.outputFile(path.join(projectRootDir, "for0", "task0", scriptName), `${scriptPwd}\necho ${referenceEnv("WHEEL_CURRENT_INDEX")} > d\n`);
      });
      it("should run project and successfully finish", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout.callCount).to.equal(5);
        expect(dummyLogger.stdout.getCall(0)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "parentTask0"));
        expect(dummyLogger.stdout.getCall(1)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "for0_0", "task0"));
        expect(dummyLogger.stdout.getCall(2)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "for0_1", "task0"));
        expect(dummyLogger.stdout.getCall(3)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "for0_2", "task0"));
        expect(dummyLogger.stdout.getCall(4)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "parentTask1"));
        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;
        expect(path.resolve(projectRootDir, "parentTask0", "a")).to.be.a.file().with.content("a");
        expect(path.resolve(projectRootDir, "for0", "b")).not.to.be.a.path();
        expect(path.resolve(projectRootDir, "for0", "task0", "c")).to.be.a.file().with.content("a");
        expect(path.resolve(projectRootDir, "for0", "task0", "d")).to.be.a.file().with.content(`2${os.EOL}`);
        expect(path.resolve(projectRootDir, "for0_0", "task0", "c")).to.be.a.file().with.content("a");
        expect(path.resolve(projectRootDir, "for0_0", "task0", "d")).to.be.a.file().with.content(`0${os.EOL}`);
        expect(path.resolve(projectRootDir, "for0_1", "task0", "c")).to.be.a.file().with.content("a");
        expect(path.resolve(projectRootDir, "for0_1", "task0", "d")).to.be.a.file().with.content(`1${os.EOL}`);
        expect(path.resolve(projectRootDir, "for0_2", "task0", "c")).to.be.a.file().with.content("a");
        expect(path.resolve(projectRootDir, "for0_2", "task0", "d")).to.be.a.file().with.content(`2${os.EOL}`);
        expect(path.resolve(projectRootDir, "for0", "e")).not.to.be.a.path();
        expect(path.resolve(projectRootDir, "parentTask1", "f")).to.be.a.file().with.content(`2${os.EOL}`);

        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0_0", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0_2", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "parentTask0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "parentTask1", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
      });
    });
    describe("task in PS", ()=>{
      beforeEach(async()=>{
        const ps0 = await onCreateNode(emit, projectRootDir, { type: "PS", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, ps0.ID, "parameterFile", "input.txt.json");
        await fs.outputFile(path.join(projectRootDir, "PS0", "input.txt"), "%%KEYWORD1%%");
        const parameterSetting = {
          target_file: "input.txt",
          target_param: [
            {
              target: "hoge",
              keyword: "KEYWORD1",
              type: "integer",
              min: "1",
              max: "3",
              step: "1",
              list: ""
            }
          ]
        };
        await fs.writeJson(path.join(projectRootDir, "PS0", "input.txt.json"), parameterSetting, { spaces: 4 });

        setCwd(projectRootDir, path.join(projectRootDir, "PS0"));
        const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);
        await fs.outputFile(path.join(projectRootDir, "PS0", "task0", scriptName), scriptPwd);
      });
      it("should run project and successfully finish", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout).to.have.been.calledThrice;
        expect(dummyLogger.stdout.getCall(0)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_1", "task0"));
        expect(dummyLogger.stdout.getCall(1)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_2", "task0"));
        expect(dummyLogger.stdout.getCall(2)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_3", "task0"));
        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;
        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
      });
    });
    describe("task in PS ver.2", ()=>{
      beforeEach(async()=>{
        const ps0 = await onCreateNode(emit, projectRootDir, { type: "PS", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, ps0.ID, "parameterFile", "input.txt.json");
        setCwd(projectRootDir, path.join(projectRootDir, "PS0"));
        const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);

        await fs.outputFile(path.join(projectRootDir, "PS0", "input1.txt"), "{{ KEYWORD1 }} {{ KEYWORD3 }}");
        await fs.outputFile(path.join(projectRootDir, "PS0", "filename.txt"), "{{ filename }} {{ KEYWORD2 }}");
        await fs.outputFile(path.join(projectRootDir, "PS0", "task0", "input2.txt"), "{{ KEYWORD1 }}");
        await fs.outputFile(path.join(projectRootDir, "PS0", "testData"), "hoge");
        await fs.outputFile(path.join(projectRootDir, "PS0", "data_1"), "data_1");
        await fs.outputFile(path.join(projectRootDir, "PS0", "data_2"), "data_2");
        await fs.outputFile(path.join(projectRootDir, "PS0", "data_3"), "data_3");
        const parameterSetting = {
          version: 2,
          targetFiles: ["input1.txt", { targetNode: task0.ID, targetName: "input2.txt" }],
          target_param: [
            {
              keyword: "KEYWORD1",
              min: 1,
              max: 3,
              step: 1
            },
            {
              keyword: "KEYWORD3",
              list: ["foo", "bar"]
            },
            {
              keyword: "filename",
              files: ["data_*"]
            }

          ],
          scatter: [
            { srcName: "testData", dstNode: task0.ID, dstName: "hoge{{ KEYWORD1 }}" }
          ],
          gather: [
            { srcName: "hoge{{ KEYWORD1 }}", srcNode: task0.ID, dstName: "results/{{ KEYWORD1 }}/{{ KEYWORD3 }}_{{ filename }}/hoge" }
          ]
        };
        await fs.writeJson(path.join(projectRootDir, "PS0", "input.txt.json"), parameterSetting, { spaces: 4 });
        await fs.outputFile(path.join(projectRootDir, "PS0", "task0", scriptName), `${scriptPwd}|tee output.log\n`);
      });
      it("should run project and successfully finish", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout).to.have.been.callCount(18);
        //expect(dummyLogger.stdout).to.have.been.calledWithMatch(new RegExp(escapeRegExp(`${projectRootDir}/PS0_KEYWORD1_[123]_KEYWORD3_(foo|bar)_filename_data_[123]`)), "task0");
        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;

        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_foo_filename_data_1", "input1.txt")).to.be.a.file().with.content("1 foo");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_foo_filename_data_2", "input1.txt")).to.be.a.file().with.content("1 foo");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_foo_filename_data_3", "input1.txt")).to.be.a.file().with.content("1 foo");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_foo_filename_data_1", "input1.txt")).to.be.a.file().with.content("2 foo");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_foo_filename_data_2", "input1.txt")).to.be.a.file().with.content("2 foo");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_foo_filename_data_3", "input1.txt")).to.be.a.file().with.content("2 foo");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_foo_filename_data_1", "input1.txt")).to.be.a.file().with.content("3 foo");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_foo_filename_data_2", "input1.txt")).to.be.a.file().with.content("3 foo");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_foo_filename_data_3", "input1.txt")).to.be.a.file().with.content("3 foo");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_bar_filename_data_1", "input1.txt")).to.be.a.file().with.content("1 bar");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_bar_filename_data_2", "input1.txt")).to.be.a.file().with.content("1 bar");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_bar_filename_data_3", "input1.txt")).to.be.a.file().with.content("1 bar");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_bar_filename_data_1", "input1.txt")).to.be.a.file().with.content("2 bar");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_bar_filename_data_2", "input1.txt")).to.be.a.file().with.content("2 bar");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_bar_filename_data_3", "input1.txt")).to.be.a.file().with.content("2 bar");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_bar_filename_data_1", "input1.txt")).to.be.a.file().with.content("3 bar");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_bar_filename_data_2", "input1.txt")).to.be.a.file().with.content("3 bar");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_bar_filename_data_3", "input1.txt")).to.be.a.file().with.content("3 bar");

        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_foo_filename_data_1", "task0", "input2.txt")).to.be.a.file().with.content("1");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_foo_filename_data_2", "task0", "input2.txt")).to.be.a.file().with.content("1");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_foo_filename_data_3", "task0", "input2.txt")).to.be.a.file().with.content("1");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_foo_filename_data_1", "task0", "input2.txt")).to.be.a.file().with.content("2");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_foo_filename_data_2", "task0", "input2.txt")).to.be.a.file().with.content("2");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_foo_filename_data_3", "task0", "input2.txt")).to.be.a.file().with.content("2");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_foo_filename_data_1", "task0", "input2.txt")).to.be.a.file().with.content("3");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_foo_filename_data_2", "task0", "input2.txt")).to.be.a.file().with.content("3");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_foo_filename_data_3", "task0", "input2.txt")).to.be.a.file().with.content("3");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_bar_filename_data_1", "task0", "input2.txt")).to.be.a.file().with.content("1");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_bar_filename_data_2", "task0", "input2.txt")).to.be.a.file().with.content("1");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_bar_filename_data_3", "task0", "input2.txt")).to.be.a.file().with.content("1");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_bar_filename_data_1", "task0", "input2.txt")).to.be.a.file().with.content("2");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_bar_filename_data_2", "task0", "input2.txt")).to.be.a.file().with.content("2");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_bar_filename_data_3", "task0", "input2.txt")).to.be.a.file().with.content("2");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_bar_filename_data_1", "task0", "input2.txt")).to.be.a.file().with.content("3");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_bar_filename_data_2", "task0", "input2.txt")).to.be.a.file().with.content("3");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_bar_filename_data_3", "task0", "input2.txt")).to.be.a.file().with.content("3");

        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_foo_filename_data_1", "task0", "hoge1")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_foo_filename_data_2", "task0", "hoge1")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_foo_filename_data_3", "task0", "hoge1")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_foo_filename_data_1", "task0", "hoge2")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_foo_filename_data_2", "task0", "hoge2")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_foo_filename_data_3", "task0", "hoge2")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_foo_filename_data_1", "task0", "hoge3")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_foo_filename_data_2", "task0", "hoge3")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_foo_filename_data_3", "task0", "hoge3")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_bar_filename_data_1", "task0", "hoge1")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_bar_filename_data_2", "task0", "hoge1")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_bar_filename_data_3", "task0", "hoge1")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_bar_filename_data_1", "task0", "hoge2")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_bar_filename_data_2", "task0", "hoge2")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_bar_filename_data_3", "task0", "hoge2")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_bar_filename_data_1", "task0", "hoge3")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_bar_filename_data_2", "task0", "hoge3")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_bar_filename_data_3", "task0", "hoge3")).to.be.a.file().with.content("hoge");

        expect(path.resolve(projectRootDir, "PS0", "results", "1", "foo_data_1", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "1", "foo_data_2", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "1", "foo_data_3", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "2", "foo_data_1", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "2", "foo_data_2", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "2", "foo_data_3", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "3", "foo_data_1", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "3", "foo_data_2", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "3", "foo_data_3", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "1", "bar_data_1", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "1", "bar_data_2", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "1", "bar_data_3", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "2", "bar_data_1", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "2", "bar_data_2", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "2", "bar_data_3", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "3", "bar_data_1", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "3", "bar_data_2", "hoge")).to.be.a.file().with.content("hoge");
        expect(path.resolve(projectRootDir, "PS0", "results", "3", "bar_data_3", "hoge")).to.be.a.file().with.content("hoge");

        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });

        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_foo_filename_data_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_foo_filename_data_2", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_foo_filename_data_3", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_bar_filename_data_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_bar_filename_data_2", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1_KEYWORD3_bar_filename_data_3", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_foo_filename_data_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_foo_filename_data_2", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_foo_filename_data_3", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_bar_filename_data_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_bar_filename_data_2", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2_KEYWORD3_bar_filename_data_3", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_foo_filename_data_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_foo_filename_data_2", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_foo_filename_data_3", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_bar_filename_data_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_bar_filename_data_2", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3_KEYWORD3_bar_filename_data_3", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({ required: ["state"], properties: { state: { enum: ["finished"] } } });
      });
    });
    describe.skip("task in nested PS(does not work for now)", ()=>{
      beforeEach(async()=>{
        const ps0 = await onCreateNode(emit, projectRootDir, { type: "PS", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, ps0.ID, "parameterFile", "input.txt.json");

        setCwd(projectRootDir, path.join(projectRootDir, "PS0"));
        const ps1 = await onCreateNode(emit, projectRootDir, { type: "PS", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, ps1.ID, "name", "PS1");
        await onUpdateNode(emit, projectRootDir, ps1.ID, "parameterFile", "input.txt.json");

        setCwd(projectRootDir, path.join(projectRootDir, "PS0", "PS1"));
        const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);
        await fs.outputFile(path.join(projectRootDir, "PS0", "PS1", "task0", scriptName), scriptPwd);

        await fs.outputFile(path.join(projectRootDir, "PS0", "input.txt"), "%%KEYWORD1%%");
        await fs.outputFile(path.join(projectRootDir, "PS0", "PS1", "input.txt"), "%%KEYWORD1%%");
        const parameterSetting = {
          target_file: "input.txt",
          target_param: [
            {
              target: "hoge",
              keyword: "KEYWORD1",
              type: "integer",
              min: "1",
              max: "3",
              step: "1",
              list: ""
            }
          ]
        };
        await fs.writeJson(path.join(projectRootDir, "PS0", "input.txt.json"), parameterSetting, { spaces: 4 });
        await fs.writeJson(path.join(projectRootDir, "PS0", "PS1", "input.txt.json"), parameterSetting, { spaces: 4 });
      });
      it("should run project and successfully finish", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout.callCount).to.equal(9);
        //expect(dummyLogger.stdout.getCall(0)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_1","PS1_KEYWORD1_1", "task0"));
        //expect(dummyLogger.stdout.getCall(1)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_1","PS1_KEYWORD1_2", "task0"));
        //expect(dummyLogger.stdout.getCall(2)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_1","PS1_KEYWORD1_3", "task0"));
        //expect(dummyLogger.stdout.getCall(3)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_2","PS1_KEYWORD1_1", "task0"));
        //expect(dummyLogger.stdout.getCall(4)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_2","PS1_KEYWORD1_2", "task0"));
        //expect(dummyLogger.stdout.getCall(5)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_2","PS1_KEYWORD1_3", "task0"));
        //expect(dummyLogger.stdout.getCall(6)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_3","PS1_KEYWORD1_1", "task0"));
        //expect(dummyLogger.stdout.getCall(7)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_3","PS1_KEYWORD1_2", "task0"));
        //expect(dummyLogger.stdout.getCall(8)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_3","PS1_KEYWORD1_3", "task0"));
        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;
        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0", "PS1", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1", "PS1_KEYWORD1_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1", "PS1_KEYWORD1_2", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1", "PS1_KEYWORD1_3", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2", "PS1_KEYWORD1_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2", "PS1_KEYWORD1_2", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2", "PS1_KEYWORD1_3", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3", "PS1_KEYWORD1_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3", "PS1_KEYWORD1_2", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3", "PS1_KEYWORD1_3", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
      });
    });
    describe("task in nested loop", ()=>{
      beforeEach(async()=>{
        const for0 = await onCreateNode(emit, projectRootDir, { type: "for", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, for0.ID, "start", 0);
        await onUpdateNode(emit, projectRootDir, for0.ID, "end", 1);
        await onUpdateNode(emit, projectRootDir, for0.ID, "step", 1);

        setCwd(projectRootDir, path.join(projectRootDir, "for0"));
        const for1 = await onCreateNode(emit, projectRootDir, { type: "for", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, for1.ID, "name", "for1");
        await onUpdateNode(emit, projectRootDir, for1.ID, "start", 0);
        await onUpdateNode(emit, projectRootDir, for1.ID, "end", 1);
        await onUpdateNode(emit, projectRootDir, for1.ID, "step", 1);

        setCwd(projectRootDir, path.join(projectRootDir, "for0", "for1"));
        const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);
        await fs.outputFile(path.join(projectRootDir, "for0", "for1", "task0", scriptName), scriptPwd);
      });
      it("should run project and successfully finish", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout.callCount).to.equal(4);
        expect(dummyLogger.stdout.getCall(0)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "for0_0", "for1_0", "task0"));
        expect(dummyLogger.stdout.getCall(1)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "for0_0", "for1_1", "task0"));
        expect(dummyLogger.stdout.getCall(2)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "for0_1", "for1_0", "task0"));
        expect(dummyLogger.stdout.getCall(3)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "for0_1", "for1_1", "task0"));
        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0", "for1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0_0", "for1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0_0", "for1_0", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0_0", "for1_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0_1", "for1_0", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "for0_1", "for1_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
      });
    });
    describe("check ancestors prop in task component", ()=>{
      beforeEach(async()=>{
        const for0 = await onCreateNode(emit, projectRootDir, { type: "for", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, for0.ID, "start", 0);
        await onUpdateNode(emit, projectRootDir, for0.ID, "end", 1);
        await onUpdateNode(emit, projectRootDir, for0.ID, "step", 1);

        setCwd(projectRootDir, path.join(projectRootDir, "for0"));
        const while0 = await onCreateNode(emit, projectRootDir, { type: "while", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, while0.ID, "condition", "WHEEL_CURRENT_INDEX < 2");

        setCwd(projectRootDir, path.join(projectRootDir, "for0", "while0"));
        const wf0 = await onCreateNode(emit, projectRootDir, { type: "workflow", pos: { x: 10, y: 10 } });

        setCwd(projectRootDir, path.join(projectRootDir, "for0", "while0", "workflow0"));
        const ps0 = await onCreateNode(emit, projectRootDir, { type: "PS", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, ps0.ID, "parameterFile", "input.txt.json");
        await fs.outputFile(path.join(projectRootDir, "for0", "while0", "workflow0", "PS0", "input.txt"), "%%KEYWORD1%%");
        const parameterSetting = {
          target_file: "input.txt",
          target_param: [
            {
              target: "hoge",
              keyword: "KEYWORD1",
              type: "integer",
              min: "1",
              max: "2",
              step: "1",
              list: ""
            }
          ]
        };
        await fs.writeJson(path.join(projectRootDir, "for0", "while0", "workflow0", "PS0", "input.txt.json"), parameterSetting, { spaces: 4 });

        setCwd(projectRootDir, path.join(projectRootDir, "for0", "while0", "workflow0", "PS0"));
        const foreach0 = await onCreateNode(emit, projectRootDir, { type: "foreach", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, foreach0.ID, "indexList", ["foo", "bar"]);

        setCwd(projectRootDir, path.join(projectRootDir, "for0", "while0", "workflow0", "PS0", "foreach0"));
        const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);
        await fs.outputFile(path.join(projectRootDir, "for0", "while0", "workflow0", "PS0", "foreach0", "task0", scriptName), scriptPwd);
      });
      it("should have acestors name and type in task object", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);

        for (const i1 of ["for0_0", "for0_1"]) {
          for (const i2 of ["while0_0", "while0_1"]) {
            for (const i3 of ["PS0_KEYWORD1_1", "PS0_KEYWORD1_2"]) {
              for (const i4 of ["foreach0_foo", "foreach0_bar"]) {
                expect(path.resolve(projectRootDir, i1, i2, "workflow0", i3, i4, "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
                  required: ["state", "ancestorsName", "ancestorsType"],
                  properties: {
                    state: { enum: ["finished"] },
                    ancestorsName: { type: "string", enum: [`${i1}/${i2}/workflow0/${i3}/${i4}`] },
                    ancestorsType: { type: "string", enum: ["for/while/workflow/parameterStudy/foreach"] }
                  }
                });
              }
            }
          }
        }
      });
    });
    describe("force overwrite flag in PS", ()=>{
      beforeEach(async()=>{
        const ps0 = await onCreateNode(emit, projectRootDir, { type: "PS", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, ps0.ID, "parameterFile", "input.txt.json");
        await fs.outputFile(path.join(projectRootDir, "PS0", "input.txt"), "%%KEYWORD1%%");
        const parameterSetting = {
          target_file: "input.txt",
          target_param: [
            {
              target: "hoge",
              keyword: "KEYWORD1",
              type: "integer",
              min: "1",
              max: "3",
              step: "1",
              list: ""
            }
          ]
        };
        await fs.writeJson(path.join(projectRootDir, "PS0", "input.txt.json"), parameterSetting, { spaces: 4 });

        setCwd(projectRootDir, path.join(projectRootDir, "PS0"));
        const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
        await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);
        await fs.outputFile(path.join(projectRootDir, "PS0", "task0", scriptName), `${scriptPwd}exit 1\n`);

        //1st run
        await onRunProject(sio, projectRootDir);
        //modify run.sh
        await fs.outputFile(path.join(projectRootDir, "PS0", "task0", scriptName), `${scriptPwd}|tee result.log\n`);
        setCwd(projectRootDir, path.join(projectRootDir));
        //reset logger's call count
        dummyLogger.stdout.reset();
        dummyLogger.stderr.reset();
        dummyLogger.sshout.reset();
        dummyLogger.ssherr.reset();
      });
      it("should not overwrite files and run project ", async()=>{
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout).to.have.been.calledThrice;
        expect(dummyLogger.stdout.getCall(0)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_1", "task0"));
        expect(dummyLogger.stdout.getCall(1)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_2", "task0"));
        expect(dummyLogger.stdout.getCall(2)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_3", "task0"));
        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;
        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["failed"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["failed"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["failed"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1", "result.log")).not.to.be.a.path();
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2", "result.log")).not.to.be.a.path();
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3", "result.log")).not.to.be.a.path();
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["failed"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["failed"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["failed"] }
          }
        });
      });
      it("should overwrite files and run project ", async()=>{
        const ps0 = await fs.readJson(path.join(projectRootDir, "PS0", componentJsonFilename));
        await onUpdateNode(emit, projectRootDir, ps0.ID, "forceOverwrite", true);
        await onRunProject(sio, projectRootDir, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(dummyLogger.stdout).to.have.been.calledThrice;
        expect(dummyLogger.stdout.getCall(0)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_1", "task0"));
        expect(dummyLogger.stdout.getCall(1)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_2", "task0"));
        expect(dummyLogger.stdout.getCall(2)).to.have.been.calledWithMatch(path.resolve(projectRootDir, "PS0_KEYWORD1_3", "task0"));
        expect(dummyLogger.stderr).not.to.have.been.called;
        expect(dummyLogger.sshout).not.to.have.been.called;
        expect(dummyLogger.ssherr).not.to.have.been.called;
        expect(path.resolve(projectRootDir, projectJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3", "task0", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state"],
          properties: {
            state: { enum: ["finished"] }
          }
        });
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_1", "task0", "result.log")).to.be.a.file().with.content(`${path.resolve(projectRootDir, "PS0_KEYWORD1_1", "task0")}${os.EOL}`);
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_2", "task0", "result.log")).to.be.a.file().with.content(`${path.resolve(projectRootDir, "PS0_KEYWORD1_2", "task0")}${os.EOL}`);
        expect(path.resolve(projectRootDir, "PS0_KEYWORD1_3", "task0", "result.log")).to.be.a.file().with.content(`${path.resolve(projectRootDir, "PS0_KEYWORD1_3", "task0")}${os.EOL}`);
      });
    });
  });
});
