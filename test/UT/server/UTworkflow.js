const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

// setup test framework
const chai = require("chai");
const { expect } = require("chai");
chai.use(require('chai-fs'));
const sinon = require("sinon");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
chai.use(function (_chai, _) {
  _chai.Assertion.addMethod('withMessage', function (msg) {
    _.flag(this, 'message', msg);
  });
});
const rewire = require("rewire");

//display detailed information of unhandled rejection
process.on('unhandledRejection', console.dir);

//testee
const wf = rewire("../../../app/routes/workflow.js");

//test data
const dummyNode = {
  name: "dummy",
  inputFiles: [],
  outputFiles: [],
  dummyArray: [],
}
const label = "dummyLabel";

//stub
wf.__set__("getNode", sinon.stub().returns(dummyNode));
wf.__set__("getCwf", sinon.stub());
wf.__set__("write", sinon.stub().resolves());
const sio={emit: ()=>{}}

describe("Unit test for event listener in workflow", function(){
  describe("#onUpdateNode", function(){
    const testee = wf.__get__("onUpdateNode");
    //stubs only used in onUpdateNode
    const updateInputFiles = sinon.stub().resolves();
    const updateOutputFiles = sinon.stub().resolves();
    const updateValue= sinon.stub().resolves();
    const addValue= sinon.stub().resolves();
    const delInputFiles = sinon.stub().resolves();
    const delOutputFiles = sinon.stub().resolves();
    const delValue= sinon.stub().resolves();
    wf.__set__("updateInputFiles", updateInputFiles);
    wf.__set__("updateOutputFiles", updateOutputFiles);
    wf.__set__("updateValue", updateValue);
    wf.__set__("addValue", addValue);
    wf.__set__("delInputFiles", delInputFiles);
    wf.__set__("delOutputFiles", delOutputFiles);
    wf.__set__("delValue", delValue);

    beforeEach(function(){
      updateInputFiles.resetHistory();
      updateOutputFiles.resetHistory();
      updateValue.resetHistory();
      addValue.resetHistory();
      delInputFiles.resetHistory();
      delOutputFiles.resetHistory();
      delValue.resetHistory();
    });
    it("should call updateInputFiles", function(){
      const value = {
        "name": "hoge",
        "srcNode": null,
        "srcName": "null"
      }
      const msg = {
        "index": 0,
        "property": "inputFiles",
        "value": value,
        "cmd": "update"
      }
      testee(sio, label, msg);

      expect(updateInputFiles).to.have.been.calledWith(label, dummyNode, value);
      expect(updateOutputFiles).not.to.have.been.called;
      expect(updateValue).to.have.not.been.called;
      expect(addValue).to.have.not.been.called;
      expect(delInputFiles).to.have.not.been.called;
      expect(delOutputFiles).to.have.not.been.called;
      expect(delValue).to.have.not.been.called;
    });
    it("should call updateOutputFiles", function(){
      const value = {
        "name": "hoge",
        "dst": [],
      }
      const msg = {
        "index": 0,
        "property": "outputFiles",
        "value": value,
        "cmd": "update"
      }
      testee(sio, label, msg);

      expect(updateInputFiles).not.to.have.been.called;
      expect(updateOutputFiles).to.have.been.calledWith(label, dummyNode, value);
      expect(updateValue).to.have.not.been.called;
      expect(addValue).to.have.not.been.called;
      expect(delInputFiles).to.have.not.been.called;
      expect(delOutputFiles).to.have.not.been.called;
      expect(delValue).to.have.not.been.called;
    });
    it("should call updateValue", function(){
      const value = "huga"
      const msg = {
        "index": 0,
        "property": "name",
        "value": value,
        "cmd": "update"
      }
      testee(sio, label, msg);

      expect(updateInputFiles).not.to.have.been.called;
      expect(updateOutputFiles).not.to.have.been.called;
      expect(updateValue).to.have.been.calledWith(label, dummyNode, "name", value);
      expect(addValue).to.have.not.been.called;
      expect(delInputFiles).to.have.not.been.called;
      expect(delOutputFiles).to.have.not.been.called;
      expect(delValue).to.have.not.been.called;
    });
    it("should call addValue", function(){
      const value = "huga"
      const msg = {
        "index": 0,
        "property": "dummyArray",
        "value": value,
        "cmd": "add"
      }
      testee(sio, label, msg);

      expect(updateInputFiles).not.to.have.been.called;
      expect(updateOutputFiles).not.to.have.been.called;
      expect(updateValue).not.to.have.been.called;
      expect(addValue).to.have.been.calledWith(label, dummyNode, "dummyArray", value);
      expect(delInputFiles).to.have.not.been.called;
      expect(delOutputFiles).to.have.not.been.called;
      expect(delValue).to.have.not.been.called;
    });
    it("should call delInputFiles", function(){
      const value = {
        "name": "hoge",
        "srcNode": null,
        "srcName": "null"
      }
      const msg = {
        "index": 0,
        "property": "inputFiles",
        "value": value,
        "cmd": "del"
      }
      testee(sio, label, msg);

      expect(updateInputFiles).to.have.not.been.called;
      expect(updateOutputFiles).to.have.not.been.called;
      expect(updateValue).to.have.not.been.called;
      expect(addValue).to.have.not.been.called;
      expect(delInputFiles).to.have.been.calledWith(label, dummyNode, value);
      expect(delOutputFiles).not.to.have.been.called;
      expect(delValue).to.have.not.been.called;
    });
    it("should call delOutputFiles", function(){
      const value = {
        "name": "hoge",
        "dst": [],
      }
      const msg = {
        "index": 0,
        "property": "outputFiles",
        "value": value,
        "cmd": "del"
      }
      testee(sio, label, msg);

      expect(updateInputFiles).to.have.not.been.called;
      expect(updateOutputFiles).to.have.not.been.called;
      expect(updateValue).to.have.not.been.called;
      expect(addValue).to.have.not.been.called;
      expect(delInputFiles).not.to.have.been.called;
      expect(delOutputFiles).to.have.been.calledWith(label, dummyNode, value);
      expect(delValue).to.have.not.been.called;
    });
    it("should call delValue", function(){
      const value = "huga"
      const msg = {
        "index": 0,
        "property": "dummyArray",
        "value": value,
        "cmd": "del"
      }
      testee(sio, label, msg);

      expect(updateInputFiles).to.have.not.been.called;
      expect(updateOutputFiles).to.have.not.been.called;
      expect(updateValue).to.have.not.been.called;
      expect(addValue).to.have.not.been.called;
      expect(delInputFiles).not.to.have.been.called;
      expect(delOutputFiles).not.to.have.been.called;
      expect(delValue).to.have.been.calledWith(label, dummyNode, "dummyArray", value);
    });
    it("should not call any functions if add to non-array property", function(){
      const msg = {
        "index": 0,
        "property": "name",
        "value": "hoge",
        "cmd": "add"
      }
      testee(sio, label, msg);
      expect(updateInputFiles).to.have.not.been.called;
      expect(updateOutputFiles).to.have.not.been.called;
      expect(updateValue).to.have.not.been.called;
      expect(addValue).to.have.not.been.called;
      expect(delInputFiles).not.to.have.been.called;
      expect(delOutputFiles).not.to.have.been.called;
      expect(delValue).to.have.not.been.called;
    });
    it("should not call any functions if del from non-array property", function(){
      const msg = {
        "index": 0,
        "property": "name",
        "value": "hoge",
        "cmd": "del"
      }
      testee(sio, label, msg);
      expect(updateInputFiles).to.have.not.been.called;
      expect(updateOutputFiles).to.have.not.been.called;
      expect(updateValue).to.have.not.been.called;
      expect(addValue).to.have.not.been.called;
      expect(delInputFiles).not.to.have.been.called;
      expect(delOutputFiles).not.to.have.been.called;
      expect(delValue).to.have.not.been.called;
    });
  });
  describe("#onAddLink", function(){
    const testee = wf.__get__("onAddLink");
    const addLink = sinon.stub().resolves();
    wf.__set__("addLink", addLink);
    beforeEach(function(){
      addLink.resetHistory();
    });
    it("should call addLink", function(){
      testee(sio, label, {src: "src", dst: "dst", isElse: "isElse"});
      expect(addLink).to.have.been.calledWith(label, "src", "dst", "isElse");
    });
  });
  describe("#onRemoveLink", function(){
    const testee = wf.__get__("onRemoveLink");
    const removeLink = sinon.stub().resolves();
    wf.__set__("removeLink", removeLink);
    beforeEach(function(){
      removeLink.resetHistory();
    });
    it("should call removeLink", function(){
      testee(sio, label, {src: "src", dst: "dst", isElse: "isElse"});
      expect(removeLink).to.have.been.calledWith(label, "src", "dst", "isElse");
    });
  });
  describe("#onAddFileLink", function(){
    const testee = wf.__get__("onAddFileLink");
    const addFileLink = sinon.stub().resolves();
    wf.__set__("addFileLink", addFileLink);
    beforeEach(function(){
      addFileLink.resetHistory();
    });
    it("should call addFileLink", function(){
      testee(sio, label, {src: "src", dst: "dst", srcName: "srcName", dstName: "dstName"});
      expect(addFileLink).to.have.been.calledWith(label, "src", "dst", "srcName", "dstName");
    });
  });
  describe("#onRemoveFileLink", function(){
    const testee = wf.__get__("onRemoveFileLink");
    const removeFileLink = sinon.stub().resolves();
    wf.__set__("removeFileLink", removeFileLink);
    beforeEach(function(){
      removeFileLink.resetHistory();
    });
    it("should call removeFileLink", function(){
      testee(sio, label, {src: "src", dst: "dst", srcName: "srcName", dstName: "dstName"});
      expect(removeFileLink).to.have.been.calledWith(label, "src", "dst", "srcName", "dstName");
    });
  });
});
