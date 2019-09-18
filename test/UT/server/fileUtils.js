"use strict";
const path = require("path");
const fs = require("fs-extra");
const { projectJsonFilename, componentJsonFilename } = require("../../../app/db/db");

//setup test framework
const chai = require("chai");
const expect = chai.expect;
const sinon = require("sinon");
chai.use(require("sinon-chai"));
chai.use(require("chai-fs"));
chai.use(require("chai-as-promised"));

//helper functions
const { gitInit, gitAdd, gitCommit, gitStatus } = require("../../../app/core/gitOperator");

//testee
const {
  openFile,
  saveFile
} = require("../../../app/core/fileUtils");


//test data
const testDirRoot = "WHEEL_TEST_TMP";
const notExisting = path.resolve(testDirRoot, "notExisting");

const psJson = {
  targetFiles: ["foo", "bar"],
  hoge: "hoge",
  nested: {
    nest1: {
      nest2: {
        nest3: {
          nest4: "hogehoge"
        }
      }
    }
  }
};

//helper functions
describe("file utility functions", ()=>{
  beforeEach(async()=>{
    await fs.remove(testDirRoot);
    await fs.mkdir(testDirRoot);
    await gitInit(testDirRoot, "foo", "foo@example.com");
    await fs.remove(notExisting);
    await fs.mkdir(path.resolve(testDirRoot, "hoge"));
    await fs.outputFile(path.resolve(testDirRoot, "foo"), "foo");
    await fs.outputFile(path.resolve(testDirRoot, "bar"), "bar");
    await fs.outputFile(path.resolve(testDirRoot, "baz"), "baz");
    await fs.outputJson(path.resolve(testDirRoot, "ps.json"), psJson);
    await gitAdd(testDirRoot, "./");
    await gitCommit(testDirRoot, "foo", "foo@example.com");
  });
  after(async()=>{
    await fs.remove(testDirRoot);
  });

  describe("#openFile", ()=>{
    it("should create empty file if not existing filename is specified", async()=>{
      const rt = await openFile(testDirRoot, notExisting);
      expect(notExisting).to.be.a.file().and.empty;
      expect(rt).to.be.an("array").that.have.lengthOf(1);
      expect(rt[0]).to.deep.equal({ content: "", filename: path.basename(notExisting), dirname: path.dirname(notExisting) });
      const tmp = await gitStatus(testDirRoot);
      expect(tmp).to.be.an("array").that.have.lengthOf(1);
      const stat = tmp[0];
      expect(stat.path()).to.equal("notExisting");
      expect(stat.inIndex()).to.equal(0);
      expect(stat.inWorkingTree()).not.to.equal(0);
      expect(stat.isNew()).not.to.equal(0);
    });
    it("should return existing file", async()=>{
      const rt = await openFile(testDirRoot, path.resolve(testDirRoot, "foo"));
      expect(rt).to.be.an("array").that.have.lengthOf(1);
      expect(rt[0]).to.deep.equal({ content: "foo", filename: "foo", dirname: path.dirname(notExisting) });
    });
    it("should return json file and targetFiles in the json", async()=>{
      const rt = await openFile(testDirRoot, path.resolve(testDirRoot, "ps.json"));
      expect(rt).to.be.an("array").that.have.lengthOf(3);
      expect(rt[0].filename).to.equal("ps.json");
      expect(rt[0].dirname).to.equal(path.dirname(notExisting));
      expect(rt[0].isParameterSettingFile).to.be.true;
      expect(JSON.parse(rt[0].content)).to.deep.equal(psJson);
      expect(rt.slice(1)).to.have.deep.members([
        { content: "foo", filename: "foo", dirname: path.dirname(notExisting) },
        { content: "bar", filename: "bar", dirname: path.dirname(notExisting) }
      ]);
    });
    it("should return only json file if forceNormal==true", async()=>{
      const rt = await openFile(testDirRoot, path.resolve(testDirRoot, "ps.json"), true);
      expect(rt).to.be.an("array").that.have.lengthOf(1);
      expect(rt[0].filename).to.equal("ps.json");
      expect(rt[0].dirname).to.equal(path.dirname(notExisting));
      expect(JSON.parse(rt[0].content)).to.deep.equal(psJson);
    });
    it("should throw error while attempting to open directory", async()=>{
      return expect(openFile(testDirRoot, path.resolve(testDirRoot, "hoge"))).to.be.rejectedWith("EISDIR");
    });
  });
  describe("#saveFile", ()=>{
    it("should overwrite existing file", async()=>{
      await saveFile(path.resolve(testDirRoot, "foo"), "bar");
      expect(path.resolve(testDirRoot, "foo")).to.be.a.file().with.content("bar");
      const tmp = await gitStatus(testDirRoot);
      expect(tmp).to.be.an("array").that.have.lengthOf(1);
      const stat = tmp[0];
      expect(stat.path()).to.equal("foo");
      expect(stat.status()).to.deep.equal(["INDEX_MODIFIED"]);
    });
    it("should write new file", async()=>{
      await saveFile(path.resolve(testDirRoot, "huga"), "huga");
      expect(path.resolve(testDirRoot, "huga")).to.be.a.file().with.content("huga");
      const tmp = await gitStatus(testDirRoot);
      expect(tmp).to.be.an("array").that.have.lengthOf(1);
      const stat = tmp[0];
      expect(stat.path()).to.equal("huga");
      expect(stat.status()).to.deep.equal(["INDEX_NEW"]);
    });
    it("should throw error while attempting to write directory", async()=>{
      return expect(saveFile(path.resolve(testDirRoot, "hoge"))).to.be.rejectedWith("EISDIR");
    });
  });
});
