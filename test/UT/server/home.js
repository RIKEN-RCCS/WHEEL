const path = require("path");
const fs = require("fs-extra");

// setup test framework
const chai = require("chai");
const { expect } = require("chai");
const sinon = require("sinon");
chai.use(require("sinon-chai"));
chai.use(require('chai-fs'));
const rewire = require("rewire");

//testee
const home = rewire("../../../app/routes/home");
const onGetProjectList            = home.__get__("onGetProjectList");
const onGetDirList                = home.__get__("onGetDirList");
const onGetDirListAndProjectJson  = home.__get__("onGetDirListAndProjectJson");
const onAddProject                = home.__get__("onAddProject");
const onImportProject             = home.__get__("onImportProject");
const onRemoveProject             = home.__get__("onRemoveProject");
const onRenameProject             = home.__get__("onRenameProject");
const onReorderProject            = home.__get__("onReorderProject");

//stubs
const emit = sinon.stub();
const cb = sinon.stub();
const dummySilentLogger = {error: ()=>{}, warn: ()=>{}, info: ()=>{}, debug: ()=>{}};
const dummyLogger = {error: console.log, warn: ()=>{}, info: ()=>{}, debug: ()=>{}};
const dummyVerboseLogger = {error: console.log, warn: console.log, info: console.log, debug: console.log};
home.__set__("logger", dummySilentLogger);

//test data
const testDirRoot = "WHEEL_TEST_TMP"
const jsonArrayManager = require("../../../app/db/jsonArrayManager");
const {projectJsonFilename, componentJsonFilename} = require("../../../app/db/db");
let projectList;

//helper functions
async function setupFiles(){
    await Promise.all([
      fs.ensureDir(path.resolve(testDirRoot,"foo")),
      fs.ensureDir(path.resolve(testDirRoot,"bar")),
      fs.ensureDir(path.resolve(testDirRoot,"baz"))
    ]);
    await fs.writeJson(path.resolve(testDirRoot,projectJsonFilename),
      {
        name: "dummyProject",
        description: "dummy project",
        state: "not-started",
        root: path.resolve(process.cwd(), testDirRoot)
      });
    await fs.writeJson(path.resolve(testDirRoot,"baz",projectJsonFilename),
      {
        name: "baz",
        description: "dummy project",
        state: "not-started",
        root: path.resolve(process.cwd(), testDirRoot, "baz")
      });
    await fs.writeJson(path.resolve(testDirRoot,"baz",componentJsonFilename),
      {
        name: "baz",
        type: 'workflow',
        state: "not-started",
        description: null,
        previous: [],
        next: [],
        inputFiles :[],
        outputFiles:[],
        cleanupFlag: 2
      });
}

