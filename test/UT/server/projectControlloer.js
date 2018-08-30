const path = require("path");
const fs = require("fs-extra");

// setup test framework
const chai = require("chai");
const expect = chai.expect;
const sinon = require("sinon");
chai.use(require("sinon-chai"));
chai.use(require('chai-fs'));
chai.use(require('chai-json-schema'));
const rewire = require("rewire");

//testee
const projectController = rewire("../../../app/routes/projectController");
const onRunProject = projectController.__get__("onRunProject");

//test data
const testDirRoot = "WHEEL_TEST_TMP"
const projectRootDir = path.resolve(testDirRoot, "testProject.wheel");

// helper functions
const {projectJsonFilename, componentJsonFilename} = require("../../../app/db/db");
const home             = rewire("../../../app/routes/home");
const createNewProject = home.__get__("createNewProject");
const workflowEditor   = rewire("../../../app/routes/workflowEditor2");
const onCreateNode     = workflowEditor.__get__("onCreateNode");
const onUpdateNode     = workflowEditor.__get__("onUpdateNode");
const onAddInputFile   = workflowEditor.__get__("onAddInputFile");
const onAddOutputFile  = workflowEditor.__get__("onAddOutputFile");
const onAddLink        = workflowEditor.__get__("onAddLink");
const onAddFileLink    = workflowEditor.__get__("onAddFileLink");
const {openProject,setCwd} = require("../../../app/routes/projectResource");

//stubs
const emit = sinon.stub();
const cb = sinon.stub();
const dummySilentLogger = {error: ()=>{}, warn: ()=>{}, info: ()=>{}, debug: ()=>{}}; //default logger stub
const dummyLogger = {error: console.log, warn: ()=>{}, info: ()=>{}, debug: ()=>{}}; //show error message
const dummyVerboseLogger = {error: console.log, warn: console.log, info: console.log, debug: console.log, stdout: console.log, stderr: console.log, sshout:console.log, ssherr: console.log}; //show error message
dummyLogger.stdout=sinon.stub();
dummyLogger.stderr=sinon.stub();
dummyLogger.sshout=sinon.stub();
dummyLogger.ssherr=sinon.stub();

projectController.__set__("logger", dummyVerboseLogger);
home.__set__("logger", dummySilentLogger);
workflowEditor.__set__("logger", dummySilentLogger);

const sio={};
sio.emit = sinon.stub();
//
//TODO pass stub to askPassword for remote task test
//
describe("project Controller UT", function(){
  this.timeout(5000);
  before(async function(){
    await fs.remove(testDirRoot);
  });
  beforeEach(async function(){
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
  afterEach(async function(){
    await fs.remove(testDirRoot);
  });
  describe.only("#onRunProject", function(){
    it("should run local task workflow", async function(){
      await onCreateNode(emit, projectRootDir, {type: "task", pos: {x: 10, y: 10}});
      const task0 = await fs.readJson(path.join(projectRootDir, "task0", componentJsonFilename));
      await onUpdateNode(emit, projectRootDir, task0.ID, "script", "run.sh");
      await fs.outputFile(path.join(projectRootDir, "task0", "run.sh"),"#!/bin/bash\npwd\n");

      // actual test start here
      await onRunProject(sio, projectRootDir, cb);

      // assersions
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(dummyLogger.stdout).to.have.been.calledOnce;
      expect(dummyLogger.stdout).to.have.been.calledWith(path.resolve(projectRootDir, "task0"));
      expect(dummyLogger.stderr).not.to.have.been.called;
      expect(dummyLogger.sshout).not.to.have.been.called;
      expect(dummyLogger.ssherr).not.to.have.been.called;
    });
  });
});
