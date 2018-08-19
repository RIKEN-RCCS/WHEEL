const { promisify } = require("util");
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
const sio={
  of(){
    return this;
  }
};
sio.emit = sinon.stub();
const cb = sinon.stub();
const dummyLogger = {error: ()=>{}, warn: ()=>{}, info: ()=>{}, debug: ()=>{}};
const dummyVerboseLogger = {error: console.log, warn: console.log, info: console.log, debug: console.log};
home.__set__("logger", dummyLogger);

//test data
const testDirRoot = "WHEEL_TEST_TMP"
const jsonArrayManager = require("../../../app/db/jsonArrayManager");
let projectList;

//helper functions
async function setupFiles(){
    await Promise.all([
      fs.ensureDir(path.resolve(testDirRoot,"foo")),
      fs.ensureDir(path.resolve(testDirRoot,"bar")),
      fs.ensureDir(path.resolve(testDirRoot,"baz"))
    ]);
    await fs.writeJson(path.resolve(testDirRoot,"prj.wheel.json"),
      {
        name: "dummyProject",
        description: "dummy project",
        state: "not-started",
        root: path.resolve(process.cwd(), testDirRoot)
      });
    await fs.writeJson(path.resolve(testDirRoot,"baz","prj.wheel.json"),
      {
        name: "baz",
        description: "dummy project",
        state: "not-started",
        root: path.resolve(process.cwd(), testDirRoot, "baz")
      });
    await fs.writeJson(path.resolve(testDirRoot,"baz","define.wheel.json"),
      {
        name: "baz",
        type: 'workflow',
        state: "not-started",
        description: null,
        previous: [],
        next: [],
        inputFiles :[{name: null, src: []}],
        outputFiles:[{name: null, dst: []}],
        cleanupFlag: 2
      });
}

