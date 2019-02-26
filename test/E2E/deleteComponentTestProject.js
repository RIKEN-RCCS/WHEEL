// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#home", function () {
  const url = '/';
  //Xpath for ok button in dialog
  const okBtn = "/html/body/div[5]/div[3]/div/button[2]";
  //Xpath for "delete" in context menu
  const deleteMenu = '/html/body/ul/li[3]';
  const testProjectName = "E2E_ComponentTest"

  it("Home screen is drawn", function () {
    browser.url(url);
    browser.windowHandleSize({ width: 1920, height: 1080 });
    expect(browser.getTitle()).to.equal("WHEEL home");
    expect('#pageNameLabel').to.have.text("Home");
  });
  it("delete testproject for next test", function () {
    browser.rightClick(`#prj_${testProjectName}`)
      .click(deleteMenu)
      .click(okBtn)
      .waitForExist(`#prj_${testProjectName}`, 100000, true);
  });
});
