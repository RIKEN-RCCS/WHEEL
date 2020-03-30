// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#workflow screen:", function () {
  const url = '/';
  const targetProjectName = "E2E_ComponentTest";
  const id_E2ETestDir = "E2ETestDir_data";
  const id_testProjectJson = "prj_wheel_json_data";
  // Xpath for "import"
  const importMenu = '//*[@id="importButton"]';
  const importDialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
  const dialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
  //Xpath for ok button in dialog
  // const okBtn = "/html/body/div[5]/div[3]/div/button[2]";
  const deleteMenu = "/html/body/ul/li";
  const renameTaskComponentName = "task1";
  const testDescription = "property test";
  const testScript = "echo.bat";
  const testInputFiles = "inputfile";
  const testOutputFiles = "outputfile";
  const testhost = "testHost";
  const testParameterSettingFile = "parametersettingfile.json";
  const testIndexList = "indexlist";
  const testInclude = "include";
  const testExclude = "exclude";
  const testCondition = "condition";
  const testStart = "1"
  const testEnd = "5"
  const testStep = "1"
  // ↓ for remotehost screen
  const labelName = 'pbs';
  const hostName = 'localhost';
  const port = 4000;
  const userID = "pbsuser";
  const workDir = "/home/pbsuser/";
  const queue = "queue"
  // id/class name
  const labelAreaId = 'hostLabelInputArea';
  const hostNameAreaId = 'hostNameInputArea';
  const portAreaId = 'hostPortInputArea';
  const userIDAreaId = 'hostUserIDInputArea';
  const workDirAreaId = 'hostWorkDirInputArea';
  const PWButtonId = 'hostPasswordInputArea';
  const queueId = 'hostQueueInputArea'
  const confirmButton = 'confirmButton'; 
  //Xpath
  const drawerRemotehost = '//*[@id="drawerMenuList"]/li[1]/a';
  const okBtn = '/html/body/div[4]/div[3]/div/button[2]';
  const hostlist = '//*[@id="pageNameArea"]';

  it("Home screen is drawn", function () {
    browser.url(url);
    browser.setWindowSize(1920, 1080);
    expect(browser.getTitle()).to.equal("WHEEL home");
    expect('#pageNameLabel').to.have.text("Home");
  });
  it("move to remotehost screen", function () {
    // open right drawer.
    $('#drawerButton').click();
    $(drawerRemotehost).waitForDisplayed();
    expect(drawerRemotehost).to.exist;
    // $('#remotehostButton').click();
    const CLICK =  $(`${drawerRemotehost}`).isClickable();
    console.log(CLICK)
    browser.pause(1000);
    $(`${drawerRemotehost}`).click();
    $(hostlist).waitForDisplayed(); 
    browser.newWindow('WHEEL host');
    $(`#${labelAreaId}`).waitForDisplayed();
    expect(`#${labelAreaId}`).to.exist;
});
it("add remotehost", function () {
    // add remotehost
    // $("#newButton").click()
    $(`#${labelAreaId}`).setValue(labelName)
    $(`#${hostNameAreaId}`).setValue(hostName)
    $(`#${userIDAreaId}`).setValue(userID)
    $(`#${portAreaId}`).click()
    browser.keys('Backspace')
    browser.keys('Backspace')
    $(`#${portAreaId}`).setValue(port)
    $(`#${workDirAreaId}`).setValue(workDir)
    $(`#${PWButtonId}`).click();
    $(`#${queueId}`).setValue(queue);
    $(`#${confirmButton}`).click()
    $(`#${labelName}`).waitForDisplayed(5000)
});
it("return to home screen", function () {
$('#title').click()
    browser.pause(1000);
    expect('#pageNameLabel').to.have.text("Home");
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
    expect(`#prj_${targetProjectName}`).to.exist;
  });
  it(`project ${targetProjectName} : open`, function () {
    $(`#prj_${targetProjectName}`).doubleClick();
    $('#project_name').waitForDisplayed();
    expect('#project_name').to.have.text(targetProjectName)  
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
    // $('#nameInputField').setValue(renameTaskComponentName)
    // browser.keys("Tab");

    $('#nameInputField').click();
    browser.keys('Backspace')
    browser.keys('Backspace')
    browser.keys('Backspace')
    browser.keys('Backspace')
    browser.keys('Backspace')
    browser.keys(renameTaskComponentName)
    browser.keys('Tab');

    $(`.svg_${renameTaskComponentName}_box`).waitForExist();
    expect($('#nameInputField').getValue()).to.equal(`${renameTaskComponentName}`);
  });
  // description test
  it("component property 'description' check", function () {
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('#descriptionInputField').click();
    browser.keys(testDescription)
    browser.keys('Tab');
    expect($('#cbMessageArea').getText()).to.equal(testDescription);
    expect($('#descriptionInputField').getValue()).to.equal(testDescription);
  });
  // script test
  it("component property 'script' check", function () {
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('#scriptInputField').selectByIndex(1)
    browser.keys("Tab");
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('#property').waitForDisplayed();
    expect($('#cbMessageArea').getText()).to.equal(testScript);
    expect($('#scriptInputField').getValue()).to.equal(testScript);
  });
  it("component property 'inputFiles' check", function () {
    // inputFiles test
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('.newInputFileNameInputField').setValue(testInputFiles);
    $('.inputAddDelButton').click();
    $(`#${renameTaskComponentName}_${testInputFiles}_receptor`).waitForDisplayed(10000);
    expect($('#cbMessageArea').getText()).to.equal(testInputFiles);
    expect($(`#${renameTaskComponentName}_${testInputFiles}_receptor`).getAttribute('data-name')).to.equal(testInputFiles);
  });
  it("component property 'outputFiles' check", function () {
    // outputFiles test
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('.newOutputFileNameInputField').setValue(testOutputFiles);
    $('.outputAddDelButton').click();
    $(`#${renameTaskComponentName}_${testOutputFiles}_connector`).waitForDisplayed(10000);
    expect($('#cbMessageArea').getText()).to.equal(testOutputFiles);
    expect($(`#${renameTaskComponentName}_${testOutputFiles}_connector`).getAttribute('data-name')).to.equal(testOutputFiles);
  });
  it("component property 'remotehost' check", function () {
    // remotehost test
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('#remotehostSelectField').selectByIndex(1)
    browser.keys("Tab");
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('#property').waitForDisplayed();
    expect($('#cbMessageArea').getText()).to.equal(testhost);
    expect($('#remotehostSelectField').getValue()).to.equal(testhost);
  });
  it("component property 'useJobScheduler' check", function () {
    // useJobScheduler test
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('#useJobSchedulerFlagField').click();
    browser.keys("Tab");
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('#property').waitForDisplayed();
    expect($('#cbMessageArea').getText()).to.equal('true');
  });
  it("component property 'queue' check", function () {
    // queue test
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('#queueSelectField').selectByIndex(1)
    browser.keys("Tab");
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('#property').waitForDisplayed();
    expect($('#cbMessageArea').getText()).to.equal('b');
    expect($('#queueSelectField').getValue()).to.equal('b');
  });
  it("component property 'clean up flag' check", function () {
    // clean up flag test
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('#cleanUpFlag1').click();
    browser.keys("Tab");
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('#property').waitForDisplayed();
    expect($('#cbMessageArea').getText()).to.equal('1');
    expect($('#cleanUpFlag1').getAttribute('value')).to.equal('1');
  });
  it("component property 'include' check", function () {
    browser.scroll('#property', 0, 200);
    // include test
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('#includeInputField').setValue(testInclude);
    browser.keys("Tab");
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('#property').waitForDisplayed();
    expect($('#cbMessageArea').getText()).to.equal(testInclude);
    expect($('#includeInputField').getValue()).to.equal(testInclude);
  });
  it("component property 'exclude' check", function () {
    // exclude test
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('#excludeInputField').setValue(testExclude);
    browser.keys("Tab");
    $(`.svg_${renameTaskComponentName}_box`).click();
    $('#property').waitForDisplayed();
    expect($('#cbMessageArea').getText()).to.equal(testExclude);
    expect($('#excludeInputField').getValue()).to.equal(testExclude);
  });
  it("component property 'parameter setting file' check", function () {
    // parameter setting file test
    $(`.svg_PS0_box`).click();
    $('#parameterFileInputField').setValue(testParameterSettingFile);
    browser.keys("Tab");
    $(`.svg_PS0_box`).click();
    $('#property').waitForDisplayed();
    expect($('#cbMessageArea').getText()).to.equal(testParameterSettingFile);
    expect($('#parameterFileInputField').getValue()).to.equal(testParameterSettingFile);
  });
  it("component property 'forceOverwrite' check", function () {
    // forceOverwrite test
    $('.svg_PS0_box').click();
    $('#forceOverwriteCheckbox').click();
    browser.keys("Tab");
    $('.svg_PS0_box').click();
    $('#property').waitForDisplayed();
    expect($('#cbMessageArea').getText()).to.equal('true');
  });
  it("component property 'condition' check", function () {
    // condition test
    $('.svg_if0_box').click();
    $('#conditionInputField').setValue(testCondition);
    browser.keys("Tab");
    $('.svg_if0_box').click();
    $('#property').waitForDisplayed();
    expect($('#cbMessageArea').getText()).to.equal(testCondition);
    expect($('#conditionInputField').getValue()).to.equal(testCondition);
  });
  it("component property 'start' check", function () {
    // start test
    $('.svg_for0_box').click();
    $('#startInputField').setValue(testStart);
    browser.keys("Tab");
    $('.svg_for0_box').click();
    $('#property').waitForDisplayed();
    expect($('#cbMessageArea').getText()).to.equal(testStart);
    expect($('#startInputField').getValue()).to.equal(testStart);
  });
  it("component property 'end' check", function () {
    // end test
    $('.svg_for0_box').click();
    $('#endInputField').setValue(testEnd);
    browser.keys("Tab");
    $('.svg_for0_box').click();
    $('#property').waitForDisplayed();
    expect($('#cbMessageArea').getText()).to.equal(testEnd);
    expect($('#endInputField').getValue()).to.equal(testEnd);
  });
  it("component property 'step' check", function () {
    // step test
    $('.svg_for0_box').click();
    $('#stepInputField').setValue(testStep);
    browser.keys("Tab");
    $('.svg_for0_box').click();
    $('#property').waitForDisplayed();
    expect($('#cbMessageArea').getText()).to.equal(testStep);
    expect($('#stepInputField').getValue()).to.equal(testStep);
  });
  it("component property 'indexlist' check", function () {
    // indexlist test
    $(`.svg_foreach0_box`).click();
    $('.newIndexListField').setValue(testIndexList);
    $('.indexListButton').click();
    browser.keys("Tab");
    $('.svg_foreach0_box').click();
    $('#property').waitForDisplayed();
    expect($('#cbMessageArea').getText()).to.equal(testIndexList);
  });
  it("processing order connector check", function () {
    $(`.svg_workflow0_box`).click();
    $('.newInputFileNameInputField').setValue(testInputFiles);
    $('.inputAddDelButton').click();
    browser.keys("Tab");
    $(`#workflow0_${testInputFiles}_receptor`).waitForDisplayed(10000);
    expect($(`#workflow0_${testInputFiles}_receptor`).getAttribute('data-name')).to.equal(testInputFiles);

    browser.dragAndDrop(`#${renameTaskComponentName}_lower`, '#PS0_upper')
    $(`#${renameTaskComponentName}_lower_PS0_upper_cable`).waitForDisplayed(10000);
  });
  it("file connector check", function () {
    browser.dragAndDrop(`#${renameTaskComponentName}_${testOutputFiles}_connector`, `#workflow0_${testInputFiles}_receptor`)
    $(`#${renameTaskComponentName}_${testOutputFiles}_connector_workflow0_${testInputFiles}_receptor_cable`).waitForDisplayed(10000);
  });
  it("else connector check", function () {
    browser.dragAndDrop('#if0_else', '#for0_upper')
    $('#if0_else_for0_upper_cable').waitForDisplayed(100000);
  });
  it("component delete check", function () {
    // component delete
    browser.rightClick('.svg_foreach0_box')
    $(deleteMenu).click();
    $('.svg_foreach0_box').waitForExist(100000, true);
  });
});
