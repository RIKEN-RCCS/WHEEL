const path = require("path");
const fs = require("fs-extra");

//setup test framework
const chai = require("chai");
const { expect } = require("chai");
const sinon = require("sinon");
chai.use(require("sinon-chai"));
chai.use(require("chai-fs"));
chai.use(require("chai-json-schema"));
const rewire = require("rewire");

//testee
const home = rewire("../../../app/routes/home");
const onGetProjectList = home.__get__("onGetProjectList");
const onGetDirList = home.__get__("onGetDirList");
const onGetDirListAndProjectJson = home.__get__("onGetDirListAndProjectJson");
const onAddProject = home.__get__("onAddProject");
const onImportProject = home.__get__("onImportProject");
const onRemoveProject = home.__get__("onRemoveProject");
const onRenameProject = home.__get__("onRenameProject");
const onReorderProject = home.__get__("onReorderProject");

//stubs
const emit = sinon.stub();
const cb = sinon.stub();
const sio = {
  of() {
    return this;
  }
};
sio.emit = emit;

const logger = home.__get__("logger");
logger.addContext("sio", sio);

//test data
const testDirRoot = "WHEEL_TEST_TMP";
const jsonArrayManager = require("../../../app/db/jsonArrayManager");
const { projectJsonFilename, componentJsonFilename } = require("../../../app/db/db");
let projectList;

//helper functions
const getSchema = require("../../../app/db/jsonSchemas");

/*
 *
 *   root-+-- foo
 *        +-- bar
 *        +-- baz
 *        |    +-- projectJsonFilename
 *        |    +-- componentJsonFilename
 *        +-- baz2
 *        |    +-- projectJsonFilename
 *        +-- projectJsonFilename
 */
async function setupFiles() {
  await Promise.all([
    fs.ensureDir(path.resolve(testDirRoot, "foo")),
    fs.ensureDir(path.resolve(testDirRoot, "bar")),
    fs.ensureDir(path.resolve(testDirRoot, "baz")),
    fs.ensureDir(path.resolve(testDirRoot, "baz2"))
  ]);
  await fs.writeJson(path.resolve(testDirRoot, projectJsonFilename),
    {
      name: "dummyProject",
      description: "dummy project",
      state: "not-started",
      root: path.resolve(process.cwd(), testDirRoot)
    });
  await fs.writeJson(path.resolve(testDirRoot, "baz", projectJsonFilename),
    {
      name: "baz",
      description: "dummy project",
      state: "not-started",
      root: path.resolve(process.cwd(), testDirRoot, "baz")
    });
  await fs.writeJson(path.resolve(testDirRoot, "baz2", projectJsonFilename),
    {
      name: "baz",
      description: "dummy project",
      state: "not-started",
      root: path.resolve(process.cwd(), testDirRoot, "baz2")
    });
  await fs.writeJson(path.resolve(testDirRoot, "baz", componentJsonFilename),
    {
      name: "baz",
      type: "workflow",
      state: "not-started",
      description: null,
      previous: [],
      next: [],
      inputFiles: [],
      outputFiles: [],
      cleanupFlag: 2
    });
  await fs.writeJson(path.resolve(testDirRoot, "baz2", componentJsonFilename),
    {
      name: "baz",
      type: "workflow",
      state: "not-started",
      description: null,
      previous: [],
      next: [],
      inputFiles: [],
      outputFiles: [],
      cleanupFlag: 2
    });
}

