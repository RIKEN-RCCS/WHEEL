// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#home", function () {
  const url = '/';
  //Xpath for ok button in dialog
  const okBtn = "/html/body/div[5]/div[3]/div/button[2]";
  const testProjectName = "E2E_ComponentTest"

  it("Home screen is drawn", function () {
    browser.url(url);
    browser.windowHandleSize({ width: 1200, height: 1200 });
    expect(browser.getTitle()).to.equal("WHEEL home");
    expect('#pageNameLabel').to.have.text("Home");
  });
  it("Create ComponentTestProject and Open", function () {
    browser.url(url)
      .click('#newButton')
      .setValue('#newProjectName', testProjectName)
      .click(okBtn)
      .waitForVisible(`#prj_${testProjectName}`);
    browser.doubleClick(`#prj_${testProjectName}`)
      .waitForVisible('#project_name');
    expect(browser.getTitle()).to.equal("WHEEL workflow");
  });
  it("create components for next test", function () {
    //task component
    browser.selectorExecute('#node_svg', function () {
      const pos = { x: 300, y: 200 };
      const sio = io('/workflow');
      sio.emit('createNode', { "type": 'task', "pos": pos });
    });
    //workflow component
    browser.selectorExecute('#node_svg', function () {
      const pos = { x: 600, y: 200 };
      const sio = io('/workflow');
      sio.emit('createNode', { "type": 'workflow', "pos": pos });
    });
    //PS component
    browser.selectorExecute('#node_svg', function () {
      const pos = { x: 300, y: 300 };
      const sio = io('/workflow');
      sio.emit('createNode', { "type": 'PS', "pos": pos });
    });
    //if component
    browser.selectorExecute('#node_svg', function () {
      const pos = { x: 600, y: 300 };
      const sio = io('/workflow');
      sio.emit('createNode', { "type": 'if', "pos": pos });
    });
    //for component
    browser.selectorExecute('#node_svg', function () {
      const pos = { x: 300, y: 400 };
      const sio = io('/workflow');
      sio.emit('createNode', { "type": 'for', "pos": pos });
    });
    //while component
    browser.selectorExecute('#node_svg', function () {
      const pos = { x: 600, y: 400 };
      const sio = io('/workflow');
      sio.emit('createNode', { "type": 'while', "pos": pos });
    });
    //foreach component
    browser.selectorExecute('#node_svg', function () {
      const pos = { x: 300, y: 500 };
      const sio = io('/workflow');
      sio.emit('createNode', { "type": 'foreach', "pos": pos });
    });
  });
  it("Back to the Home screen", function () {
    browser.click('#title')
      .waitForExist(`#prj_${testProjectName}`, 100000, false);
  });
});
