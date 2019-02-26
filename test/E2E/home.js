// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#home screen", function () {
  const url = '/';
  const testProjectName = "homeScreenTest";
  const testProjectDescription = "This is homeScreenTest.";
  const renamedTestProjectName = "homeScreenTest2";
  //Xpath for "open" in context menu
  const openMenu = '/html/body/ul/li[1]';
  //Xpath for "rename" in context menu
  const renameMenu = '/html/body/ul/li[2]';
  //Xpath for "delete" in context menu
  const deleteMenu = '/html/body/ul/li[3]';
  //Xpath for ok button in dialog
  const okBtn = "/html/body/div[5]/div[3]/div/button[2]";
  //Xpath for ok button in error dialog
  const errorOkBtn = "/html/body/div[5]/div[3]/div/button";

  it("Home screen is drawn", function () {
    browser.url(url);
    browser.windowHandleSize({ width: 1920, height: 1080 });
    expect(browser.getTitle()).to.equal("WHEEL home");
    expect('#pageNameLabel').to.have.text("Home");
  });
  it("project create test", function () {
    browser.url(url)
      .click('#newButton')
      .setValue('#newProjectName', testProjectName)
      .setValue('#description', testProjectDescription)
      .click(okBtn)
      .waitForVisible(`#prj_${testProjectName}`);
  });
  it("project open test(rightclick)", function () {
    browser.rightClick(`#prj_${testProjectName}`)
      .click(openMenu)
      .waitForVisible('#project_name');
    browser.click('#title')
      .waitForExist(`#prj_${testProjectName}`, 100000, false);
  });
  it("project open test(doubleclick)", function () {
    browser.doubleClick(`#prj_${testProjectName}`)
      .waitForVisible('#project_name');
    browser.click('#title')
      .waitForExist(`#prj_${testProjectName}`, 100000, false);
  });
  it("project rename test", function () {
    browser.rightClick(`#prj_${testProjectName}`)
      .click(renameMenu)
      .setValue('#renamedProjectName', renamedTestProjectName)
      .click(okBtn)
      .waitForExist(`#prj_${renamedTestProjectName}`, 100000, false);
  });
  it("project delete test", function () {
    browser.rightClick(`#prj_${renamedTestProjectName}`)
      .click(deleteMenu)
      .click(okBtn)
      .waitForExist(`#prj_${renamedTestProjectName}`, 100000, true);
  });
  it("abnormality test : create decouple project name", function () {
    browser.click('#newButton')
      .setValue('#newProjectName', testProjectName)
      .click(okBtn)
      .waitForVisible(`#prj_${testProjectName}`);
    browser.click('#newButton')
      .setValue('#newProjectName', testProjectName)
      .click(okBtn)
      .waitForVisible('#dialog');
    browser.click(errorOkBtn)
  });
  it("abnormality test : rename to blank", function () {
    browser.rightClick(`#prj_${testProjectName}`)
      .click(renameMenu)
      .click('.okButton')
      .waitForVisible('#dialog');
    browser.click(errorOkBtn)
      .waitForVisible('#dialog', 100000, true);
  });
  it("delete testproject for next test", function () {
    browser.rightClick(`#prj_${testProjectName}`)
      .click(deleteMenu)
      .click('.okButton')
      .waitForExist(`#prj_${testProjectName}`, 100000, true);
  });
});
