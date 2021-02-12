"use strict";

//setup test framework
const chai = require("chai");
const expect = chai.expect;
chai.use(require("sinon-chai"));
const rewire = require("rewire"); //eslint-disable-line node/no-unpublished-require

//testee
const jobManager = rewire("../../../app/core/jobManager");
const getStatCommand = jobManager.__get__("getStatCommand");
const getFirstCapture = jobManager.__get__("getFirstCapture");
const getStatusWord = jobManager.__get__("getStatusWord");

describe("UT for jobManager class", ()=>{
  describe("#getStatCommand", ()=>{
    it("should return single command for single jobID", ()=>{
      expect(getStatCommand({ stat: "stat" }, "jobID")).to.equal("stat jobID");
    });
    it("should return multi commands are connected by OR pipe and has same jobID", ()=>{
      expect(getStatCommand({ stat: ["stat", "stat -b", "stat -a -b -c"] }, "jobID")).to.equal("stat jobID || stat -b jobID || stat -a -b -c jobID");
    });
  });
  describe("#getStatusWord", ()=>{
    it("should return not yet completed", ()=>{
      expect(getStatusWord(false, false)).to.equal("not yet completed");
    });
    it("should return failed", ()=>{
      expect(getStatusWord(false, true)).to.equal("failed");
    });
    it("should return failed too", ()=>{
      expect(getStatusWord(true, true)).to.equal("failed");
    });
    it("should return finished", ()=>{
      expect(getStatusWord(true, false)).to.equal("finished");
    });
  });
  describe("#getFirstCapture", ()=>{
    it("should return null if regexp does not match", ()=>{
      expect(getFirstCapture("hoge", "q")).to.be.null;
    });
    it("should return null if capture failed", ()=>{
      expect(getFirstCapture("hoge", "e(\\d)")).to.be.null;
    });
    it("should return null if regexp does not have capture", ()=>{
      expect(getFirstCapture("hoge", "e")).to.be.null;
    });
    it("should return captured string ", ()=>{
      expect(getFirstCapture("hoge", "h(o)ge")).to.equal("o");
    });
    it("should return first captured string ", ()=>{
      expect(getFirstCapture("hoge", "h(o)g(e)")).to.equal("o");
    });
  });
});
