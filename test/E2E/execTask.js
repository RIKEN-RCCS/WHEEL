// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("execute test : ", function () {
  const url = '/';
  const okBtn = "/html/body/div[5]/div[3]/div/button[2]";
  const testProjectName = "testProject";
  const testProjectDescription = "This is E2E test project.";
  const renameTaskComponentName = "echoTask";
  const taskDescription = "This component execute echo.";
  const taskScript = "echo.sh";
  const scriptFileName = "echo.sh";
  const createFileDialogOkButton = '/html/body/div[8]/div[3]/div/button[2]';
  const script = "#!/bin/sh \n echo Hello World!";
  // id name
  const id_pageName = "pageNameLabel";
  const id_newButton = "newButton";
  const id_newProjectName = "newProjectName";
  const id_description = "description";
  const id_prjName = "project_name";
  const id_taskLibrary = "taskLibraryButton";
  const class_taskComponent = "task0_box";
  const deleteMenu = '/html/body/ul/li[3]';

  it("Home screen is drawn", function () {
    browser.url(url);
    browser.setWindowSize(1920, 1080);
    expect(browser.getTitle()).to.equal("WHEEL home");
    expect(`#${id_pageName}`).to.have.text("Home");
});
  it("create test project", function () {
    browser.url(url);
    $(`#${id_newButton}`).click();
    $(`#${id_newProjectName}`).setValue(testProjectName);
    $(`#${id_description}`).setValue(testProjectDescription)
    $(okBtn).click();
    $(`#prj_${testProjectName}`).waitForDisplayed();
    let elem = $(`#${id_hostLabel}`).isDisplayed();
    expect(elem).to.be.true;
  });
  it("open test project", function () {
    browser.doubleClick(`#prj_${testProjectName}`)
    $(`#${id_prjName}`).waitForDisplayed();
    expect(browser.getTitle()).to.equal("WHEEL workflow");
  });
  it("create task component", function () {
    browser.click(`#${id_taskLibrary}`)
      .waitForVisible('#workflow');
    browser.selectorExecute('#node_svg', function () {
      const pos = { x: 300, y: 200 };
      const sio = io('/workflow');
      sio.emit('createNode', { "type": 'task', "pos": pos });
    });
    $(`.${class_taskComponent}`).waitForDisplayed();
    let elem = $(`.${class_taskComponent}`).isDisplayed();
    expect(elem).to.be.true;
  });
  it("set task property 'name'", function () {
    // rename
    browser.click('.task0_box')
      .setValue('#nameInputField', renameTaskComponentName)
      .click('#node_svg')
      .waitForExist(`.${renameTaskComponentName}_box`);
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(renameTaskComponentName);
    expect(browser.getValue('#nameInputField')).to.equal(renameTaskComponentName);
  });
  it("set task property 'description'", function () {
    // change description
    browser.click(`.${renameTaskComponentName}_box`)
      .setValue('#descriptionInputField', taskDescription)
      .click('#node_svg');
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(taskDescription);
    expect(browser.getValue('#descriptionInputField')).to.equal(taskDescription);
  });
  it("set task property 'create script file'", function () {
    // scroll #property
    browser.scroll('#property', 0, 200)
      .click('#createFileButton')
      .waitForVisible('#dialog');
    browser.setValue('#newFileName', scriptFileName)
      .click(createFileDialogOkButton)
      .waitForVisible('.file');
  });
  it("set task property 'script'", function () {
    // script test
    browser.scroll('#property', 0, 200)
      .setValue('#scriptInputField', taskScript)
      .click('#node_svg');
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(taskScript);
    expect(browser.getValue('#scriptInputField')).to.equal(taskScript);
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
  it("Back to the Home screen", function () {
    browser.click('#title')
      .waitForExist(`#prj_${testProjectName}`, 100000, false);
  });
  it("delete testproject for next test", function () {
    browser.rightClick(`#prj_${testProjectName}`)
      .click(deleteMenu)
      .click(okBtn)
      .waitForExist(`#prj_${testProjectName}`, 100000, true);
  });
});
