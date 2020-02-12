"use strict";
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
const Dispatcher = require("../../../app/core/dispatcher");

//test data
const testDirRoot = "WHEEL_TEST_TMP";
const projectRootDir = path.resolve(testDirRoot, "testProject.wheel");

//helper functions
const { projectJsonFilename, componentJsonFilename, statusFilename } = require("../../../app/db/db");
const { createNewProject } = require("../../../app/core/projectFilesOperator");
const { updateComponent, createNewComponent, addInputFile, addOutputFile, addLink, addFileLink } = require("../../../app/core/componentFilesOperator");

const { scriptName, pwdCmd, scriptHeader, referenceEnv, exit } = require("./testScript");
const scriptPwd = `${scriptHeader}\n${pwdCmd}`;
const { escapeRegExp } = require("../../../app/lib/utility");

const stub = sinon.stub();
const debugLogger = {
  error: sinon.stub(),
  warn: sinon.stub(),
  info: sinon.stub(),
  debug: sinon.stub(),
  trace: sinon.stub()
};

describe("UT for Dispatcher class", function() {
  this.timeout(0);
  let rootWF;
  let projectJson;
  beforeEach(async()=>{
    await fs.remove(testDirRoot);
    await createNewProject(projectRootDir, "test project", null, "test", "test@example.com");
    rootWF = await fs.readJson(path.resolve(projectRootDir, componentJsonFilename));
  });
  after(async()=>{
    await fs.remove(testDirRoot);
  });
  describe("#outputFile delivery functionality", async()=>{
    let previous;
    let next;
    beforeEach(async()=>{
      previous = await createNewComponent(projectRootDir, projectRootDir, "workflow", { x: 10, y: 10 });
      next = await createNewComponent(projectRootDir, projectRootDir, "workflow", { x: 10, y: 10 });
      projectJson = await fs.readJson(path.resolve(projectRootDir, projectJsonFilename));
    });
    it("should make link from outputFile to inputFile", async()=>{
      await addOutputFile(projectRootDir, previous.ID, "a");
      await addInputFile(projectRootDir, next.ID, "b");
      await addFileLink(projectRootDir, previous.ID, "a", next.ID, "b");
      await fs.outputFile(path.resolve(projectRootDir, previous.name, "a"), "hoge");
      const DP = new Dispatcher(projectRootDir, rootWF.ID, projectRootDir, "dummy start time", debugLogger, projectJson.componentPath, stub);
      expect(await DP.start()).to.be.equal("finished");
      expect(path.resolve(projectRootDir, next.name, "a")).not.to.be.a.path();
      expect(path.resolve(projectRootDir, next.name, "b")).to.be.a.file().and.equal(path.resolve(projectRootDir, previous.name, "a"));
    });
    it("should nothing is outputFile has glob which match nothing", async()=>{
      await addOutputFile(projectRootDir, previous.ID, "a*");
      await addInputFile(projectRootDir, next.ID, "b");
      await addFileLink(projectRootDir, previous.ID, "a*", next.ID, "b");
      const DP = new Dispatcher(projectRootDir, rootWF.ID, projectRootDir, "dummy start time", debugLogger, projectJson.componentPath, stub);
      expect(await DP.start()).to.be.equal("finished");
      expect(path.resolve(projectRootDir, next.name, "b")).not.to.be.a.path();
      expect(path.resolve(projectRootDir, next.name, "a*")).not.to.be.a.path();
    });
  });
  describe("#For component", ()=>{
    let for0;
    beforeEach(async()=>{
      for0 = await createNewComponent(projectRootDir, projectRootDir, "for", { x: 10, y: 10 });
      projectJson = await fs.readJson(path.resolve(projectRootDir, projectJsonFilename));
    });
    it("should work with negative step number", async()=>{
      await updateComponent(projectRootDir, for0.ID, "end", 0);
      await updateComponent(projectRootDir, for0.ID, "start", 2);
      await updateComponent(projectRootDir, for0.ID, "step", -1);
      const DP = new Dispatcher(projectRootDir, rootWF.ID, projectRootDir, "dummy start time", debugLogger, projectJson.componentPath, stub);
      expect(await DP.start()).to.be.equal("finished");
      expect(path.resolve(projectRootDir, `${for0.name}_0`)).to.be.a.directory();
      expect(path.resolve(projectRootDir, `${for0.name}_1`)).to.be.a.directory();
      expect(path.resolve(projectRootDir, `${for0.name}_2`)).to.be.a.directory();
      expect(path.resolve(projectRootDir, `${for0.name}_3`)).not.to.be.a.path();
      expect(path.resolve(projectRootDir, for0.name, componentJsonFilename)).to.be.a.file().with.json.using.schema({
        properties: {
          numFinishd: {
            type: "integer",
            minimum: 3,
            maximum: 3

          },
          numTotal: {
            type: "integer",
            minimum: 3,
            maximum: 3
          }
        }
      });
    });
    it("should work with step number which is greater than 1", async()=>{
      await updateComponent(projectRootDir, for0.ID, "start", 1);
      await updateComponent(projectRootDir, for0.ID, "end", 3);
      await updateComponent(projectRootDir, for0.ID, "step", 2);
      const DP = new Dispatcher(projectRootDir, rootWF.ID, projectRootDir, "dummy start time", debugLogger, projectJson.componentPath, stub);
      expect(await DP.start()).to.be.equal("finished");
      expect(path.resolve(projectRootDir, `${for0.name}_1`)).to.be.a.directory();
      expect(path.resolve(projectRootDir, `${for0.name}_2`)).not.to.be.a.path();
      expect(path.resolve(projectRootDir, `${for0.name}_3`)).to.be.a.directory();
      expect(path.resolve(projectRootDir, `${for0.name}_4`)).not.to.be.a.path();
      expect(path.resolve(projectRootDir, `${for0.name}_5`)).not.to.be.a.path();
      expect(path.resolve(projectRootDir, for0.name, componentJsonFilename)).to.be.a.file().with.json.using.schema({
        properties: {
          numFinishd: {
            type: "integer",
            minimum: 2,
            maximum: 2

          },
          numTotal: {
            type: "integer",
            minimum: 2,
            maximum: 2
          }
        }
      });
    });
    it("should work beyond 0", async()=>{
      await updateComponent(projectRootDir, for0.ID, "start", -1);
      await updateComponent(projectRootDir, for0.ID, "end", 1);
      await updateComponent(projectRootDir, for0.ID, "step", 1);
      const DP = new Dispatcher(projectRootDir, rootWF.ID, projectRootDir, "dummy start time", debugLogger, projectJson.componentPath, stub);
      expect(await DP.start()).to.be.equal("finished");
      expect(path.resolve(projectRootDir, `${for0.name}_-1`)).to.be.a.directory();
      expect(path.resolve(projectRootDir, `${for0.name}_0`)).to.be.a.directory();
      expect(path.resolve(projectRootDir, `${for0.name}_1`)).to.be.a.directory();
      expect(path.resolve(projectRootDir, `${for0.name}_2`)).not.to.be.a.path();
      expect(path.resolve(projectRootDir, for0.name, componentJsonFilename)).to.be.a.file().with.json.using.schema({
        properties: {
          numFinishd: {
            type: "integer",
            minimum: 3,
            maximum: 3

          },
          numTotal: {
            type: "integer",
            minimum: 3,
            maximum: 3
          }
        }
      });
    });
    it("should copy 3 times and back to original component", async()=>{
      await updateComponent(projectRootDir, for0.ID, "start", 0);
      await updateComponent(projectRootDir, for0.ID, "end", 2);
      await updateComponent(projectRootDir, for0.ID, "step", 1);
      const DP = new Dispatcher(projectRootDir, rootWF.ID, projectRootDir, "dummy start time", debugLogger, projectJson.componentPath, stub);
      expect(await DP.start()).to.be.equal("finished");
      expect(path.resolve(projectRootDir, `${for0.name}_0`)).to.be.a.directory();
      expect(path.resolve(projectRootDir, `${for0.name}_1`)).to.be.a.directory();
      expect(path.resolve(projectRootDir, `${for0.name}_2`)).to.be.a.directory();
      expect(path.resolve(projectRootDir, `${for0.name}_3`)).not.to.be.a.path();
      expect(path.resolve(projectRootDir, for0.name, componentJsonFilename)).to.be.a.file().with.json.using.schema({
        properties: {
          numFinishd: {
            type: "integer",
            minimum: 3,
            maximum: 3

          },
          numTotal: {
            type: "integer",
            minimum: 3,
            maximum: 3
          }
        }
      });
    });
  });
});