describe("home screen API test", function(){
  before(async function(){
    await setupFiles();
    projectList = new jsonArrayManager(path.join(testDirRoot, "testProjectList.json"));
    home.__set__("projectList", projectList);
  });
  beforeEach(async function(){
    cb.reset();
    emit.reset();
  });
  after(async function(){
    await fs.remove(testDirRoot);
  });

  describe("#onGetProjectList", function(){
    it("should send empty array and call cb", async function(){
      await onGetProjectList(emit, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit).to.have.been.calledWith("projectList", []);
    });
  });
  describe("#onGetDirList", function(){
    it("should send all dirs in WHEEL_TEST_TMP", async function(){
      await onGetDirList(emit, testDirRoot, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit.args[0][0]).to.be.equal("fileList");
      const dirList = emit.args[0][1];
      expect(dirList).to.have.deep.members([
        {"path": path.resolve( testDirRoot ), "name": "foo", "type": "dir", "islink": false},
        {"path": path.resolve( testDirRoot ), "name": "bar", "type": "dir", "islink": false},
        {"path": path.resolve( testDirRoot ), "name": "baz", "type": "dir", "islink": false},
        {"path": path.resolve( testDirRoot ), "name": "../", "type": "dir", "islink": false}
      ]);
    });
  });
  describe("#onGetDirListAndProjectJson", function(){
    it("should send all dirs in WHEEL_TEST_TMP and project Json file", async function(){
      await onGetDirListAndProjectJson(emit, testDirRoot, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(emit).to.have.been.calledOnce;
      expect(emit.args[0][0]).to.be.equal("fileList");
      const dirList = emit.args[0][1];
      expect(dirList).to.have.deep.members([
        {"path": path.resolve( testDirRoot ), "name": "foo", "type": "dir", "islink": false},
        {"path": path.resolve( testDirRoot ), "name": "bar", "type": "dir", "islink": false},
        {"path": path.resolve( testDirRoot ), "name": "baz", "type": "dir", "islink": false},
        {"path": path.resolve( testDirRoot ), "name": "../", "type": "dir", "islink": false},
        {"path": path.resolve( testDirRoot ), "name": projectJsonFilename, "type": "file", "islink": false}
      ]);
    });
  });

  describe("test with real file operation", function(){
    afterEach(async function(){
      await fs.remove(testDirRoot);
      await setupFiles();
      projectList = new jsonArrayManager(path.join(testDirRoot, "testProjectList.json"));
      home.__set__("projectList", projectList);
    });
    describe("#onAddProject", function(){
      it("should create new project directory WHEEL_TEST_TMP/foo.wheel", async function(){
        await onAddProject(emit, testDirRoot+"/foo", null, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(emit).to.have.been.calledOnce;
        expect(testDirRoot+"/foo.wheel").to.be.a.directory().and.have.files([projectJsonFilename, componentJsonFilename]);
        expect(testDirRoot+"/foo.wheel/.git").to.be.a.directory();
        const projectJSON = await fs.readJson(path.join(testDirRoot,"foo.wheel", projectJsonFilename));
        expect(projectJSON.name).to.equal("foo");
        expect(projectJSON.description).to.equal("This is new project.");
        expect(projectJSON.root).to.equal(path.resolve(testDirRoot,"foo.wheel"));
        const rootWF = await fs.readJson(path.join(testDirRoot,"foo.wheel", componentJsonFilename));
        expect(rootWF.type).to.equal("workflow");
        expect(rootWF.name).to.equal("foo");
        expect(rootWF.description).to.be.null;
        expect(rootWF.previous).to.be.an('array').that.is.empty;
        expect(rootWF.next).to.be.an('array').that.is.empty;
        expect(rootWF.inputFiles).to.be.an('array').that.is.empty;
        expect(rootWF.outputFiles).to.be.an('array').that.is.empty;
        expect(projectList.getByPosition(0).path).to.be.equal(path.resolve(testDirRoot,"foo.wheel"));
      });
    });
    describe("#onImportProject", function(){
      it("should import WHEEL_TEST_TMP/baz", async function(){
        await onImportProject(emit, path.resolve(testDirRoot, "baz", projectJsonFilename), cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(emit).to.have.been.calledOnce;
        expect(testDirRoot+"/baz.wheel").to.be.a.directory().and.have.files([projectJsonFilename, componentJsonFilename]);
        expect(testDirRoot+"/baz.wheel/.git").to.be.a.directory();
        const projectJSON = await fs.readJson(path.resolve(testDirRoot,"baz.wheel",projectJsonFilename));
        expect(projectJSON.name).to.equal("baz");
        expect(projectJSON.description).to.equal("dummy project");
        expect(projectJSON.root).to.equal(path.resolve(testDirRoot,"baz.wheel"));
        const rootWF = await fs.readJson(path.join(testDirRoot,"baz.wheel",componentJsonFilename));
        expect(rootWF.type).to.equal("workflow");
        expect(rootWF.name).to.equal("baz");
        expect(rootWF.description).to.be.null;
        expect(rootWF.previous).to.be.an('array').that.is.empty;
        expect(rootWF.next).to.be.an('array').that.is.empty;
        expect(rootWF.inputFiles).to.be.an('array').that.is.empty;
        expect(rootWF.outputFiles).to.be.an('array').that.is.empty;
        expect(projectList.getByPosition(0).path).to.be.equal(path.resolve(testDirRoot,"baz.wheel"));
      });
    });
    describe("#onRemoveProject", function(){
      before(async function(){
        await onAddProject(emit, testDirRoot+"/foo", null, cb);
      });
      it("should remove project from filesystem and projectList", async function(){
        const id = projectList.getByPosition(0).id;
        await onRemoveProject(emit, id, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(emit).to.have.been.calledOnce;
        expect(projectList.getAll()).to.be.an('array').that.is.empty;
        expect(path.resolve(testDirRoot,"foo.wheel")).not.to.be.a.path();
      });
    });
    describe("#onRenameProject", async function(){
      before(async function(){
        await onAddProject(emit, path.join(testDirRoot,"foo"), null, cb);
      });
      it("should rename project foo to foo2", async function(){
        const id = projectList.getByPosition(0).id;
        await onRenameProject(emit, {id: id, newName: "foo2", path: path.resolve(testDirRoot, "foo.wheel")}, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(emit).to.have.been.calledOnce;
        expect(path.join(testDirRoot,"foo2.wheel")).to.be.a.directory().and.have.files([projectJsonFilename, componentJsonFilename]);
        expect(path.join(testDirRoot,"foo2.wheel/.git")).to.be.a.directory();
        const projectJSON = await fs.readJson(path.join(testDirRoot,"foo2.wheel",projectJsonFilename));
        expect(projectJSON.name).to.equal("foo2");
        expect(projectJSON.description).to.equal("This is new project.");
        expect(projectJSON.root).to.equal(path.resolve(testDirRoot,"foo2.wheel"));
        const rootWF = await fs.readJson(path.join(testDirRoot,"foo2.wheel",componentJsonFilename));
        expect(rootWF.type).to.equal("workflow");
        expect(rootWF.name).to.equal("foo2");
        expect(rootWF.description).to.be.null;
        expect(rootWF.previous).to.be.an('array').that.is.empty;
        expect(rootWF.next).to.be.an('array').that.is.empty;
        expect(rootWF.inputFiles).to.be.an('array').that.is.empty;
        expect(rootWF.outputFiles).to.be.an('array').that.is.empty;
        expect(projectList.getByPosition(0).path).to.be.equal(path.resolve(testDirRoot,"foo2.wheel"));
      });
    });
    describe("#onReorderProject ", async function(){
      beforeEach(async function(){
        await onAddProject(emit, path.join(testDirRoot,"/foo"), null, cb);
        await onAddProject(emit, path.join(testDirRoot,"/bar"), null, cb);
        await onImportProject(emit, path.resolve(testDirRoot, "baz", projectJsonFilename), cb);
        cb.reset();
      });
      it("should reorder projectList", async function(){
        await onReorderProject(emit, [1,0,2] ,cb)
        expect(projectList.getByPosition(0).path).to.equal(path.resolve(testDirRoot,"bar.wheel"));
        expect(projectList.getByPosition(1).path).to.equal(path.resolve(testDirRoot,"baz.wheel"));
        expect(projectList.getByPosition(2).path).to.equal(path.resolve(testDirRoot,"foo.wheel"));
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
      });
    });
  });
})
