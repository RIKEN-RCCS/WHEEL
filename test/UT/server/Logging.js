const { promisify } = require("util");
const fs = require("fs-extra");
const path = require("path");

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
const rewire = require("rewire");

//testee
const { setup, getLogger, setFilename, setMaxLogSize, setNumBackup, setCompress, shutdown, getCurrentSettings } = require("../../../app/logSettings.js");

//stubs
const sio = {
  of() {
    return this;
  }
};
sio.emit = sinon.stub();

describe("Unit test for log4js's helper functions", ()=>{
  describe("#setFilename", ()=>{
    it("should set filename to File appender", ()=>{
      const filename = "hoge";
      setFilename(filename);
      expect(getCurrentSettings().appenders.file.filename).to.eql(filename);
    });
  });
  describe("#setMaxLogSize", ()=>{
    it("should set maxLogSize to File appender", ()=>{
      const maxLogSize = 42;
      setMaxLogSize(maxLogSize);
      expect(getCurrentSettings().appenders.file.maxLogSize).to.eql(maxLogSize);
    });
  });
  describe("#setNumBackup", ()=>{
    it("should set numBackup to File appender", ()=>{
      const numBackup = 12;
      setNumBackup(numBackup);
      expect(getCurrentSettings().appenders.file.backups).to.eql(numBackup);
    });
  });
  describe("#setCompress", ()=>{
    it("should set compressFlag to File appender", ()=>{
      setCompress(true);
      expect(getCurrentSettings().appenders.file.compress).to.be.true;
    });
    it("should set compressFlag to File appender", ()=>{
      setCompress(false);
      expect(getCurrentSettings().appenders.file.compress).to.be.false;
    });
    it("should set compressFlag to File appender", ()=>{
      setCompress(0);
      expect(getCurrentSettings().appenders.file.compress).to.be.false;
    });
    it("should set compressFlag to File appender", ()=>{
      setCompress(1);
      expect(getCurrentSettings().appenders.file.compress).to.be.false;
    });
    it("should set compressFlag to File appender", ()=>{
      setCompress("hoge");
      expect(getCurrentSettings().appenders.file.compress).to.be.false;
    });
  });
  describe("#log", ()=>{
    const logFilename = "./loggingTest.log";
    beforeEach(async()=>{
      setup(logFilename, 4096);
      sio.emit.resetHistory();
      delete process.env.WHEEL_DISABLE_LOG;
    });
    afterEach(async()=>{
      await shutdown();
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
      expect(sio.emit).to.have.been.calledThrice;
      const calls = sio.emit.getCalls();
      expect(calls[0].args[0]).to.eql("logINFO");
      expect(calls[0].args[1]).to.match(/foo$/);
      const secondCall = sio.emit.getCall(1);
      expect(calls[1].args[0]).to.eql("logERR");
      expect(calls[1].args[1]).to.match(/bar$/);
    });
    it("should output to home logger", ()=>{
      const logger = getLogger("home");
      logger.addContext("sio", sio);
      logger.info("foo");
      logger.error("bar");
      expect(sio.emit).to.have.been.calledOnce;
      expect(sio.emit).to.always.have.been.calledWith("showMessage");
      const log = sio.emit.getCall(0).args[1];
      expect(log).to.match(/bar$/);
    });
    it("should output to remotehost logger", ()=>{
      const logger = getLogger("remotehost");
      logger.addContext("sio", sio);
      logger.info("foo");
      logger.error("bar");
      expect(sio.emit).to.have.been.calledOnce;
      expect(sio.emit).to.always.have.been.calledWith("showMessage");
      const log = sio.emit.getCall(0).args[1];
      expect(log).to.match(/bar$/);
    });
  });
});
