const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

// setup test framework
const chai = require("chai");
const { expect } = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const rewire = require("rewire");

//testee
const wf = rewire("../app/routes/workflow.js");

describe("Unit test for functions defined in workflow.js", function(){
  // test data
  let cwf = {
    nodes: [
      {
        outputFiles: [
          {
            name: "foo",
            dst: [
              {
                dstNode: 1,
                dstName: "bar"
              }
            ]
          }
        ]
      },
      {
        inputFiles:[
          {
            name: "bar",
            srcNode: 0,
            srcName: "foo"
          }
        ]
      }
    ]
  }
  const saved = Object.assign({}, cwf);

  // stub functions
  wf.__set__("getCwf", (label)=>{return cwf});
  wf.__set__("getNode", (label, index)=>{return cwf.nodes[index]});
  const sio={};
  sio.emit=(eventName, msg)=>{
    console.log("socket.io.emit() called.")
    console.log("evengName:",eventName);
    console.log("msg:",msg);
  }

  beforeEach(function(){
    // reset cwf
    cwf = Object.assign({}, saved);
  });
  describe("#onRemoveFileLink", function(){
    it("should remove file link from nodes[0] to nodes[1]", function(){
      const testee = wf.__get__("onRemoveFileLink");
      const msg = {src: 0, dst: 1}

      testee(sio, null, msg);

      expect(cwf.nodes[0].outputfiles).to.be.equal([]);
      expect(cwf.nodes[1].inputfiles).to.be.equal([]);


    });
  });
});
