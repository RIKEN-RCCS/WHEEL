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
const workflowEditor = rewire("../../../app/routes/workflowEditor2");
const onCleanComponent = workflowEditor.__get__("onCleanComponent");

//test data
const testDirRoot = "WHEEL_TEST_TMP";
const projectRootDir = path.resolve(testDirRoot, "testProject.wheel");

//stubs
const emit = sinon.stub();
const cb = sinon.stub();
const sio = {};
sio.emit = sinon.stub();

//helper functions
const { projectJsonFilename, componentJsonFilename } = require("../../../app/db/db");
const home = rewire("../../../app/routes/home");
const createNewProject = home.__get__("createNewProject");
const onCreateNode = workflowEditor.__get__("onCreateNode");
const onUpdateNode = workflowEditor.__get__("onUpdateNode");
const onAddInputFile = workflowEditor.__get__("onAddInputFile");
const onAddOutputFile = workflowEditor.__get__("onAddOutputFile");
const onAddLink = workflowEditor.__get__("onAddLink");
const onAddFileLink = workflowEditor.__get__("onAddFileLink");
const { openProject, setCwd } = require("../../../app/routes/projectResource");
const projectController = rewire("../../../app/routes/projectController");
const onRunProject = projectController.__get__("onRunProject");
const { getComponentDir } = require("../../../app/routes/workflowUtil");
const {scriptName, pwdCmd} = require("./testScript");


describe("test about cleaning functionality", function (){
  this.timeout(10000);
  let components;
  const projectRootDir = path.resolve(testDirRoot, "testProject.wheel");
  beforeEach(async()=>{
    await fs.remove(testDirRoot);
    await createNewProject(projectRootDir, "dummy project");
    await openProject(projectRootDir);

    /*
     * create dummy project with workflowEditor's function
     *
     * root--+--task0
     *       +--wf1----+---task1
     *       |         +---wf2------task2
     *
     */


    const task0 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
    await onUpdateNode(emit, projectRootDir, task0.ID, "script", scriptName);
    const wf1 = await onCreateNode(emit, projectRootDir, { type: "workflow", pos: { x: 10, y: 10 } });
    await onUpdateNode(emit, projectRootDir, wf1.ID, "name", "wf1");

    setCwd(projectRootDir, path.join(projectRootDir, "wf1"));
    const task1 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
    await onUpdateNode(emit, projectRootDir, task1.ID, "name", "task1");
    await onUpdateNode(emit, projectRootDir, task1.ID, "script", scriptName);
    const wf2 = await onCreateNode(emit, projectRootDir, { type: "workflow", pos: { x: 10, y: 10 } });
    await onUpdateNode(emit, projectRootDir, wf2.ID, "name", "wf2");

    setCwd(projectRootDir, path.join(projectRootDir, "wf1", "wf2"));
    const task2 = await onCreateNode(emit, projectRootDir, { type: "task", pos: { x: 10, y: 10 } });
    await onUpdateNode(emit, projectRootDir, task2.ID, "name", "task2");
    await onUpdateNode(emit, projectRootDir, task2.ID, "script", scriptName);

    setCwd(projectRootDir, projectRootDir);

    await fs.outputFile(path.join(projectRootDir, "task0", scriptName),               `#!/bin/bash\n${pwdCmd} |tee result\n`);
    await fs.outputFile(path.join(projectRootDir, "wf1", "task1", scriptName),        `#!/bin/bash\n${pwdCmd} |tee result\n`);
    await fs.outputFile(path.join(projectRootDir, "wf1", "wf2", "task2", scriptName), `#!/bin/bash\n${pwdCmd} |tee result\n`);

    components = {
      wf1,
      wf2,
      task0,
      task1,
      task2
    };
    await onRunProject(sio, projectRootDir);

    cb.reset();
    emit.reset();
  });
  after(async()=>{
    await fs.remove(testDirRoot);
  });
  it("should clean only under wf1", async()=>{
    await onCleanComponent(emit, projectRootDir, components.wf1.ID, cb);
    expect(cb).to.have.been.calledOnce;
    expect(cb).to.have.been.calledWith(true);
    expect(emit).to.have.been.calledOnce;
    expect(emit).to.have.been.calledWith("workflow");
    expect(path.join(projectRootDir, "task0", "result")).to.be.a.file().with.content(path.join(projectRootDir, "task0")+os.EOL);
    expect(path.join(projectRootDir, "wf1", "task1", "result")).not.to.be.path();
    expect(path.join(projectRootDir, "wf1", "task1", componentJsonFilename)).to.be.a.file().with.json.using.schema({
          required: ["state", "script"],
          properties: {
            state: { enum: ["not-started"] },
            script: { enum: [scriptName]}
          }
    });
    expect(path.join(projectRootDir, "wf1", "wf2", "task2", "result")).not.to.be.path();
  });
});
