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

//testee
const { cleanComponent } = require("../../../app/core/componentFilesOperator");

//test data
const testDirRoot = "WHEEL_TEST_TMP";
const projectRootDir = path.resolve(testDirRoot, "testProject.wheel");

//stubs

//helper functions
const { projectJsonFilename, componentJsonFilename } = require("../../../app/db/db");
const { createNewProject } = require("../../../app/core/projectFilesOperator");
const { createNewComponent, updateComponent } = require("../../../app/core/componentFilesOperator");
const { openProject, runProject } = require("../../../app/core/projectResource");
const { scriptName, pwdCmd } = require("./testScript");
const { gitAdd, gitCommit } = require("../../../app/core/gitOperator");


describe("test about cleaning functionality", function() {
  this.timeout(10000);
  let components;
  beforeEach(async()=>{
    await fs.remove(testDirRoot);
    await createNewProject(projectRootDir, "test project", null, "test", "test@example.com");
    await openProject(projectRootDir);

    /*
     * create dummy project with workflowEditor's function
     *
     * root--+--task0
     *       +--wf1----+---task1
     *       |         +---wf2------task2
     *
     */


    const task0 = await createNewComponent(projectRootDir, projectRootDir, "task", { x: 10, y: 10 });
    await updateComponent(projectRootDir, task0.ID, "script", scriptName);
    const wf1 = await createNewComponent(projectRootDir, projectRootDir, "workflow", { x: 10, y: 10 });
    await updateComponent(projectRootDir, wf1.ID, "name", "wf1");

    const task1 = await createNewComponent(projectRootDir, path.join(projectRootDir, "wf1"), "task", { x: 10, y: 10 });
    await updateComponent(projectRootDir, task1.ID, "name", "task1");
    await updateComponent(projectRootDir, task1.ID, "script", scriptName);
    const wf2 = await createNewComponent(projectRootDir, path.join(projectRootDir, "wf1"), "workflow", { x: 10, y: 10 });
    await updateComponent(projectRootDir, wf2.ID, "name", "wf2");

    const task2 = await createNewComponent(projectRootDir, path.join(projectRootDir, "wf1", "wf2"), "task", { x: 10, y: 10 });
    await updateComponent(projectRootDir, task2.ID, "name", "task2");
    await updateComponent(projectRootDir, task2.ID, "script", scriptName);

    await fs.outputFile(path.join(projectRootDir, "task0", scriptName), `#!/bin/bash\n${pwdCmd} |tee result\n`);
    await fs.outputFile(path.join(projectRootDir, "wf1", "task1", scriptName), `#!/bin/bash\n${pwdCmd} |tee result\n`);
    await fs.outputFile(path.join(projectRootDir, "wf1", "wf2", "task2", scriptName), `#!/bin/bash\n${pwdCmd} |tee result\n`);

    await gitAdd(projectRootDir, path.join(projectRootDir, "task0", scriptName));
    await gitAdd(projectRootDir, path.join(projectRootDir, "wf1", "task1", scriptName));
    await gitAdd(projectRootDir, path.join(projectRootDir, "wf1", "wf2", "task2", scriptName));

    await gitCommit(projectRootDir, "hoge", "huga@example.com");

    components = {
      wf1,
      wf2,
      task0,
      task1,
      task2
    };
    await runProject(projectRootDir);
  });
  after(async()=>{
    await fs.remove(testDirRoot);
  });
  it("should clean file and dirs under wf1", async()=>{
    await cleanComponent(projectRootDir, components.wf1.ID);
    expect(path.join(projectRootDir, "task0", "result")).to.be.a.file().with.content(path.join(projectRootDir, "task0") + os.EOL);
    expect(path.join(projectRootDir, "wf1", "task1", "result")).not.to.be.path();
    expect(path.join(projectRootDir, "wf1", "task1", componentJsonFilename)).to.be.a.file().with.json.using.schema({
      required: ["state", "script"],
      properties: {
        state: { enum: ["not-started"] },
        script: { enum: [scriptName] }
      }
    });
    expect(path.join(projectRootDir, "wf1", "wf2", "task2", "result")).not.to.be.path();
  });
});
