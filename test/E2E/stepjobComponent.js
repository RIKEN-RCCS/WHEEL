// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("stepjob : project open", function () {
  const url = '/';
  const targetProjectName = "stepjobComponent";
  const id_E2ETestDir = "E2ETestDir_data";
  const id_testProjectJson = "prj_wheel_json_data";
  const id_pageName = "pageNameLabel";
  const id_projectName = "projectName";
  // Xpath home screen
  const xpath_importMenu = '//*[@id="importButton"]';
  const xpath_importDlgOk = '/html/body/div[5]/div[3]/div/button[2]';
  const deleteMenu = '/html/body/ul/li';

  it("Home screen is drawn", function () {
    browser.url(url);
    browser.setWindowSize(1400, 1080);
    expect(browser.getTitle()).to.equal("WHEEL home");
    expect(`#${id_pageName}`).to.have.text("Home");
  });
  it(`project ${targetProjectName} : import`, function () {
    $(xpath_importMenu).click();
    $(`#${id_E2ETestDir}`).waitForDisplayed();
    $(`#${id_E2ETestDir}`).doubleClick();
    $(`#${targetProjectName}_wheel_data`).waitForDisplayed();
    $(`#${targetProjectName}_wheel_data`).doubleClick();
    $(`#${id_testProjectJson}`).waitForDisplayed();
    $(`#${id_testProjectJson}`).click();
    $(xpath_importDlgOk).click();
    $(`#prj_${targetProjectName}`).waitForDisplayed();
    let elem = $(`#prj_${targetProjectName}`).isDisplayed();
    expect(elem).to.be.true;
  });
  it(`project ${targetProjectName} : open`, function () {
    $(`#prj_${targetProjectName}`).doubleClick();
    $(`#${id_projectName}`).waitForDisplayed();
    expect(`#${id_projectName}`).to.have.text(targetProjectName)  
  });
});
describe("stepjob : compoent property", function () {
  const testStepjobName = "stepjob0";
  const testStepjobTaskName0 = "stepjobTask0";
  const testStepjobTaskName1 = "stepjobTask1";
  const testStepjobTaskName2 = "stepjobTask2";
  const stepjobCompoentName = `svg_${testStepjobName}_box`;
  const stepjobTaskCompoentName0 = `svg_${testStepjobTaskName0}_box`;
  const stepjobTaskCompoentName1 = `svg_${testStepjobTaskName1}_box`;
  const stepjobTaskCompoentName2 = `svg_${testStepjobTaskName2}_box`;
  const stepjobTaskInputFile = "in";
  const stepjobTaskOutputFile = "out";
  const testForm = "sd=ec!=0:all:0";
  // id/class
  const id_componentLibraryButton = "componentLibraryButton";
  const id_componentLibrary_task = "task";
  const id_componentLibrary_stepjobTask = "stepjobTask";
  const id_property = "property";
  const id_nodeSvg = "node_svg";
  const id_valCheck = "cbMessageArea";
  const id_useDependencyFlagField = "useDependencyFlagField";
  const id_form = "dependencyInputField";
  const id_propertyStepNumber = "propertyStepNumber";
  const xpath_fileConnectErrDlg = '/html/body/div[2]';
  const xpath_fileConnectErrDlgOk = '/html/body/div[2]/div[3]/div/button[2]';
  const id_cleanButton = "clean_button";
  const xpath_cleanCheckDlg = '/html/body/div[2]';
  const xpath_cleanCheckDlgOk = '/html/body/div[2]/div[3]/div/button[2]';

  it("compoent library in workflow", function () {
    $(`#${id_componentLibraryButton}`).click();
    $(`#${id_componentLibrary_task}`).waitForDisplayed();
    const elem_task = $("#task").isDisplayed();
    const elem_if = $("#if").isDisplayed();
    const elem_for = $("#for").isDisplayed();
    const elem_while = $("#while").isDisplayed();
    const elem_foreach = $("#foreach").isDisplayed();
    const elem_source = $("#source").isDisplayed();
    const elem_viewer = $("#viewer").isDisplayed();
    const elem_PS = $("#PS").isDisplayed();
    const elem_workflow = $("#workflow").isDisplayed();
    const elem_stepjob = $("#stepjob").isDisplayed();
    const elem_stepjobTask = $("#stepjobTask").isDisplayed();
    expect(elem_task).to.be.true;
    expect(elem_if).to.be.true;
    expect(elem_for).to.be.true;
    expect(elem_while).to.be.true;
    expect(elem_foreach).to.be.true;
    expect(elem_source).to.be.true;
    expect(elem_viewer).to.be.true;
    expect(elem_PS).to.be.true;
    expect(elem_workflow).to.be.true;
    expect(elem_stepjob).to.be.true;
    expect(elem_stepjobTask).to.not.be.true;
  });
  it("view stepjobTask compoent", function () {
    $(`.${stepjobCompoentName}`).waitForDisplayed();
    $(`.${stepjobCompoentName}`).doubleClick();
    $(`.${stepjobTaskCompoentName0}`).waitForDisplayed();
    $(`.${stepjobTaskCompoentName1}`).waitForDisplayed();
    const elem0 = $(`.${stepjobTaskCompoentName0}`).isDisplayed();
    const elem1 = $(`.${stepjobTaskCompoentName1}`).isDisplayed();
    expect(elem0).to.be.true;
    expect(elem1).to.be.true;
  });
  it("compoent library in stepjob", function () {
    $(`#${id_componentLibraryButton}`).click();
    $(`#${id_componentLibrary_stepjobTask}`).waitForDisplayed();
    const elem_task = $("#task").isDisplayed();
    const elem_if = $("#if").isDisplayed();
    const elem_for = $("#for").isDisplayed();
    const elem_while = $("#while").isDisplayed();
    const elem_foreach = $("#foreach").isDisplayed();
    const elem_source = $("#source").isDisplayed();
    const elem_viewer = $("#viewer").isDisplayed();
    const elem_PS = $("#PS").isDisplayed();
    const elem_workflow = $("#workflow").isDisplayed();
    const elem_stepjob = $("#stepjob").isDisplayed();
    const elem_stepjobTask = $("#stepjobTask").isDisplayed();
    expect(elem_task).to.not.be.true;
    expect(elem_if).to.not.be.true;
    expect(elem_for).to.not.be.true;
    expect(elem_while).to.not.be.true;
    expect(elem_foreach).to.not.be.true;
    expect(elem_source).to.not.be.true;
    expect(elem_viewer).to.not.be.true;
    expect(elem_PS).to.not.be.true;
    expect(elem_workflow).to.not.be.true;
    expect(elem_stepjob).to.not.be.true;
    expect(elem_stepjobTask).to.be.true;
  });
  it("stepjobTask property : useDependency", function () {
    $(`.${stepjobTaskCompoentName1}`).click();
    $(`#${id_property}`).waitForDisplayed();
    $(`#${id_useDependencyFlagField}`).click();
    browser.keys("Tab");
    expect($(`#${id_valCheck}`).getText()).to.equal('true');
  });
  it("stepjobTask property : form", function () {
    $(`.${stepjobTaskCompoentName1}`).click();
    $(`#${id_property}`).waitForDisplayed();
    $(`#${id_form}`).setValue(testForm);
    browser.keys("Tab");
    expect($(`#${id_valCheck}`).getText()).to.equal(testForm);
    expect($(`#${id_form}`).getValue()).to.equal(testForm);
  });
  it("stepjobTask property : stepnumber", function () {
    $(`#${id_nodeSvg}`).click();
    const target2 = $(`#${testStepjobTaskName2}_upper`);
    const target1 = $(`#${testStepjobTaskName1}_upper`);
    $(`#${testStepjobTaskName0}_lower`).dragAndDrop(target2);
    $(`#${testStepjobTaskName0}_lower_${testStepjobTaskName2}_upper_cable`).waitForDisplayed();
    $(`#${testStepjobTaskName2}_lower`).dragAndDrop(target1);
    $(`#${testStepjobTaskName2}_lower_${testStepjobTaskName1}_upper_cable`).waitForDisplayed();
    $(`.${stepjobTaskCompoentName1}`).click();
    $(`#${id_property}`).waitForDisplayed();
    $(`#${id_form}`).click();
    expect($(`#${id_propertyStepNumber}`).getText()).to.equal("step number : 2");
    expect($(`#${testStepjobTaskName2}_lower_${testStepjobTaskName1}_upper_cable`).getAttribute('stroke-dasharray')).to.equal("4 4");
  });
  it("stepjobTask -> stepjobTask", function () {
    const target = $(`#${testStepjobTaskName1}_${stepjobTaskInputFile}_receptor`);
    $(`#${testStepjobTaskName0}_${stepjobTaskOutputFile}_connector`).dragAndDrop(target);
    $(xpath_fileConnectErrDlg).waitForDisplayed();
    const elem1 = $(xpath_fileConnectErrDlg).isDisplayed();
    expect(elem1).to.be.true;
    $(xpath_fileConnectErrDlgOk).click();
    $(xpath_fileConnectErrDlg).waitForDisplayed(10000,true);
    const elem2 = $(`#${testStepjobTaskName0}_${stepjobTaskOutputFile}_connector_${testStepjobTaskName1}_${stepjobTaskInputFile}_receptor_cable`).isDisplayed();
    expect(elem2).to.not.be.true;
  });
  it("stepjob -> stepjobTask", function () {
    const target = $(`#${testStepjobTaskName1}_${stepjobTaskInputFile}_receptor`);
    $(`#${testStepjobName}_${stepjobTaskInputFile}_connector`).dragAndDrop(target);
    $(`#${testStepjobName}_${stepjobTaskInputFile}_connector_${testStepjobTaskName1}_${stepjobTaskInputFile}_receptor_cable`).waitForDisplayed();
    const elem = $(`#${testStepjobName}_${stepjobTaskInputFile}_connector_${testStepjobTaskName1}_${stepjobTaskInputFile}_receptor_cable`).isDisplayed();
    expect(elem).to.be.true;
  });
  it("stepjobTask -> stepjob", function () {
    const target = $(`#${testStepjobName}_${stepjobTaskOutputFile}_receptor`);
    $(`#${testStepjobTaskName0}_${stepjobTaskOutputFile}_connector`).dragAndDrop(target);
    $(`#${testStepjobTaskName0}_${stepjobTaskOutputFile}_connector_${testStepjobName}_${stepjobTaskOutputFile}_receptor_cable`).waitForDisplayed();
    const elem = $(`#${testStepjobTaskName0}_${stepjobTaskOutputFile}_connector_${testStepjobName}_${stepjobTaskOutputFile}_receptor_cable`).isDisplayed();
    expect(elem).to.be.true;
  });
  it("initialize project", function(){
    $(`#${id_cleanButton}`).click();
    $(xpath_cleanCheckDlg).waitForDisplayed();
    $(xpath_cleanCheckDlgOk).click();
    $(`.${stepjobCompoentName}`).waitForDisplayed();
    let elem = $(`.${stepjobCompoentName}`).isDisplayed();
    expect(elem).to.be.true;
  });
});