describe.only("home screen API test", function(){
  before(async function(){
    await setupFiles();
    projectList = new jsonArrayManager(path.join(testDirRoot, "testProjectList.json"), dummyLogger);
    home.__set__("projectList", projectList);
  });
  beforeEach(async function(){
    cb.reset();
    sio.emit.reset();
  });
  after(async function(){
    await fs.remove(testDirRoot);
  });

  describe("#onGetProjectList", function(){
    it("should send empty array and call cb", async function(){
      await onGetProjectList(sio.emit, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(sio.emit).to.have.been.calledOnce;
      expect(sio.emit).to.have.been.calledWith("projectList", []);
    });
  });
  describe("#onGetDirList", function(){
    it("should send all dirs in WHEEL_TEST_TMP", async function(){
      await onGetDirList(sio.emit, testDirRoot, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(sio.emit).to.have.been.calledOnce;
      expect(sio.emit.args[0][0]).to.be.equal("fileList");
      const dirList = sio.emit.args[0][1];
      expect(dirList).to.have.deep.members([
        {"path": testDirRoot, "name": "foo", "type": "dir", "islink": false},
        {"path": testDirRoot, "name": "bar", "type": "dir", "islink": false},
        {"path": testDirRoot, "name": "baz", "type": "dir", "islink": false},
        {"path": testDirRoot, "name": "../", "type": "dir", "islink": false}
      ]);
    });
  });
  describe("#onGetDirListAndProjectJson", function(){
    it("should send all dirs in WHEEL_TEST_TMP and prj.wheel.json file", async function(){
      await onGetDirListAndProjectJson(sio.emit, testDirRoot, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(true);
      expect(sio.emit).to.have.been.calledOnce;
      expect(sio.emit.args[0][0]).to.be.equal("fileList");
      const dirList = sio.emit.args[0][1];
      expect(dirList).to.have.deep.members([
        {"path": testDirRoot, "name": "foo", "type": "dir", "islink": false},
        {"path": testDirRoot, "name": "bar", "type": "dir", "islink": false},
        {"path": testDirRoot, "name": "baz", "type": "dir", "islink": false},
        {"path": testDirRoot, "name": "../", "type": "dir", "islink": false},
        {"path": testDirRoot, "name": "prj.wheel.json", "type": "file", "islink": false}
      ]);
    });
  });

  describe("test with real file operation", function(){
    afterEach(async function(){
      await fs.remove(testDirRoot);
      await setupFiles();
      projectList = new jsonArrayManager(path.join(testDirRoot, "testProjectList.json"), dummyLogger);
      home.__set__("projectList", projectList);
    });
    describe("#onAddProject", function(){
      it("should create new project directory WHEEL_TEST_TMP/foo.wheel", async function(){
        await onAddProject(sio.emit, testDirRoot+"/foo", null, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(sio.emit).to.have.been.calledOnce;
        expect(testDirRoot+"/foo.wheel").to.be.a.directory().and.have.files(["prj.wheel.json", "define.wheel.json"]);
        expect(testDirRoot+"/foo.wheel/.git").to.be.a.directory();
        const projectJSON = await fs.readJson(testDirRoot+"/foo.wheel/prj.wheel.json");
        expect(projectJSON.name).to.equal("foo");
        expect(projectJSON.description).to.equal("This is new project.");
        expect(projectJSON.root).to.equal(path.resolve(testDirRoot+"/foo.wheel"));
        const rootWF = await fs.readJson(testDirRoot+"/foo.wheel/define.wheel.json");
        expect(rootWF.type).to.equal("workflow");
        expect(rootWF.name).to.equal("foo");
        expect(rootWF.description).to.be.null;
        expect(rootWF.previous).to.be.an('array').that.is.empty;
        expect(rootWF.next).to.be.an('array').that.is.empty;
        expect(rootWF.inputFiles).to.deep.equal([{name: null, src: []}]);
        expect(rootWF.outputFiles).to.deep.equal([{name: null, dst: []}]);
        expect(projectList.getByPosition(0).path).to.be.equal(path.resolve(testDirRoot,"foo.wheel"));
        // memo idはjsonArrayManager.unshiftすれば自動的に採番されるが、
        // 今はprojectListがただたのArrayなので付与されない
        // このため、このテストではidの確認は行なわない
        // TODO jsonArrayManagerのUTでadd, unshift等全functionが機能していることを確認する
      });
    });
    describe("#onImportProject", function(){
      it("should import WHEEL_TEST_TMP/baz", async function(){
        await onImportProject(sio.emit, path.resolve(testDirRoot, "baz", "prj.wheel.json"), cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(sio.emit).to.have.been.calledOnce;
        expect(testDirRoot+"/baz.wheel").to.be.a.directory().and.have.files(["prj.wheel.json", "define.wheel.json"]);
        expect(testDirRoot+"/baz.wheel/.git").to.be.a.directory();
        const projectJSON = await fs.readJson(path.resolve(testDirRoot,"baz.wheel","prj.wheel.json"));
        expect(projectJSON.name).to.equal("baz");
        expect(projectJSON.description).to.equal("dummy project");
        expect(projectJSON.root).to.equal(path.resolve(testDirRoot,"baz.wheel"));
        const rootWF = await fs.readJson(testDirRoot+"/baz.wheel/define.wheel.json");
        expect(rootWF.type).to.equal("workflow");
        expect(rootWF.name).to.equal("baz");
        expect(rootWF.description).to.be.null;
        expect(rootWF.previous).to.be.an('array').that.is.empty;
        expect(rootWF.next).to.be.an('array').that.is.empty;
        expect(rootWF.inputFiles).to.deep.equal([{name: null, src: []}]);
        expect(rootWF.outputFiles).to.deep.equal([{name: null, dst: []}]);
        expect(projectList.getByPosition(0).path).to.be.equal(path.resolve(testDirRoot,"baz.wheel"));
      });
    });
    describe("#onRemoveProject", function(){
      before(async function(){
        await onAddProject(sio.emit, testDirRoot+"/foo", null, cb);
      });
      it("should remove project from filesystem and projectList", async function(){
        const id = projectList.getByPosition(0).id;
        await onRemoveProject(sio.emit, id, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(sio.emit).to.have.been.calledOnce;
        expect(projectList.getAll()).to.be.an('array').that.is.empty;
        expect(path.resolve(testDirRoot,"foo.wheel")).not.to.be.a.path();
      });
    });
    describe("#onRenameProject", async function(){
      before(async function(){
        await onAddProject(sio.emit, testDirRoot+"/foo", null, cb);
      });
      it("should rename project foo to foo2", async function(){
        const id = projectList.getByPosition(0).id;
        await onRenameProject(sio.emit, {id: id, newName: "foo2", path: path.resolve(testDirRoot, "foo.wheel")}, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(true);
        expect(sio.emit).to.have.been.calledOnce;
        expect(path.join(testDirRoot,"foo2.wheel")).to.be.a.directory().and.have.files(["prj.wheel.json", "define.wheel.json"]);
        expect(path.join(testDirRoot,"foo2.wheel/.git")).to.be.a.directory();
        const projectJSON = await fs.readJson(path.join(testDirRoot,"foo2.wheel/prj.wheel.json"));
        expect(projectJSON.name).to.equal("foo2");
        expect(projectJSON.description).to.equal("This is new project.");
        expect(projectJSON.root).to.equal(path.resolve(testDirRoot,"foo2.wheel"));
        const rootWF = await fs.readJson(path.join(testDirRoot,"foo2.wheel/define.wheel.json"));
        expect(rootWF.type).to.equal("workflow");
        expect(rootWF.name).to.equal("foo2");
        expect(rootWF.description).to.be.null;
        expect(rootWF.previous).to.be.an('array').that.is.empty;
        expect(rootWF.next).to.be.an('array').that.is.empty;
        expect(rootWF.inputFiles).to.deep.equal([{name: null, src: []}]);
        expect(rootWF.outputFiles).to.deep.equal([{name: null, dst: []}]);
        expect(projectList.getByPosition(0).path).to.be.equal(path.resolve(testDirRoot,"foo2.wheel"));
      });
    });
    describe("#onReorderProject ", async function(){
      beforeEach(async function(){
        await onAddProject(sio.emit, path.join(testDirRoot,"/foo"), null, cb);
        await onAddProject(sio.emit, path.join(testDirRoot,"/bar"), null, cb);
        await onImportProject(sio.emit, path.resolve(testDirRoot, "baz", "prj.wheel.json"), cb);
      });
      it("should reorder projectList", async function(){
        await onReorderProject(sio.emit, [1,0,2] ,cb)
        expect(projectList.getByPosition(0).path).to.equal(path.resolve(testDirRoot,"bar.wheel"));
        expect(projectList.getByPosition(1).path).to.equal(path.resolve(testDirRoot,"baz.wheel"));
        expect(projectList.getByPosition(2).path).to.equal(path.resolve(testDirRoot,"foo.wheel"));
      });
    });
  });
})