describe("home screen API test", ()=>{
  beforeEach(async()=>{
    await fs.remove(testDirRoot);
    await setupFiles();
    projectList = new jsonArrayManager(path.join(testDirRoot, "testProjectList.json"));
    home.__set__("projectList", projectList);
    cb.reset();
    emit.reset();
  });
  after(async()=>{
    await fs.remove(testDirRoot);
  });

  describe("#onGetProjectList", ()=>{
    it("should send empty array and call cb", async()=>{
      await onGetProjectList(emit, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("projectList", []);
    });
  });
  describe("#onGetDirList", ()=>{
    it("should send all dirs in WHEEL_TEST_TMP", async()=>{
      await onGetDirList(emit, testDirRoot, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit.args[0][0]).to.be.equal("fileList");
      const dirList = emit.args[0][1];
      expect(dirList).to.have.deep.members([
        { path: path.resolve(testDirRoot), name: "foo", type: "dir", islink: false },
        { path: path.resolve(testDirRoot), name: "bar", type: "dir", islink: false },
        { path: path.resolve(testDirRoot), name: "baz", type: "dir", islink: false },
        { path: path.resolve(testDirRoot), name: "baz2", type: "dir", islink: false },
        { path: path.resolve(testDirRoot), name: "../", type: "dir", islink: false }
      ]);
    });
  });
  describe("#onGetDirListAndProjectJson", ()=>{
    it("should send all dirs in WHEEL_TEST_TMP and project Json file", async()=>{
      await onGetDirListAndProjectJson(emit, testDirRoot, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit.args[0][0]).to.be.equal("fileList");
      const dirList = emit.args[0][1];
      expect(dirList).to.have.deep.members([
        { path: path.resolve(testDirRoot), name: "foo", type: "dir", islink: false },
        { path: path.resolve(testDirRoot), name: "bar", type: "dir", islink: false },
        { path: path.resolve(testDirRoot), name: "baz", type: "dir", islink: false },
        { path: path.resolve(testDirRoot), name: "baz2", type: "dir", islink: false },
        { path: path.resolve(testDirRoot), name: "../", type: "dir", islink: false },
        { path: path.resolve(testDirRoot), name: projectJsonFilename, type: "file", islink: false }
      ]);
    });
  });
  describe("#onAddProject", ()=>{
    it("should create new project directory WHEEL_TEST_TMP/foo.wheel", async()=>{
      await onAddProject(emit, `${testDirRoot}/foo`, null, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(path.join(testDirRoot, "foo.wheel")).to.be.a.directory().and.have.files([projectJsonFilename, componentJsonFilename]);
      expect(path.join(testDirRoot, "foo.wheel", ".git")).to.be.a.directory();
      expect(path.join(testDirRoot, "foo.wheel", projectJsonFilename)).to.be.a.file().with.json.using.schema({
        required: ["name", "description", "root", "version"],
        name: { enum: ["foo"] },
        description: { enum: ["This is new project."] },
        root: { enum: [path.resolve(testDirRoot, "foo.wheel")] },
        version: { enum: [2] }
      });
      const rootWFSchema = getSchema("workflow", "foo");
      expect(path.join(testDirRoot, "foo.wheel", componentJsonFilename)).to.be.a.file().with.json.using.schema(rootWFSchema);
      const rootWF = await fs.readJson(path.join(testDirRoot, "foo.wheel", componentJsonFilename));
      expect(rootWF.description).to.be.null;
      expect(rootWF.previous).to.be.an("array").that.is.empty;
      expect(rootWF.next).to.be.an("array").that.is.empty;
      expect(rootWF.inputFiles).to.be.an("array").that.is.empty;
      expect(rootWF.outputFiles).to.be.an("array").that.is.empty;
      expect(projectList.getByPosition(0).path).to.be.equal(path.resolve(testDirRoot, "foo.wheel"));
    });
    it("should not create new project which has the same name as any other existing project", async()=>{
      await onAddProject(emit, `${testDirRoot}/foo`, null);
      fs.ensureDir(path.resolve(testDirRoot, "bar", "foo")),
      await onAddProject(emit, `${testDirRoot}/bar/foo`, null, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(false);
      expect(emit).to.have.been.calledOnce;
      expect(path.join(testDirRoot, "bar", "foo.wheel")).not.to.be.a.path;
    });
  });
  describe("#onImportProject", ()=>{
    it("should import WHEEL_TEST_TMP/baz", async()=>{
      await onImportProject(emit, path.resolve(testDirRoot, "baz", projectJsonFilename), cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(path.join(testDirRoot, "baz.wheel", ".git")).to.be.a.directory();
      expect(path.join(testDirRoot, "baz.wheel", projectJsonFilename)).to.be.a.file().with.json.using.schema({
        properties: {
          name: { enum: ["baz"] },
          root: { enum: [path.resolve(testDirRoot, "baz.wheel")] },
          description: { enum: ["dummy project"] },
          required: ["name", "root"]
        }
      });
      expect(path.join(testDirRoot, "baz.wheel", componentJsonFilename)).to.be.a.file().with.json.using.schema({
        properties: {
          required: ["type", "name", "description", "previous", "next", "inputFiles", "outputFiles"],
          type: { enum: ["workflow"] },
          name: { enum: ["baz"] },
          state: { enum: ["not-started"] },
          description: { type: "null" },
          previous: { type: "array", minItems: 0, maxItems: 0 },
          next: { type: "array", minItems: 0, maxItems: 0 },
          inputFiles: { type: "array", minItems: 0, maxItems: 0 },
          outputFiles: { type: "array", minItems: 0, maxItems: 0 }
        }
      });
      expect(projectList.getByPosition(0).path).to.be.equal(path.resolve(testDirRoot, "baz.wheel"));
    });
    it("should import WHEEL_TEST_TMP/baz2 and rename it to baz0.wheel", async()=>{
      await onImportProject(sinon.stub(), path.resolve(testDirRoot, "baz", projectJsonFilename));
      await onImportProject(emit, path.resolve(testDirRoot, "baz2", projectJsonFilename), cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(path.join(testDirRoot, "baz0.wheel", ".git")).to.be.a.directory();
      expect(path.join(testDirRoot, "baz0.wheel", projectJsonFilename)).to.be.a.file().with.json.using.schema({
        properties: {
          name: { enum: ["baz0"] },
          root: { enum: [path.resolve(testDirRoot, "baz0.wheel")] },
          description: { enum: ["dummy project"] },
          required: ["name", "root", "description"]
        }
      });
      expect(path.join(testDirRoot, "baz0.wheel", componentJsonFilename)).to.be.a.file().with.json.using.schema({
        properties: {
          required: ["type", "name", "description", "previous", "next", "inputFiles", "outputFiles"],
          type: { enum: ["workflow"] },
          name: { enum: ["baz0"] },
          state: { enum: ["not-started"] },
          description: { type: "null" },
          previous: { type: "array", minItems: 0, maxItems: 0 },
          next: { type: "array", minItems: 0, maxItems: 0 },
          inputFiles: { type: "array", minItems: 0, maxItems: 0 },
          outputFiles: { type: "array", minItems: 0, maxItems: 0 }
        }
      });
      expect(projectList.getByPosition(0).path).to.be.equal(path.resolve(testDirRoot, "baz0.wheel"));
    });
  });
  describe("#onRemoveProject", ()=>{
    beforeEach(async()=>{
      await onAddProject(sinon.stub(), path.join(testDirRoot, "foo"), null);
    });
    it("should remove project from filesystem and projectList", async()=>{
      const id = projectList.getByPosition(0).id;
      await onRemoveProject(emit, id, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(projectList.getAll()).to.be.an("array").that.is.empty;
      expect(path.resolve(testDirRoot, "foo.wheel")).not.to.be.a.path();
    });
  });
  describe("#onRenameProject", async()=>{
    beforeEach(async()=>{
      await onAddProject(sinon.stub(), path.join(testDirRoot, "foo"), null);
    });
    it("should rename project foo to foo2", async()=>{
      const id = projectList.getByPosition(0).id;
      await onRenameProject(emit, { id, newName: "foo2", path: path.resolve(testDirRoot, "foo.wheel") }, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(path.join(testDirRoot, "foo2.wheel")).to.be.a.directory().and.have.files([projectJsonFilename, componentJsonFilename]);
      expect(path.join(testDirRoot, "foo2.wheel/.git")).to.be.a.directory();
      const projectJSON = await fs.readJson(path.join(testDirRoot, "foo2.wheel", projectJsonFilename));
      expect(projectJSON.name).to.equal("foo2");
      expect(projectJSON.description).to.equal("This is new project.");
      expect(projectJSON.root).to.equal(path.resolve(testDirRoot, "foo2.wheel"));
      const rootWF = await fs.readJson(path.join(testDirRoot, "foo2.wheel", componentJsonFilename));
      expect(rootWF.type).to.equal("workflow");
      expect(rootWF.name).to.equal("foo2");
      expect(rootWF.description).to.be.null;
      expect(rootWF.previous).to.be.an("array").that.is.empty;
      expect(rootWF.next).to.be.an("array").that.is.empty;
      expect(rootWF.inputFiles).to.be.an("array").that.is.empty;
      expect(rootWF.outputFiles).to.be.an("array").that.is.empty;
      expect(projectList.getByPosition(0).path).to.be.equal(path.resolve(testDirRoot, "foo2.wheel"));
    });
  });
  describe("#onReorderProject ", async()=>{
    beforeEach(async()=>{
      await onAddProject(sinon.stub(), path.join(testDirRoot, "foo"), null);
      await onAddProject(sinon.stub(), path.join(testDirRoot, "bar"), null);
      await onImportProject(sinon.stub(), path.resolve(testDirRoot, "baz", projectJsonFilename));
    });
    it("should reorder projectList", async()=>{
      await onReorderProject(emit, [1, 0, 2], cb);
      expect(projectList.getByPosition(0).path).to.equal(path.resolve(testDirRoot, "bar.wheel"));
      expect(projectList.getByPosition(1).path).to.equal(path.resolve(testDirRoot, "baz.wheel"));
      expect(projectList.getByPosition(2).path).to.equal(path.resolve(testDirRoot, "foo.wheel"));
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
    });
  });
});
