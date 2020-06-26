// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#workflow screen:", function () {
  const url = '/';
  const targetProjectName = "component";
  const id_E2ETestDir = "E2ETestDir_data";
  const id_testProjectJson = "prj_wheel_json_data";
  // test param
  const testName = "task1";
  const testDescription = "property test";
  const testScript = "script.sh";
  const testInputFiles = "inputfile";
  const testOutputFiles = "outputfile";
  const testHost = "pbs";
  const testQueue = "queueB";
  const testParameterSettingFile = "parameterSetting.json";
  const testIndexList = 'dataA';
  const testInclude = "include";
  const testExclude = "exclude";
  const testCondition = "condition.sh";
  const testStart = "1";
  const testEnd = "5";
  const testStep = "1";
  const testFile = "fileA";
  // remotehost param screen
  const labelName = "pbs";
  const hostName = "localhost";
  const port = 4000;
  const userID = "pbsuser";
  const workDir = '/home/pbsuser/';
  const queue = "queueA,queueB";
  // id/class
  const id_pageName = "pageNameLabel";
  const id_projectName = "projectName";
  const id_title = "title";
  const id_property = "property";
  const id_cleanButton = "clean_button";
  const id_drawerButton = "drawerButton";
  const id_hostLabel = "hostLabelInputArea";
  const id_hostName = "hostNameInputArea";
  const id_port = "hostPortInputArea";
  const id_userId = "hostUserIDInputArea";
  const id_workDir = "hostWorkDirInputArea";
  const id_pw = "hostPasswordInputArea";
  const id_queue = "hostQueueInputArea";
  const id_confirmButton = "confirmButton";
  const id_valCheck = "cbMessageArea";
  const id_nameInputField = "nameInputField";
  const id_descriptionInputField = "descriptionInputField";
  const id_scriptField = "scriptSelectField";
  const class_newInputFileNameInputField = "newInputFileNameInputField";
  const class_inputAddDelButton = "inputAddDelButton";
  const id_remotehostSelectField = "remotehostSelectField";
  const id_queueSelectField = "queueSelectField";
  const id_cleanUpFlag1 = "cleanUpFlag1";
  const id_includeInputField = "includeInputField";
  const id_excludeInputField = "excludeInputField";
  const id_parameterFileSelectField = "parameterFileSelectField";
  const id_conditionSelectField = "conditionSelectField";
  const id_startInputField = "startInputField";
  const id_endInputField = "endInputField";
  const id_stepInputField = "stepInputField";
  const class_newIndexListField = "newIndexListField";
  const id_outputFileSelectField ="outputFileSelectField";
  const cleanCheckDialog = '/html/body/div[2]';
  const cleanCheckDialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';
  // Xpath home screen
  const importMenu = '//*[@id="importButton"]';
  const importDialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
  const deleteMenu = '/html/body/ul/li';
  // Xpath remotehost screen
  const drawerRemotehost = '//*[@id="drawerMenuList"]/li[1]/a';
  const hostlist = '//*[@id="pageNameArea"]';

  it("Home screen is drawn", function () {
    browser.url(url);
    browser.setWindowSize(1400, 1080);
    expect(browser.getTitle()).to.equal("WHEEL home");
    expect(`#${id_pageName}`).to.have.text("Home");
  });
  it("move to remotehost screen", function () {
    $(`#${id_drawerButton}`).click();
    $(drawerRemotehost).waitForDisplayed();
    browser.pause(1000);
    $(drawerRemotehost).click();
    $(hostlist).waitForDisplayed(); 
    browser.newWindow('WHEEL host');
    $(`#${id_hostLabel}`).waitForDisplayed();
    let elem = $(`#${id_hostLabel}`).isDisplayed();
    expect(elem).to.be.true;
  });
  it("add remotehost", function () {
    $(`#${id_hostLabel}`).setValue(labelName);
    $(`#${id_hostName}`).setValue(hostName);
    $(`#${id_userId}`).setValue(userID);
    $(`#${id_queue}`).setValue(queue);
    $(`#${id_port}`).click();
    browser.keys('Backspace');
    browser.keys('Backspace');
    $(`#${id_port}`).setValue(port);
    $(`#${id_workDir}`).setValue(workDir);
    $(`#${id_pw}`).click();
    $(`#${id_confirmButton}`).click();
    $(`#${labelName}`).waitForDisplayed(5000);
    let elem = $(`#${labelName}`).isDisplayed();
    expect(elem).to.be.true;
  });
  it("return to home screen", function () {
    $(`#${id_title}`).click()
    browser.pause(1000);
    expect(`#${id_pageName}`).to.have.text("Home");
});
  it(`project ${targetProjectName} : import`, function () {
    $(importMenu).click();
    $(`#${id_E2ETestDir}`).waitForDisplayed();
    $(`#${id_E2ETestDir}`).doubleClick();
    $(`#${targetProjectName}_wheel_data`).waitForDisplayed();
    $(`#${targetProjectName}_wheel_data`).doubleClick();
    $(`#${id_testProjectJson}`).waitForDisplayed();
    $(`#${id_testProjectJson}`).click();
    $(importDialogOKButton).click();
    $(`#prj_${targetProjectName}`).waitForDisplayed();
    let elem = $(`#prj_${targetProjectName}`).isDisplayed();
    expect(elem).to.be.true;
});
  it(`project ${targetProjectName} : open`, function () {
    $(`#prj_${targetProjectName}`).doubleClick();
    $(`#${id_projectName}`).waitForDisplayed();
    expect(`#${id_projectName}`).to.have.text(targetProjectName)  
  });
  // task component  
  it("check 'task' component", function () {
    $('.svg_task0_box').waitForDisplayed();
    expect($('#task0_upper').getAttribute('class')).to.equal('upperPlug');
    expect($('#task0_lower').getAttribute('class')).to.equal('connectorPlug lowerPlug');
  });
  //workflow component
  it("check 'workflow' component", function () {  
    $('.svg_workflow0_box').waitForDisplayed();
    expect($('#workflow0_upper').getAttribute('class')).to.equal('upperPlug');
    expect($('#workflow0_lower').getAttribute('class')).to.equal('connectorPlug lowerPlug');
  });
  //PS component
  it("check 'PS' component", function () {
    $('.svg_PS0_box').waitForDisplayed();
    expect($('#PS0_upper').getAttribute('class')).to.equal('upperPlug');
    expect($('#PS0_lower').getAttribute('class')).to.equal('connectorPlug lowerPlug');
  });
  //if component
  it("check 'if' component", function () {   
    $('.svg_if0_box').waitForDisplayed();
    expect($('#if0_upper').getAttribute('class')).to.equal('upperPlug');
    expect($('#if0_lower').getAttribute('class')).to.equal('connectorPlug lowerPlug');
    expect($('#if0_else').getAttribute('class')).to.equal('connectorPlug elsePlug');
  });
  //for component
  it("check 'for' component", function () {  
    $('.svg_for0_box').waitForDisplayed();
    expect($('#for0_upper').getAttribute('class')).to.equal('upperPlug');
    expect($('#for0_lower').getAttribute('class')).to.equal('connectorPlug lowerPlug');
  });
  //while component
  it("check 'while' component", function () {
    $('.svg_while0_box').waitForDisplayed();
    expect($('#while0_upper').getAttribute('class')).to.equal('upperPlug');
    expect($('#while0_lower').getAttribute('class')).to.equal('connectorPlug lowerPlug');
  });
  //foreach component
  it("check 'foreach' component", function () {
    $('.svg_foreach0_box').waitForDisplayed();
    expect($('#foreach0_upper').getAttribute('class')).to.equal('upperPlug');
    expect($('#foreach0_lower').getAttribute('class')).to.equal('connectorPlug lowerPlug');
  });
  //source component
  it("check 'source' component", function () {
    $('.svg_source0_box').waitForDisplayed();
    expect($('#source0__connector').getAttribute('class')).to.equal('connectorPlug');
  });
  // viewer component
  it("check 'viewer' component", function () {
    $('.svg_viewer0_box').waitForDisplayed();
  });
  // rename test
  it("component property 'name' check", function () {
    $('.svg_task0_box').click();
    $(`#${id_nameInputField}`).click();
    browser.keys('Backspace');
    browser.keys('Backspace');
    browser.keys('Backspace');
    browser.keys('Backspace');
    browser.keys('Backspace');
    browser.keys(testName);
    browser.keys('Tab');
    $(`.svg_${testName}_box`).waitForExist();
    expect($(`#${id_nameInputField}`).getValue()).to.equal(`${testName}`);
  });
  // description test
  it("component property 'description' check", function () {
    $(`.svg_${testName}_box`).click();
    $(`#${id_descriptionInputField}`).click();
    browser.keys(testDescription)
    browser.keys('Tab');
    expect($(`#${id_valCheck}`).getText()).to.equal(testDescription);
    expect($(`#${id_descriptionInputField}`).getValue()).to.equal(testDescription);
  });
  // script test
  it("component property 'script' check", function () {
    $(`.svg_${testName}_box`).click();
    $(`#${id_scriptField}`).selectByVisibleText(testScript);
    browser.keys("Tab");
    $(`.svg_${testName}_box`).click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal(testScript);
    expect($(`#${id_scriptField}`).getValue()).to.equal(testScript);
  });
  it("component property 'inputFiles' check", function () {
    $(`.svg_${testName}_box`).click();
    $(`.${class_newInputFileNameInputField}`).setValue(testInputFiles);
    $(`.${class_inputAddDelButton}`).click();
    $(`#${testName}_${testInputFiles}_receptor`).waitForDisplayed(10000);
    expect($(`#${id_valCheck}`).getText()).to.equal(testInputFiles);
    expect($(`#${testName}_${testInputFiles}_receptor`).getAttribute('data-name')).to.equal(testInputFiles);
  });
  it("component property 'outputFiles' check", function () {
    $(`.svg_${testName}_box`).click();
    $('.newOutputFileNameInputField').setValue(testOutputFiles);
    $('.outputAddDelButton').click();
    $(`#${testName}_${testOutputFiles}_connector`).waitForDisplayed(10000);
    expect($(`#${id_valCheck}`).getText()).to.equal(testOutputFiles);
    expect($(`#${testName}_${testOutputFiles}_connector`).getAttribute('data-name')).to.equal(testOutputFiles);
  });
  it("component property 'remotehost' check", function () {
    $(`.svg_${testName}_box`).click();
    $(`#${id_remotehostSelectField}`).selectByVisibleText(testHost);
    browser.keys("Tab");
    $(`.svg_${testName}_box`).click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal(testHost);
    expect($(`#${id_remotehostSelectField}`).getValue()).to.equal(testHost);
  });
  it("component property 'useJobScheduler' check", function () {
    $(`.svg_${testName}_box`).click();
    $('#useJobSchedulerFlagField').click();
    browser.keys("Tab");
    $(`.svg_${testName}_box`).click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal('true');
  });
  it("component property 'queue' check", function () {
    $(`#${id_property}`).scrollIntoView(0, 300);
    $(`.svg_${testName}_box`).click();
    $(`#${id_queueSelectField}`).selectByVisibleText(testQueue);
    browser.keys("Tab");
    $(`.svg_${testName}_box`).click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal(testQueue);
    expect($(`#${id_queueSelectField}`).getValue()).to.equal(testQueue);
  });
  it("component property 'clean up flag' check", function () {
    $(`#${id_property}`).scrollIntoView(0, 200);
    $(`.svg_${testName}_box`).click();
    $(`#${id_cleanUpFlag1}`).click();
    browser.keys("Tab");
    $(`.svg_${testName}_box`).click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal('1');
    expect($(`#${id_cleanUpFlag1}`).getAttribute('value')).to.equal('1');
  });
  it("component property 'include' check", function () {
    $(`.svg_${testName}_box`).click();
    $(`#${id_cleanUpFlag1}`).waitForDisplayed();
    $(`#${id_includeInputField}`).setValue(testInclude);
    browser.keys("Tab");
    $(`.svg_${testName}_box`).click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal(testInclude);
    expect($(`#${id_includeInputField}`).getValue()).to.equal(testInclude);
  });
  it("component property 'exclude' check", function () {
    $(`.svg_${testName}_box`).click();
    $(`#${id_excludeInputField}`).setValue(testExclude);
    browser.keys("Tab");
    $(`.svg_${testName}_box`).click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal(testExclude);
    expect($(`#${id_excludeInputField}`).getValue()).to.equal(testExclude);
  });
  it("component property 'parameter setting file' check", function () {
    $(`.svg_PS0_box`).click();
    $(`#${id_parameterFileSelectField}`).selectByVisibleText(testParameterSettingFile);
    browser.keys("Tab");
    $(`.svg_PS0_box`).click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal(testParameterSettingFile);
    expect($(`#${id_parameterFileSelectField}`).getValue()).to.equal(testParameterSettingFile);
  });
  it("component property 'forceOverwrite' check", function () {
    $('.svg_PS0_box').click();
    $('#forceOverwriteCheckbox').click();
    browser.keys("Tab");
    $('.svg_PS0_box').click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal('true');
  });
  it("component property 'condition' check", function () {
    $('.svg_if0_box').click();
    $(`#${id_conditionSelectField}`).selectByVisibleText(testCondition);
    browser.keys("Tab");
    $('.svg_if0_box').click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal(testCondition);
    expect($(`#${id_conditionSelectField}`).getValue()).to.equal(testCondition);
  });
  it("component property 'start' check", function () {
    $('.svg_for0_box').click();
    $(`#${id_startInputField}`).setValue(testStart);
    browser.keys("Tab");
    $('.svg_for0_box').click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal(testStart);
    expect($(`#${id_startInputField}`).getValue()).to.equal(testStart);
  });
  it("component property 'end' check", function () {
    $('.svg_for0_box').click();
    $(`#${id_endInputField}`).setValue(testEnd);
    browser.keys("Tab");
    $('.svg_for0_box').click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal(testEnd);
    expect($(`#${id_endInputField}`).getValue()).to.equal(testEnd);
  });
  it("component property 'step' check", function () {
    $('.svg_for0_box').click();
    $(`#${id_stepInputField}`).setValue(testStep);
    browser.keys("Tab");
    $('.svg_for0_box').click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal(testStep);
    expect($(`#${id_stepInputField}`).getValue()).to.equal(testStep);
  });
  it("component property 'indexlist' check", function () {
    $('.svg_foreach0_box').click();
    $(`.${class_newIndexListField}`).click();
    browser.keys('Backspace');
    browser.keys(testIndexList);
    $('.indexListButton').click();
    browser.keys("Tab");
    $('.svg_foreach0_box').click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal(testIndexList);
  });
  it("component property 'outputFile' check", function () {
    $('.svg_source0_box').click();
    $(`#${id_outputFileSelectField}`).selectByVisibleText(testFile);
    browser.keys("Tab");
    $('.svg_source0_box').click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal(testFile);
    expect($(`#${id_outputFileSelectField}`).getValue()).to.equal(testFile);
  });
  it("component property 'uploadOnDemand' check", function () {
    $('.svg_source0_box').click();
    $('#uploadOnDemandFlagField').click();
    browser.keys("Tab");
    $('.svg_source0_box').click();
    $(`#${id_property}`).waitForDisplayed();
    expect($(`#${id_valCheck}`).getText()).to.equal('true');
  });
  it("processing order connector check", function () {
    $(`.svg_workflow0_box`).click();
    $(`.${class_newInputFileNameInputField}`).click();
    browser.keys('Backspace');
    browser.keys(testInputFiles);
    $(`.${class_inputAddDelButton}`).click();
    browser.keys("Tab");
    $(`#workflow0_${testInputFiles}_receptor`).waitForDisplayed(10000);
    expect($(`#workflow0_${testInputFiles}_receptor`).getAttribute('data-name')).to.equal(testInputFiles);
    const target = $('#PS0_upper');
    $(`#${testName}_lower`).dragAndDrop(target);
    $(`#${testName}_lower_PS0_upper_cable`).waitForDisplayed(10000);
  });
  it("file connector check", function () {
    const target = $(`#workflow0_${testInputFiles}_receptor`);
    $(`#${testName}_${testOutputFiles}_connector`).dragAndDrop(target);
    $(`#${testName}_${testOutputFiles}_connector_workflow0_${testInputFiles}_receptor_cable`).waitForDisplayed(10000);
  });
  it("else connector check", function () {
    const target = $('#for0_upper');
    $('#if0_else').dragAndDrop(target);
    $('#if0_else_for0_upper_cable').waitForDisplayed(10000);
  });
  it("component delete check", function () {
    $('.svg_foreach0_box').click({button:'right'});
    $(deleteMenu).click();
    $('.svg_foreach0_box').waitForExist(10000, true);
  });
  it("initialize project", function () {
    $(`#${id_cleanButton}`).click();
    $(cleanCheckDialog).waitForDisplayed();
    $(cleanCheckDialogOkButton).click();
  });
});
