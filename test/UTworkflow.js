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

// test data
const saved = require("./testWorkflow");
let cwf = null;

// stub functions
wf.__set__("write", ()=>{return Promise.resolve()});
wf.__set__("getCwf", (label)=>{return cwf});
wf.__set__("getNode", (label, index)=>{return cwf.nodes[index]});
const sio={};
sio.emit=(eventName, msg)=>{
  /*
    console.log("socket.io.emit() called.")
    console.log("evengName:",eventName);
    console.log("msg:",JSON.stringify(msg,["inputFiles", "nodes", "outputFiles","name","srcNode", "srcName", "dst", "dstNode", "dstName"],2));
    */
}


describe("Unit test for functions defined in workflow.js", function(){
  describe("#onRemoveFileLink", function(){
    const testee = wf.__get__("onRemoveFileLink");
    beforeEach(function(){
      // reset cwf
      cwf = JSON.parse(JSON.stringify(saved));
    });
    it("should remove file link from nodes[0] to nodes[1]", function(){
      const msg = {src: 0, dst: 1}
      testee(sio, null, msg);

      expect(cwf.nodes[0].outputFiles).to.have.lengthOf(1);
      expect(cwf.nodes[1].outputFiles).to.have.lengthOf(1);
      expect(cwf.nodes[0].inputFiles).to.have.lengthOf(1);
      expect(cwf.nodes[1].inputFiles).to.have.lengthOf(1);
      expect(cwf.outputFiles).to.have.lengthOf(1);
      expect(cwf.inputFiles).to.have.lengthOf(1);

      //parent
      expect(cwf.inputFiles[0].name).to.equal("a");
      expect(cwf.inputFiles[0].srcNode).to.equal(0);
      expect(cwf.inputFiles[0].srcName).to.equal("c");
      expect(cwf.outputFiles[0].name).to.equal("b");
      expect(cwf.outputFiles[0].dst[0].dstNode).to.equal(1);
      expect(cwf.outputFiles[0].dst[0].dstName).to.equal("f");

      //nodes[0]
      expect(cwf.nodes[0].inputFiles[0].name).to.equal("c");
      expect(cwf.nodes[0].inputFiles[0].srcNode).to.equal("parent");
      expect(cwf.nodes[0].inputFiles[0].srcName).to.equal("a");
      expect(cwf.nodes[0].outputFiles[0].name).to.equal("d");
      expect(cwf.nodes[0].outputFiles[0].dst).to.have.lengthOf(0);

      //nodes[1]
      expect(cwf.nodes[1].inputFiles[0].name).to.equal("e");
      expect(cwf.nodes[1].inputFiles[0].srcNode).to.equal(null);
      expect(cwf.nodes[1].inputFiles[0].srcName).to.equal(null);
      expect(cwf.nodes[1].outputFiles[0].name).to.equal("f");
      expect(cwf.nodes[1].outputFiles[0].dst[0].dstNode).to.equal("parent");
      expect(cwf.nodes[1].outputFiles[0].dst[0].dstName).to.equal("b");
    });
    it("should remove flie link from parent to nodes[0]", function(){
      const msg = {src: "parent", dst: 0};
      testee(sio, null, msg);

      expect(cwf.nodes[0].outputFiles).to.have.lengthOf(1);
      expect(cwf.nodes[1].outputFiles).to.have.lengthOf(1);
      expect(cwf.nodes[0].inputFiles).to.have.lengthOf(1);
      expect(cwf.nodes[1].inputFiles).to.have.lengthOf(1);
      expect(cwf.outputFiles).to.have.lengthOf(1);
      expect(cwf.inputFiles).to.have.lengthOf(1);

      //parent
      expect(cwf.inputFiles[0].name).to.equal("a");
      expect(cwf.inputFiles[0].srcNode).to.equal(null);
      expect(cwf.inputFiles[0].srcName).to.equal(null);
      expect(cwf.outputFiles[0].name).to.equal("b");
      expect(cwf.outputFiles[0].dst[0].dstNode).to.equal(1);
      expect(cwf.outputFiles[0].dst[0].dstName).to.equal("f");

      //nodes[0]
      expect(cwf.nodes[0].inputFiles[0].name).to.equal("c");
      expect(cwf.nodes[0].inputFiles[0].srcNode).to.equal(null);
      expect(cwf.nodes[0].inputFiles[0].srcName).to.equal(null);
      expect(cwf.nodes[0].outputFiles[0].name).to.equal("d");
      expect(cwf.nodes[0].outputFiles[0].dst[0].dstNode).to.equal(1);
      expect(cwf.nodes[0].outputFiles[0].dst[0].dstName).to.equal("e");

      //nodes[1]
      expect(cwf.nodes[1].inputFiles[0].name).to.equal("e");
      expect(cwf.nodes[1].inputFiles[0].srcNode).to.equal(0);
      expect(cwf.nodes[1].inputFiles[0].srcName).to.equal("d");
      expect(cwf.nodes[1].outputFiles[0].name).to.equal("f");
      expect(cwf.nodes[1].outputFiles[0].dst[0].dstNode).to.equal("parent");
      expect(cwf.nodes[1].outputFiles[0].dst[0].dstName).to.equal("b");
    });
    it("should remove flie link from nodes[1] to parent", function(){
      const msg = {src: 1, dst: "parent"};
      testee(sio, null, msg);

      expect(cwf.nodes[0].outputFiles).to.have.lengthOf(1);
      expect(cwf.nodes[1].outputFiles).to.have.lengthOf(1);
      expect(cwf.nodes[0].inputFiles).to.have.lengthOf(1);
      expect(cwf.nodes[1].inputFiles).to.have.lengthOf(1);
      expect(cwf.outputFiles).to.have.lengthOf(1);
      expect(cwf.inputFiles).to.have.lengthOf(1);

      //parent
      expect(cwf.inputFiles[0].name).to.equal("a");
      expect(cwf.inputFiles[0].srcNode).to.equal(0);
      expect(cwf.inputFiles[0].srcName).to.equal("c");
      expect(cwf.outputFiles[0].name).to.equal("b");
      expect(cwf.outputFiles[0].dst).to.have.lengthOf(0);

      //nodes[0]
      expect(cwf.nodes[0].inputFiles[0].name).to.equal("c");
      expect(cwf.nodes[0].inputFiles[0].srcNode).to.equal("parent");
      expect(cwf.nodes[0].inputFiles[0].srcName).to.equal("a");
      expect(cwf.nodes[0].outputFiles[0].name).to.equal("d");
      expect(cwf.nodes[0].outputFiles[0].dst[0].dstNode).to.equal(1);
      expect(cwf.nodes[0].outputFiles[0].dst[0].dstName).to.equal("e");

      //nodes[1]
      expect(cwf.nodes[1].inputFiles[0].name).to.equal("e");
      expect(cwf.nodes[1].inputFiles[0].srcNode).to.equal(0);
      expect(cwf.nodes[1].inputFiles[0].srcName).to.equal("d");
      expect(cwf.nodes[1].outputFiles[0].name).to.equal("f");
      expect(cwf.nodes[1].outputFiles[0].dst).to.have.lengthOf(0);
    });
  });
});
