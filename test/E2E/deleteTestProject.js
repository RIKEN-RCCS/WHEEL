// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
const fs = require("fs");
chai.use(chaiWebdriver(browser));

describe("#home", function () {
  const url = '/';
  //Xpath for ok button in dialog
  const okBtn = "/html/body/div[5]/div[3]/div/button[2]";
  //Xpath for "delete" in context menu
  const deleteMenu = '/html/body/ul/li[3]';
  //delete target project
  const testProjectName1 = "E2E_ComponentTest"

  //delete target project in "execPrjDir".
  const homeDirPath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  const execDirPath = homeDirPath + '/E2ETestDir/execPrjDir';
  const targetPrjDir = fs.readdirSync(execDirPath);

  it("Home screen is drawn", function () {
    browser.url(url);
    browser.windowHandleSize({ width: 1920, height: 1080 });
    expect(browser.getTitle()).to.equal("WHEEL home");
    expect('#pageNameLabel').to.have.text("Home");
  });
  it("delete testproject for next test", function () {
    browser.rightClick(`#prj_${testProjectName1}`)
      .click(deleteMenu)
      .click(okBtn)
      .waitForExist(`#prj_${testProjectName1}`, 10000, true);
  });
  targetPrjDir.forEach(function (target) {
    // set test project
    let testProject = target.replace(/([.*+?^=!:$@%&#,"'~;<>{}()|[\]\/\\])/g, "_");
    let testProjectName = testProject.slice(0, -6);
    it("delete testproject for next test", function () {
      browser.rightClick(`#prj_${testProjectName}`)
        .click(deleteMenu)
        .click(okBtn)
        .waitForExist(`#prj_${testProjectName}`, 10000, true);
    });
  });
});
