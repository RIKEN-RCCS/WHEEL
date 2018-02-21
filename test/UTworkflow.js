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
const savedParent = require('./parentWorkflow');
let cwf = null;
let parent = null;
const label=null;

// stub functions
wf.__set__("write", ()=>{return Promise.resolve()});
wf.__set__("del", ()=>{return Promise.resolve()});
wf.__set__("getCwf", (label)=>{return cwf});
wf.__set__("_readChildWorkflow", (label, node)=>{return cwf});
wf.__set__("_writeChildWorkflow", (label, node, childWorkflow)=>{cwf=JSON.parse(JSON.stringify(childWorkflow))});
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
    parent = JSON.parse(JSON.stringify(savedParent));
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
  describe("#updateValue", function(){
    const testee = wf.__get__("updateValue");
    it("should chnage node[0]'s name", async function(){
      await testee(label, cwf.nodes[0], "name", "hoge");
      expect(cwf.nodes[0].name).to.eql("hoge");
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["name"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should chnage workflow's name", async function(){
      await testee(label, parent, "name", "hoge");
      expect(parent.name).to.eql("hoge");
      expect(cwf.name).to.eql("hoge");
      expectNotChanged(parent, savedParent, ["name"]);
      expectNotChanged(cwf, saved, ["name"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
  });
  describe("#updateInputFiles", function(){
    const testee = wf.__get__("updateInputFiles");
    it("should chnage node[0]'s inputFiles", async function(){
      const newInputFiles = [
      {
        "name": "hoge",
        "srcNode": "parent",
        "srcName": "a"
      },
      {
        "name": "huga",
        "srcNode": null,
        "srcName": null
      }]
      await testee(label, cwf.nodes[0], newInputFiles);
      expect(cwf.nodes[0].inputFiles).to.eql(newInputFiles);
      expect(cwf.outputFiles).to.eql([
        {
            "name": "a",
            "dst": [
              {
                "dstNode": 0,
                "dstName": "hoge"
              }
            ]
        },
        {
          "name": "newOutput",
          "dst": []
        }
      ]);

      expectNotChanged(cwf, saved, ["outputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["inputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should change parent's inputFiles", async function(){
      const newInputFiles = [
        {
          "name": "hoge",
          "srcNode": null,
          "srcName": null
        },
        {
          "name": "newOutput",
          "srcNode": null,
          "srcName": null
        }
      ];
      await testee(label, parent, newInputFiles);

      expect(parent.inputFiles).to.eql(newInputFiles);
      expectNotChanged(parent, savedParent, ["inputFiles"]);
      expect(cwf.outputFiles).to.eql([
        {
            "name": "hoge",
            "dst": [
              {
                "dstNode": 0,
                "dstName": "c"
              }
            ]
        },
        {
          "name": "newOutput",
          "dst": []
        }
      ]);
      expectNotChanged(cwf, saved, ["outputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["inputFiles"]);
      expect(cwf.nodes[0].inputFiles).to.eql([
        {
          "name": "c",
          "srcNode": "parent",
          "srcName": "hoge"
        },
        {
          "name": "newInput",
          "srcNode": null,
          "srcName": null
        }
      ]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
  });
  describe("#updateOutputFiles", async function(){
    const testee = wf.__get__("updateOutputFiles");
    it("should chnage node[1]'s outputFiles", async function(){
      const newOutputFiles=[
      {
        "name": "hoge",
        "dst": [
          {
            "dstNode": "parent",
            "dstName": "b"
          }
        ]
      },
      {
        "name": "huga",
        "dst": []
      }]
      await testee(label, cwf.nodes[1], newOutputFiles);

      expect(cwf.nodes[1].outputFiles).to.eql(newOutputFiles);
      expect(cwf.inputFiles).to.eql([
        {
          "name": "b",
          "srcNode": 1,
          "srcName": "hoge"
        },
        {
          "name": "newInput",
          "srcNode": null,
          "srcName": null
        }]);

      expectNotChanged(cwf, saved, ["inputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["outputFiles"]);
    });
    it("should chnage parent's outputFiles", async function(){
      const newOutputFiles=[
        {
          "name": "hoge",
          "dst": []
        },
        {
          "name": "newInput",
          "dst": []
        }]
      await testee(label, parent, newOutputFiles);
      expect(parent.outputFiles).to.eql(newOutputFiles);
      expectNotChanged(parent, savedParent, ["outputFiles"]);
      expect(cwf.inputFiles).to.eql([
        {
          "name": "hoge",
          "srcNode": 1,
          "srcName": "f"
        },
        {
          "name": "newInput",
          "srcNode": null,
          "srcName": null
        }]);
      expectNotChanged(cwf, saved, ["inputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expect(cwf.nodes[1].outputFiles).to.eql([
        {
          "name": "f",
          "dst": [
            {
              "dstNode": "parent",
              "dstName": "hoge"
            }
          ]
        },
        {
          "name": "newOutput",
          "dst": []
        }]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["outputFiles"]);
    });
  });
  describe("#addValue", async function(){
    const testee = wf.__get__("addValue");
    it("should add new inputFile entry", async function(){
      await testee(label, cwf.nodes[0], "inputFiles", {name: "hoge", srcNode: null, srcName:null});
      expect(cwf.nodes[0].inputFiles).to.eql([
        {
          "name": "c",
          "srcNode": "parent",
          "srcName": "a"
        },
        {
          "name": "newInput",
          "srcNode": null,
          "srcName": null
        },
        {
          "name": "hoge",
            "srcNode": null,
            "srcName": null
        }
      ]);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["inputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should add new outputFiles entry", async function(){
      await testee(label, cwf.nodes[0], "outputFiles", {name: "hoge", dst: []});
      expect(cwf.nodes[0].outputFiles).to.eql([
        {
          "name": "d",
          "dst": [
            {
              "dstNode": 1,
              "dstName": "e"
            }
          ]
        },
        {
          "name": "hoge",
          "dst": []
        }]);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["outputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should add new inputFile entry to parent node", async function(){
      await testee(label, parent, "inputFiles", {name: "hoge", srcNode: null, srcName:null});
      expect(parent.inputFiles).to.eql([
        {
          "name": "a",
          "srcNode": null,
          "srcName": null
        },
        {
          "name": "newOutput",
          "srcNode": null,
          "srcName": null
        },
        {
          "name": "hoge",
            "srcNode": null,
            "srcName": null
        }
      ]);
      expectNotChanged(parent, savedParent, ["inputFiles"]);
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
          "dst": []
        },
        {
          "name": "hoge",
          "dst": []
        }
      ]);
      expectNotChanged(cwf, saved, ["outputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should add new outputFiles entry to parent node", async function(){
      await testee(label, parent, "outputFiles", {name: "hoge", dst: []});
      expect(parent.outputFiles).to.eql([
        {
          "name": "b",
          "dst": []
        },
        {
          "name": "newInput",
          "dst": []
        },
        {
          "name": "hoge",
          "dst": []
        }]);
      expectNotChanged(parent, savedParent, ["outputFiles"]);
      expect(cwf.inputFiles).to.eql([
        {
            "name": "b",
            "srcNode": 1,
            "srcName": "f"
        },
        {
          "name": "newInput",
          "srcNode": null,
          "srcName": null
        },
        {
          "name": "hoge",
          "srcNode": null,
          "srcName": null
        }
      ]);
      expectNotChanged(cwf, saved, ["inputFiles"]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });

  });
  describe.skip("#delValue", async function(){
    const testee = wf.__get__("delValue");
  });
  describe("#delInputFiles", async function(){
    const testee = wf.__get__("delInputFiles");
    it("should delete inputFiles", async function(){
      await testee(label, cwf.nodes[1], {"name": "e", "srcNode": 0, "srcName": "d"});

      expect(cwf.nodes[0].outputFiles).to.eql([
        {
          "name": "d",
          "dst": []
        }
      ]);
      expect(cwf.nodes[1].inputFiles).to.eql([]);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["outputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["inputFiles"]);
    });
    it("should delete inputFiles from parent", async function(){
      await testee(label, parent, {"name": "a", "srcNode": null, "srcName": null});

      expectNotChanged(parent, savedParent, ["inputFiles"]);
      expect(parent.inputFiles).to.eql([
        {
          "name": "newOutput",
          "srcNode": null,
          "srcName": null
        }
      ]);
      expectNotChanged(cwf, saved, ["outputFiles"]);
      expect(cwf.outputFiles).to.eql([
        {
          "name": "newOutput",
          "dst": []
        }
      ]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["inputFiles"]);
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
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
  });
  describe("#delOutputFiles", async function(){
    const testee = wf.__get__("delOutputFiles");
    it("should delete outputFiles", async function(){
      await testee(label, cwf.nodes[0],
        {"name": "d",
          "dst": [{
              "dstNode": 1,
              "dstName": "e"
            }]
        }
      );
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["outputFiles"]);
      expect(cwf.nodes[0].outputFiles).to.eql([]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["inputFiles"]);
      expect(cwf.nodes[1].inputFiles).to.eql([
        {
          "name": "e",
          "srcNode": null,
          "srcName": null
        }
      ]);
    });
    it("should delete outputFiles from parent", async function(){
      await testee(label, parent, {"name": "b", "dst": []});

      expectNotChanged(parent, savedParent, ["outputFiles"]);
      expect(parent.outputFiles).to.eql([
        {
          "name": "newInput",
          "dst": []
        }
      ]);
      expectNotChanged(cwf, saved, ["inputFiles"]);
      expect(cwf.inputFiles).to.eql([
        {
          "name": "newInput",
          "srcNode": null,
          "srcName": null
        }
      ]);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["outputFiles"]);
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
    });
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
