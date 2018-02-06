const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

// setup test framework
const chai = require("chai");
const { expect } = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
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
  beforeEach(function(){
    cwf = JSON.parse(JSON.stringify(saved));
  });
  describe("#onRemoveLink", function(){
    const testee = wf.__get__("onRemoveLink");
    it("should remove link from nodes[0] to nodes[1]", function(){
      const msg = {src: 0, dst: 1}
      testee(sio, null, msg);

      expect(cwf.nodes[0].next).to.have.lengthOf(0);
      expect(cwf.nodes[1].previous).to.have.lengthOf(0);

      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["next", "previous"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["next", "previous"]);
    });
  });
  describe("#onAddFileLink", function(){
    const testee = wf.__get__("onAddFileLink");
    it("should make new file link between children", function(){
      const msg={src: 1, srcName: "newOutput", dst: 0, dstName: "newInput"}
      testee(sio, null, msg);

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
      const msg={src: 1, srcName: "f", dst: 0, dstName: "newInput"}
      testee(sio, null, msg);

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
      const msg={src: 1, srcName: "newOutput", dst: 0, dstName: "c"}
      testee(sio, null, msg);

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
      const msg={src: "parent", srcName: "newOutput", dst: 0, dstName: "newInput"}
      testee(sio, null, msg);

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
      const msg={src: 1, srcName: "newOutput", dst: "parent", dstName: "newInput"}
      testee(sio, null, msg);

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
      const msg={src: 1, srcName: "f", dst: "parent", dstName: "newInput"}
      testee(sio, null, msg);

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
      const msg={src: "parent", srcName: "newOutput", dst: 0, dstName: "c"}
      testee(sio, null, msg);

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
      const msg={src: "parent", srcName: "newOutput", dst: 1, dstName: "e"}
      testee(sio, null, msg);

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
      const msg={src: "parent", srcName: "a", dst: 1, dstName: "e"}
      testee(sio, null, msg);

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
      const msg={src: 0, srcName: "d", dst: "parent", dstName: "b"}
      testee(sio, null, msg);

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
      const msg={src: 1, srcName: "newOutput", dst: "parent", dstName: "b"}
      testee(sio, null, msg);

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
      const msg={src: "parent", srcName: "a", dst: 0, dstName: "c"}
      testee(sio, null, msg);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should not affect anything (existing file link)", function(){
      const msg={src: 0, srcName: "d", dst: 1, dstName: "e"}
      testee(sio, null, msg);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should not affect anything (existing file link)", function(){
      const msg={src: 1, srcName: "f", dst: "parent", dstName: "b"}
      testee(sio, null, msg);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should not affect anything (loop)", function(){
      const msg={src: 0, srcName: "d", dst: 0, dstName: "c"}
      testee(sio, null, msg);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should not affect anything (loop)", function(){
      const msg={src: 0, srcName: "d", dst: 0, dstName: "newInput"}
      testee(sio, null, msg);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should not affect anything (loop)", function(){
      const msg={src: 1, srcName: "f", dst: 1, dstName: "e"}
      testee(sio, null, msg);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should not affect anything (loop)", function(){
      const msg={src: 1, srcName: "newOutput", dst: 1, dstName: "e"}
      testee(sio, null, msg);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should not affect anything (parent to parent)", function(){
      const msg={src: "parent", srcName: "a", dst: "parent", dstName: "b"}
      testee(sio, null, msg);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should not affect anything (parent to parent)", function(){
      const msg={src: "parent", srcName: "a", dst: "parent", dstName: "newOutput"}
      testee(sio, null, msg);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should not affect anything (parent to parent)", function(){
      const msg={src: "parent", srcName: "newInput", dst: "parent", dstName: "b"}
      testee(sio, null, msg);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
    it("should not affect anything (parent to parent)", function(){
      const msg={src: "parent", srcName: "newInput", dst: "parent", dstName: "newOutput"}
      testee(sio, null, msg);
      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], []);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], []);
    });
  });
  describe("#onRemoveFileLink", function(){
    const testee = wf.__get__("onRemoveFileLink");
    it("should remove file link from nodes[0] to nodes[1]", function(){
      const msg = {src: 0, dst: 1, srcName: "d", dstName: "e"}
      testee(sio, null, msg);

      expect(cwf.nodes[0].outputFiles).to.eql([{name: "d", dst:[]}]);
      expect(cwf.nodes[1].inputFiles).to.eql([{name: "e", srcNode: null, srcName: null}, ]);

      expectNotChanged(cwf, saved, []);
      expectNotChanged(cwf.nodes[0], saved.nodes[0], ["outputFiles"]);
      expectNotChanged(cwf.nodes[1], saved.nodes[1], ["inputFiles"]);
    });
    it("should remove flie link from parent to nodes[0]", function(){
      const msg = {src: "parent", dst: 0, srcName: "a", dstName: "c"};
      testee(sio, null, msg);

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
      const msg = {src: 1, dst: "parent", srcName: "f", dstName: "b"};
      testee(sio, null, msg);

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
