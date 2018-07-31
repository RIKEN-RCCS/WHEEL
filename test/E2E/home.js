// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#home", function(){
  const url='/';
  const testProjectName="CreateRenameDeleteProjectTest";
  const renamedTestProjectName="CreateRenameDeleteProjectTest2";

  it("Home screen is drawn", function(){
    browser.url(url);
    expect(browser.getTitle()).to.equal("WHEEL home");
    expect('#pageName').to.have.text("Home");
  });
  it("create, rename and delete project", function(){
    //Xpath for top of the project list
    const firstProject='//*[@id="projectList"]/ul[1]/li[1]';
    //Xpath for "rename" in context menu
    const renameMenu= '/html/body/ul/li[2]';
    //Xpath for "delete" in context menu
    const deleteMenu= '/html/body/ul/li[3]';
    //Xpath for ok button in dialogue
    const okBtn= "/html/body/div[5]/div[3]/div/button[2]";

    // create new project
    browser.url(url)
    .click('#newButton')
    .setValue('#newProjectName', testProjectName)
    .click(okBtn)
    .waitForVisible(firstProject);

    // check if the top of project list has testProjectName
    expect(firstProject).to.have.text(testProjectName);

    // rename project
    browser.rightClick(firstProject)
    .click(renameMenu)
    .setValue('#renamedProjectName', renamedTestProjectName)
    .click(okBtn)
    .waitForVisible(firstProject);

    // check if the top of project list has renamedTestProjectName
    expect(firstProject).to.have.text(renamedTestProjectName);

    // delete project
    browser.rightClick(firstProject)
    .click(deleteMenu)
    .click(okBtn)
    .waitForVisible(firstProject);

    // check if the top of project list does not have renamedTestProjectName
    // TODO project listが空になった時の対応
    expect(firstProject).not.to.have.text(renamedTestProjectName);
  });
});
