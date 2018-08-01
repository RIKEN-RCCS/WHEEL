const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const del = require("del");

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
const logger = rewire("../app/logSettings.js");
const getLogger = logger.__get__('getLogger');
const setSocketIO = logger.__get__('setSocketIO');
const setFilename = logger.__get__('setFilename');
const setMaxLogSize = logger.__get__('setMaxLogSize');
const setNumBackup = logger.__get__('setNumBackup');
const setCompress = logger.__get__('setCompress');
const reset = logger.__get__('reset');
const settings=logger.__get__("logSettings");
settings.appenders.socketWF.type = './app/log2client';
settings.appenders.errorlog.type = './app/errorlog';

//stubs
const sio={
  of(){
    return this;
  }
};
sio.emit = sinon.stub();

describe("Unit test for log4js's helper functions", function(){
  describe("#setFilename",function(){
    it("should set filename to File appender", function(){
      const filename = "hoge";
      setFilename(filename);
      const settings=logger.__get__("logSettings");
      expect(settings.appenders.file.filename).to.eql(filename);
    });
  });
  describe("#setMaxLogSize",function(){
    it("should set maxLogSize to File appender", function(){
      const maxLogSize = 42;
      setMaxLogSize(maxLogSize);
      const settings=logger.__get__("logSettings");
      expect(settings.appenders.file.maxLogSize).to.eql(maxLogSize);
    });
  });
  describe("#setNumBackup",function(){
    it("should set numBackup to File appender", function(){
      const numBackup = 12;
      setNumBackup(numBackup);
      const settings=logger.__get__("logSettings");
      expect(settings.appenders.file.backups).to.eql(numBackup);
    });
  });
  describe("#setCompress",function(){
    it("should set compressFlag to File appender", function(){
      setCompress(true);
      const settings=logger.__get__("logSettings");
      expect(settings.appenders.file.compress).to.be.true;
    });
    it("should set compressFlag to File appender", function(){
      setCompress(false);
      const settings=logger.__get__("logSettings");
      expect(settings.appenders.file.compress).to.be.false;
    });
    it("should set compressFlag to File appender", function(){
      setCompress(0);
      const settings=logger.__get__("logSettings");
      expect(settings.appenders.file.compress).to.be.false;
    });
    it("should set compressFlag to File appender", function(){
      setCompress(1);
      const settings=logger.__get__("logSettings");
      expect(settings.appenders.file.compress).to.be.true;
    });
    it("should set compressFlag to File appender", function(){
      setCompress("hoge");
      const settings=logger.__get__("logSettings");
      expect(settings.appenders.file.compress).to.be.false;
    });
  });
  describe("#setSocketIO",function(){
    it("should set socketIO instance to socketWF and errolog appender", function(){
      setSocketIO(sio);
      const settings=logger.__get__("logSettings");
      expect(settings.appenders.socketWF.socketIO).to.eql(sio);
      expect(settings.appenders.errorlog.socketIO).to.eql(sio);
    });
  });
  describe("#log", function(){
    const logFilename="./loggingTest.log";
    beforeEach(async function(){
      await reset();
      setFilename(logFilename);
      setMaxLogSize(4096);
      setSocketIO(sio);
      sio.emit.resetHistory();
    });
    afterEach(async function(){
      await reset();
      await del(logFilename);
    });
    it("should output to default logger",function(){
      const logger=getLogger();
      logger.info("foo");
      logger.error("bar");
      expect(sio.emit).to.have.not.been.called;
    });
    it("should output to workflow logger",function(){
      const logger=getLogger('workflow');
      logger.info("foo");
      logger.error("bar");
      expect(sio.emit).to.have.been.calledTwice;
      const calls = sio.emit.getCalls();
      expect(calls[0].args[0]).to.eql('logINFO');
      expect(calls[0].args[1]).to.match(/foo$/);
      const secondCall = sio.emit.getCall(1);
      expect(calls[1].args[0]).to.eql('logERR');
      expect(calls[1].args[1]).to.match(/bar$/);
    });
    it("should output to home logger",function(){
      const logger=getLogger('home');
      logger.info("foo");
      logger.error("bar");
      expect(sio.emit).to.have.been.calledOnce;
      expect(sio.emit).to.always.have.been.calledWith('showMessage');
      const log = sio.emit.getCall(0).args[1];
      expect(log).to.match(/bar$/);
    });
    it("should output to remotehost logger",function(){
      const logger=getLogger('remotehost');
      logger.info("foo");
      logger.error("bar");
      expect(sio.emit).to.have.been.calledOnce;
      expect(sio.emit).to.always.have.been.calledWith('showMessage');
      const log = sio.emit.getCall(0).args[1];
      expect(log).to.match(/bar$/);
    });
    it("should output to login logger",function(){
      const logger=getLogger('login');
      logger.info("foo");
      logger.error("bar");
      expect(sio.emit).to.have.been.calledOnce;
      expect(sio.emit).to.always.have.been.calledWith('showMessage');
      const log = sio.emit.getCall(0).args[1];
      expect(log).to.match(/bar$/);
    });
    it("should output to admin logger",function(){
      const logger=getLogger('admin');
      logger.info("foo");
      logger.error("bar");
      expect(sio.emit).to.have.been.calledOnce;
      expect(sio.emit).to.always.have.been.calledWith('showMessage');
      const log = sio.emit.getCall(0).args[1];
      expect(log).to.match(/bar$/);
    });
    it("should output to rapid logger",function(){
      const logger=getLogger('rapid');
      logger.info("foo");
      logger.error("bar");
      expect(sio.emit).to.have.been.calledOnce;
      expect(sio.emit).to.always.have.been.calledWith('showMessage');
      const log = sio.emit.getCall(0).args[1];
      expect(log).to.match(/bar$/);
    });
  });
});
