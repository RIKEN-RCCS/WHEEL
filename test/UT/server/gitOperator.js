const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const {promisify} = require("util");
const {execFile}  = require("child_process");
const asyncExecFile = promisify(execFile);

//setup test framework
const chai = require("chai");
const expect = chai.expect;
const sinon = require("sinon");
chai.use(require("sinon-chai"));
chai.use(require("chai-fs"));

//helper function
const {escapeRegExp}=require("../../../app/lib/utility.js");

//display detailed information of unhandled rejection
process.on("unhandledRejection", console.dir);

//testee
const {
  gitInit,
  gitCommit,
  gitAdd,
  gitRm,
  gitResetHEAD
}=require("../../../app/core/gitOperator.js");

//test data
const testDirRoot = "WHEEL_TEST_TMP";
const projectRootDir = path.resolve(testDirRoot, "testProject.wheel");


describe("git operator UT", function() {
  after(async()=>{
    await fs.remove(testDirRoot);
  });
  beforeEach(async()=>{
    await fs.remove(testDirRoot);
    await gitInit(testDirRoot, "testUser", "testUser@example.com");
  });
  describe("#gitInit", ()=>{
    it("should be rejected when attempting to init again", ()=>{
      return expect(gitInit(testDirRoot, "testUser", "testUser@example.com")).to.be.eventually.rejected;
    });
    it("should initialize git repo on nonExisting directory", async ()=>{
      const newRepoDir = path.resolve(testDirRoot,"hoge")
      await gitInit(newRepoDir, "testUser", "testUser@example.com");
      expect(newRepoDir).to.be.a.directory().with.contents([".git"]);
    });
    it("should initialize git repo on existing directory", async ()=>{
      const newRepoDir = path.resolve(testDirRoot,"hoge");
      await fs.mkdir(newRepoDir);
      expect(newRepoDir).to.be.a.directory().and.empty;
      await gitInit(newRepoDir, "testUser", "testUser@example.com");
      expect(newRepoDir).to.be.a.directory().with.contents([".git"]);
    });
  });
  describe("#gitAdd", ()=>{
    beforeEach(async ()=>{
      await Promise.all([
        fs.outputFile(path.resolve(testDirRoot,"hoge","huga","hige"), "hige"),
        fs.outputFile(path.resolve(testDirRoot,"foo"), "foo"),
        fs.outputFile(path.resolve(testDirRoot,"bar"), "bar"),
        fs.outputFile(path.resolve(testDirRoot,"baz"), "baz")
      ]);
    });
    it("should add one file to index", async()=>{
      await gitAdd(testDirRoot, "foo");
      const {stdout, stderr} = await asyncExecFile("git", ["status", "--short"], {cwd: testDirRoot})
        .catch((e)=>{
          console.log("ERROR:\n",e);
        });
      [
        "A  foo",
        "?? bar",
        "?? baz",
        "?? hoge/"
      ].forEach((e)=>{
        expect(stdout).to.match(new RegExp(String.raw`^${escapeRegExp(e)}$`,"m"));
      });
    });
    it("should add directory and its component to index", async()=>{
      await gitAdd(testDirRoot, "hoge");
      const {stdout, stderr} = await asyncExecFile("git", ["status", "--short"], {cwd: testDirRoot})
        .catch((e)=>{
          console.log("ERROR:\n",e);
        });
      [
        "?? foo",
        "?? bar",
        "?? baz",
        "A  hoge/huga/hige"
      ].forEach((e)=>{
        expect(stdout).to.match(new RegExp(String.raw`^${escapeRegExp(e)}$`,"m"));
      });
    it("should add one file to index even called multi times", async()=>{
      await gitAdd(testDirRoot, "foo");
      await gitAdd(testDirRoot, "foo");
      await gitAdd(testDirRoot, "foo");
      const {stdout, stderr} = await asyncExecFile("git", ["status", "--short"], {cwd: testDirRoot})
        .catch((e)=>{
          console.log("ERROR:\n",e);
        });
      [
        "A  foo",
        "?? bar",
        "?? baz",
        "?? hoge/"
      ].forEach((e)=>{
        expect(stdout).to.match(new RegExp(String.raw`^${escapeRegExp(e)}$`,"m"));
      });
    });
    });
  });
  describe("#gitRm", ()=>{
  });
});
