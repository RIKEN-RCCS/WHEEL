const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const del = require("del");

// setup test framework
const chai = require("chai");
const { expect } = require("chai");
chai.use(require('chai-fs'));
const rewire = require("rewire");
chai.use(function (_chai, _) {
  _chai.Assertion.addMethod('withMessage', function (msg) {
    _.flag(this, 'message', msg);
  });
});

//testee
const wf = rewire("../app/routes/workflow.js");

// test data
const saved = require("./testWorkflow");
let cwf = null;
const label=null;

// stub functions
wf.__set__("write", ()=>{return Promise.resolve()});
wf.__set__("del", ()=>{return Promise.resolve()});
wf.__set__("getCwf", (label)=>{return cwf});
wf.__set__("getCurrentDir", (label)=>{return "./"});
wf.__set__("getNode", (label, index)=>{return cwf.nodes[index]});
wf.__set__("pushNode", (label, node)=>{return cwf.nodes.push(node) - 1});
wf.__set__("removeNode", (label, index)=>{cwf.nodes[index]=null});

//display detailed information of unhandled rejection
process.on('unhandledRejection', console.dir);

describe("Unit test for functions defined in workflow.js", function(){
  wf.__get__("logger").setLogLevel('warn');
  beforeEach(function(){
    cwf = JSON.parse(JSON.stringify(saved));
  });
  describe("#createNode", function(){
    const testee = wf.__get__("createNode");
    it("should add node[2]", async function(){
      const nodeDir="./task0";
      del(nodeDir);
      await testee(label, {type: "task", pos:{x: 0, y:0}});

      expect(cwf.nodes).to.have.lengthOf(3);
      expect(cwf.nodes[2].type).to.eql("task");
      expect(nodeDir).to.be.directory().and.empty;

      expectNotChanged(cwf, saved, ["nodes"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
      del(nodeDir);
    });
  });
  describe.skip("#updateValue", function(){
    const testee = wf.__get__("updateValue");
  });
  describe.skip("#addValue", function(){
    const testee = wf.__get__("addValue");
  });
  describe.skip("#delValue", function(){
    const testee = wf.__get__("delValue");
  });
  describe.skip("#removeNodeDir", function(){
    const testee = wf.__get__("removeNodeDir");
  });
  describe("#removeLink", function(){
    const testee = wf.__get__("removeLink");
    it("should remove link from nodes[0] to nodes[1]", function(){
      testee(label, 0, 1, false);

      expect(cwf.nodes[0].next).to.have.lengthOf(0);
      expect(cwf.nodes[1].previous).to.have.lengthOf(0);

      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["next", "previous"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["next", "previous"]);
    });
  });
  describe("#removeAllLink", function(){
    const testee = wf.__get__("removeAllLink");
    it("should remove all link on nodes[0]", function(){
      testee(label, 0);

      expect(cwf.nodes[0].next).to.have.lengthOf(0);
      expect(cwf.nodes[1].previous).to.have.lengthOf(0);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["next"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["previous"]);
    });
    it("should remove all link on nodes[1]", function(){
      testee(label, 0);

      expect(cwf.nodes[0].next).to.have.lengthOf(0);
      expect(cwf.nodes[1].previous).to.have.lengthOf(0);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["next"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["previous"]);
    });
  });
  describe("#removeAllFileLink", function(){
    const testee = wf.__get__("removeAllFileLink");
    it("should all file link on nodes[0]", function(){
      testee(label, 0);
      expect(cwf.outputFiles).to.eql([
        {
            "name": "a",
            "dst": []
        },
        {
          "name": "newOutput",
          "dst": []
        }
      ]);
      expect(cwf.nodes[1].inputFiles).to.eql([
        {
          "name": "e",
          "srcNode": null,
          "srcName": null
        }
      ]);

      expectNotChanged(cwf, saved, ["outputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["inputFiles", "outputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["inputFiles"]);
    });
  });
  describe("#addFileLink", function(){
    const testee = wf.__get__("addFileLink");
    it("should make new file link between children", function(){
      testee(label, 1, 0, "newOutput", "newInput");

      expect(cwf.nodes[0].inputFiles).to.eql([
        {
          "name": "c",
          "srcNode": "parent",
          "srcName": "a"
        },
        {
          "name": "newInput",
          "srcNode": 1,
          "srcName": "newOutput"
        }
      ]);
      expect(cwf.nodes[1].outputFiles).to.eql([
        {
          "name": "f",
          "dst": [
            {
              "dstNode": "parent",
              "dstName": "b"
            }
          ]
        },
        {
          "name": "newOutput",
          "dst": [
            {
              "dstNode": 0,
              "dstName": "newInput"
            }
          ]
        }
      ]);


      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["inputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["outputFiles"]);
    });
    it("should add new dst to existing outputFile entry", function(){
      testee(label, 1, 0, "f", "newInput");

      expect(cwf.nodes[0].inputFiles).to.eql([
        {
          "name": "c",
          "srcNode": "parent",
          "srcName": "a"
        },
        {
          "name": "newInput",
          "srcNode": 1,
          "srcName": "f"
        }
      ]);
      expect(cwf.nodes[1].outputFiles).to.eql([
        {
          "name": "f",
          "dst": [
            {
              "dstNode": "parent",
              "dstName": "b"
            },
            {
              "dstNode": 0,
              "dstName": "newInput"
            }
          ]
        },
        {
          "name": "newOutput",
          "dst": []
        }
      ]);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["inputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["outputFiles"]);
    });
    it("should replace existing inputFile entry", function(){
      testee(label, 1, 0, "newOutput", "c");

      expect(cwf.outputFiles).to.eql([
        {
            "name": "a",
            "dst": []
        },
        {
          "name": "newOutput",
          "dst": []
        }
      ]);
      expect(cwf.nodes[0].inputFiles).to.eql([
        {
          "name": "c",
          "srcNode": 1,
          "srcName": "newOutput"
        },
        {
          "name": "newInput",
          "srcNode": null,
          "srcName": null
        }
      ]);
      expect(cwf.nodes[1].outputFiles).to.eql([
        {
          "name": "f",
          "dst": [
            {
              "dstNode": "parent",
              "dstName": "b"
            }
          ]
        },
        {
          "name": "newOutput",
          "dst": [
            {
              "dstNode": 0,
              "dstName": "c"
            }
          ]
        }
      ]);
      expectNotChanged(cwf, saved, ["outputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["inputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["outputFiles"]);
    });
    it("should make new file link from parent to child", function(){
      testee(label, "parent", 0, "newOutput", "newInput");

      expect(cwf.outputFiles).to.eql([
        {
            "name": "a",
            "dst": [
              {
                "dstNode": 0,
                "dstName": "c"
              }
            ]
        },
        {
          "name": "newOutput",
          "dst": [
              {
                "dstNode": 0,
                "dstName": "newInput"
              }
          ]
        }
      ]);
      expect(cwf.nodes[0].inputFiles).to.eql([
        {
          "name": "c",
          "srcNode": "parent",
          "srcName": "a"
        },
        {
          "name": "newInput",
          "srcNode": "parent",
          "srcName": "newOutput"
        }
      ]);
      expectNotChanged(cwf, saved, ["outputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["inputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should make new file link from child to parent", function(){
      testee(label, 1, "parent", "newOutput", "newInput");

      expect(cwf.inputFiles).to.eql([
        {
            "name": "b",
            "srcNode": 1,
            "srcName": "f"
        },
        {
          "name": "newInput",
          "srcNode": 1,
          "srcName": "newOutput"
        }
      ]);
      expect(cwf.nodes[1].outputFiles).to.eql([
        {
          "name": "f",
          "dst": [
            {
              "dstNode": "parent",
              "dstName": "b"
            }
          ]
        },
        {
          "name": "newOutput",
          "dst": [
            {
              "dstNode": "parent",
              "dstName": "newInput"
            }
          ]
        }
      ]);
      expectNotChanged(cwf, saved, ["inputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["outputFiles"]);
    });
    it("should add new dst(parent) entry to existing outputFile entry on child", function(){
      testee(label, 1, "parent", "f", "newInput");

      expect(cwf.inputFiles).to.eql([
        {
            "name": "b",
            "srcNode": 1,
            "srcName": "f"
        },
        {
          "name": "newInput",
          "srcNode": 1,
          "srcName": "f"
        }
      ]);
      expect(cwf.nodes[1].outputFiles).to.eql([
        {
          "name": "f",
          "dst": [
            {
              "dstNode": "parent",
              "dstName": "b"
            },
            {
              "dstNode": "parent",
              "dstName": "newInput"
            }
          ]
        },
        {
          "name": "newOutput",
          "dst": []
        }
      ]);
      expectNotChanged(cwf, saved, ["inputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["outputFiles"]);
    });
    it("should replace existing inputFile entry on child", function(){
      testee(label, "parent", 0, "newOutput", "c");

      expect(cwf.outputFiles).to.eql([
        {
            "name": "a",
            "dst": []
        },
        {
          "name": "newOutput",
          "dst": [
              {
                "dstNode": 0,
                "dstName": "c"
              }
          ]
        }
      ]);
      expect(cwf.nodes[0].inputFiles).to.eql([
        {
          "name": "c",
          "srcNode": "parent",
          "srcName": "newOutput"
        },
        {
          "name": "newInput",
          "srcNode": null,
          "srcName": null
        }
      ]);
      expectNotChanged(cwf, saved, ["outputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["inputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should replace existing inputFile entry on child", function(){
      testee(label, "parent", 1, "newOutput", "e");

      expect(cwf.outputFiles).to.eql([
        {
            "name": "a",
            "dst": [
              {
                "dstNode": 0,
                "dstName": "c"
              }
            ]
        },
        {
          "name": "newOutput",
          "dst": [
              {
                "dstNode": 1,
                "dstName": "e"
              }
          ]
        }
      ]);
      expect(cwf.nodes[0].outputFiles).to.eql([
        {
          "name": "d",
          "dst": []
        }
      ]);
      expect(cwf.nodes[1].inputFiles).to.eql([
        {
          "name": "e",
          "srcNode": "parent",
          "srcName": "newOutput"
        }
      ]);
      expectNotChanged(cwf, saved, ["outputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["outputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["inputFiles"]);
    });
    it("should replace existing inputFile entry on child", function(){
      testee(label, "parent", 1, "a", "e");

      expect(cwf.outputFiles).to.eql([
        {
            "name": "a",
            "dst": [
              {
                "dstNode": 0,
                "dstName": "c"
              },
              {
                "dstNode": 1,
                "dstName": "e"
              }
            ]
        },
        {
          "name": "newOutput",
          "dst": []
        }
      ]);
      expect(cwf.nodes[0].outputFiles).to.eql([
        {
          "name": "d",
          "dst": []
        }
      ]);
      expect(cwf.nodes[1].inputFiles).to.eql([
        {
          "name": "e",
          "srcNode": "parent",
          "srcName": "a"
        }
      ]);
      expectNotChanged(cwf, saved, ["outputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["outputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["inputFiles"]);
    });
    it("should replace existing inputFile entry on parent", function(){
      testee(label, 0, "parent", "d", "b");

      expect(cwf.inputFiles).to.eql([
        {
            "name": "b",
            "srcNode": 0,
            "srcName": "d"
        },
        {
          "name": "newInput",
          "srcNode": null,
          "srcName": null
        }
      ]);
      expect(cwf.nodes[0].outputFiles).to.eql([
        {
          "name": "d",
          "dst": [
            {
              "dstNode": 1,
              "dstName": "e"
            },
            {
              "dstNode": "parent",
              "dstName": "b"
            }
          ]
        }
      ]);
      expect(cwf.nodes[1].outputFiles).to.eql([
        {
          "name": "f",
          "dst": []
        },
        {
          "name": "newOutput",
          "dst": []
        }
      ]);
      expectNotChanged(cwf, saved, ["inputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["outputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["outputFiles"]);
    });
    it("should replace existing inputFile entry on parent", function(){
      testee(label, 1, "parent", "newOutput", "b");

      expect(cwf.inputFiles).to.eql([
        {
            "name": "b",
            "srcNode": 1,
            "srcName": "newOutput"
        },
        {
          "name": "newInput",
          "srcNode": null,
          "srcName": null
        }
      ]);
      expect(cwf.nodes[1].outputFiles).to.eql([
        {
          "name": "f",
          "dst": []
        },
        {
          "name": "newOutput",
          "dst": [
            {
              "dstNode": "parent",
              "dstName": "b"
            }
          ]
        }
      ]);
      expectNotChanged(cwf, saved, ["inputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["outputFiles"]);
    });
    it("should not affect anything (existing file link)", function(){
      testee(label, "parent", 0, "a", "c");
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should not affect anything (existing file link)", function(){
      testee(label, 0, 1, "d", "e");
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should not affect anything (existing file link)", function(){
      testee(label, 1, "parent", "f", "b");
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should not affect anything (loop)", function(){
      testee(label, 0, 0, "d", "c");
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should not affect anything (parent to parent)", function(){
      testee(label, "parent", "parent", "a", "b");
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
  });
  describe("#removeFileLink", function(){
    const testee = wf.__get__("removeFileLink");
    it("should remove file link from nodes[0] to nodes[1]", function(){
      testee(label, 0, 1, "d", "e");

      expect(cwf.nodes[0].outputFiles).to.eql([{name: "d", dst:[]}]);
      expect(cwf.nodes[1].inputFiles).to.eql([{name: "e", srcNode: null, srcName: null}, ]);

      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["outputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["inputFiles"]);
    });
    it("should remove flie link from parent to nodes[0]", function(){
      testee(label, "parent", 0, "a", "c");

      expect(cwf.outputFiles).to.eql([
        {
            "name": "a",
            "dst": []
        },
        {
          "name": "newOutput",
          "dst": []
        }
      ]);
      expect(cwf.nodes[0].inputFiles).to.eql([
        {
          "name": "c",
          "srcNode": null,
          "srcName": null
        },
        {
          "name": "newInput",
          "srcNode": null,
          "srcName": null
        }
      ]);

      expectNotChanged(cwf, saved, ["outputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["inputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should remove flie link from nodes[1] to parent", function(){
      testee(label, 1, "parent", "f", "b");

      expect(cwf.inputFiles).to.eql([
        {
            "name": "b",
            "srcNode": null,
            "srcName": null
        },
        {
          "name": "newInput",
          "srcNode": null,
          "srcName": null
        }
      ]);
      expect(cwf.nodes[1].outputFiles).to.eql([
        {
          "name": "f",
          "dst": []
        },
        {
          "name": "newOutput",
          "dst": []
        }
      ]);

      expectNotChanged(cwf, saved, ["inputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["outputFiles"]);
    });
  });
});


function expectNotChanged(left, right, exceptions){
  for (let prop in left){
    if(prop === "nodes" || exceptions.includes(prop)) continue;
    expect(left[prop]).withMessage(prop).to.eql(right[prop]);
  }
}
