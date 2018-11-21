// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("execute test : ", function () {
  const url = '/';
  //Xpath for ok button in dialog
  const okBtn = "/html/body/div[5]/div[3]/div/button[2]";
  const testProjectName = "testProject";
  const testProjectDescription = "This is E2E test project.";
  const renameTaskComponentName = "echoTask";
  const taskDescription = "This component execute echo.";
  const taskScript = "echo.bat";
  const scriptFileName = "echo.bat";
  const createFileDialogOkButton = '/html/body/div[8]/div[3]/div/button[2]';
  const script = "echo Hello World!";

  it("Home screen is drawn", function () {
    browser.url(url);
    browser.windowHandleSize({ width: 1200, height: 1200 });
    expect(browser.getTitle()).to.equal("WHEEL home");
    expect('#pageNameLabel').to.have.text("Home");
  });
  it("create test project", function () {
    browser.url(url)
      .click('#newButton')
      .setValue('#newProjectName', testProjectName)
      .setValue('#description', testProjectDescription)
      .click(okBtn)
      .waitForVisible(`#prj_${testProjectName}`);
  });
  it("open test project", function () {
    browser.doubleClick(`#prj_${testProjectName}`);
    expect(browser.getTitle()).to.equal("WHEEL workflow");
  });
  it("create task component", function () {
    browser.selectorExecute('#node_svg', function () {
      const pos = { x: 300, y: 200 };
      const sio = io('/workflow');
      sio.emit('createNode', { "type": 'task', "pos": pos });
    });
    browser.waitForVisible('.task0_box');
  });
  it("set task component parameter", function () {
    // rename
    browser.click('.task0_box')
      .setValue('#nameInputField', renameTaskComponentName)
      .click('#node_svg')
      .waitForExist(`.${renameTaskComponentName}_box`);
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(renameTaskComponentName);
    expect(browser.getValue('#nameInputField')).to.equal(renameTaskComponentName);

    // change description
    browser.click(`.${renameTaskComponentName}_box`)
      .setValue('#descriptionInputField', taskDescription)
      .click('#node_svg');
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(taskDescription);
    expect(browser.getValue('#descriptionInputField')).to.equal(taskDescription);

    // create script file
    browser.click(`.${renameTaskComponentName}_box`)
      .click('#createFileButton')
      .waitForVisible('#dialog');
    browser.setValue('#newFileName', scriptFileName)
      .click(createFileDialogOkButton)
      .waitForVisible('.file');

    // script test
    browser.click(`.${renameTaskComponentName}_box`)
      .setValue('#scriptInputField', taskScript)
      .click('#node_svg');
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(taskScript);
    expect(browser.getValue('#scriptInputField')).to.equal(taskScript);

    // set script file by RAPiD
    browser.scroll('#property', 0, 100)
      .click('.file')
      .click('#editFileButton')
      .waitForVisible('.ace_content');
  });
  it("open script file", function () {
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');

    // set script file by RAPiD
    browser.scroll('#property', 0, 100)
      .click('.file')
      .click('#editFileButton');

    browser.click('.ace_content')
      .setValue('.ace_content', script)
      .click('#button_save');

    //transit workflow screen
    browser.newWindow('WHEEL workflow')
      .waitForVisible('#project_name');
  });
  it("execute workflow", function () {
    browser.click('#displayLogButton')
      .waitForVisible('#logArea');

    browser.click('#enableStdout')
      .waitForVisible('#logStdoutLog');

    browser.click('#run_button')
      .waitForText('#logStdoutLog');
  });
  it("check project state", function () {
    browser.waitUntil(function () {
      return browser.getText('#project_state') === 'finished'
    }, 5000, 'expected text to be different after 5s');
  });
});
