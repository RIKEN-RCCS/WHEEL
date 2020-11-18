"use strict";
const fs = require("fs-extra");

//setup test framework
const chai = require("chai");
const { expect } = require("chai");
chai.use(require("chai-fs"));
const sinon = require("sinon");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
chai.use((_chai, _)=>{
  _chai.Assertion.addMethod("withMessage", function(msg) {
    _.flag(this, "message", msg);
  });
});

//testee
const { setup, getLogger } = require("../../../app/logSettings.js");

//stubs
const sio = {
  of() {
    return this;
  }
};
sio.emit = sinon.stub();

describe("Unit test for log4js's helper functions", ()=>{
  describe("#log", ()=>{
    const logFilename = "./loggingTest.log";
    beforeEach(async()=>{
      await setup(logFilename, 40960000);
      sio.emit.resetHistory();
      delete process.env.WHEEL_DISABLE_LOG;
    });
    afterEach(async()=>{
      await fs.remove(logFilename);
      process.env.WHEEL_DISABLE_LOG = 1;
    });
    it("should output to default logger", ()=>{
      const logger = getLogger();
      logger.info("foo");
      logger.error("bar");
      expect(sio.emit).to.have.not.been.called;
    });
    it("should output to workflow logger", ()=>{
      const logger = getLogger("workflow");
      logger.addContext("sio", sio);
      logger.info("foo");
      logger.error("bar");
      expect(sio.emit.callCount).to.eql(3);
      const calls = sio.emit.getCalls();
      expect(calls[0].args[0]).to.eql("logINFO");
      expect(calls[0].args[1]).to.match(/foo$/);
      expect(calls[1].args[0]).to.eql("logERR");
      expect(calls[1].args[1]).to.match(/bar$/);
      expect(calls[2].args[0]).to.eql("showMessage");
      expect(calls[2].args[1]).to.match(/bar$/);
    });
  });
});
