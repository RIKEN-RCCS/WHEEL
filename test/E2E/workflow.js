// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#workflow screen:", function () {
  const url = '/';
  const testProjectName = "E2E_ComponentTest";

  //Xpath for ok button in dialog
  const okBtn = "/html/body/div[5]/div[3]/div/button[2]";
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

  it("Workflow screen is drawn", function () {
    //project open
    browser.url(url);
    browser.windowHandleSize({ width: 1200, height: 1300 });
    browser.doubleClick(`#prj_${testProjectName}`)
      .waitForVisible('#project_name');
    expect(browser.getTitle()).to.equal("WHEEL workflow");
  });
  it("check 'task' component", function () {
    //task component
    browser.waitForVisible('.task0_box');
    expect(browser.getAttribute('#task0_upper', 'class')).to.equal('upperPlug');
    expect(browser.getAttribute('#task0_lower', 'class')).to.equal('lowerPlug');
  });
  it("check 'workflow' component", function () {
    //workflow component
    browser.waitForVisible('.workflow0_box');
    expect(browser.getAttribute('#workflow0_upper', 'class')).to.equal('upperPlug');
    expect(browser.getAttribute('#workflow0_lower', 'class')).to.equal('lowerPlug');
  });
  it("check 'PS' component", function () {
    //PS component
    browser.waitForVisible('.PS0_box');
    expect(browser.getAttribute('#PS0_upper', 'class')).to.equal('upperPlug');
    expect(browser.getAttribute('#PS0_lower', 'class')).to.equal('lowerPlug');
  });
  it("check 'if' component", function () {
    //if component
    browser.waitForVisible('.if0_box');
    expect(browser.getAttribute('#if0_upper', 'class')).to.equal('upperPlug');
    expect(browser.getAttribute('#if0_lower', 'class')).to.equal('lowerPlug');
    expect(browser.getAttribute('#if0_else', 'class')).to.equal('elsePlug');
  });
  it("check 'for' component", function () {
    //for component
    browser.waitForVisible('.for0_box');
    expect(browser.getAttribute('#for0_upper', 'class')).to.equal('upperPlug');
    expect(browser.getAttribute('#for0_lower', 'class')).to.equal('lowerPlug');
  });
  it("check 'while' component", function () {
    //while component
    browser.waitForVisible('.while0_box');
    expect(browser.getAttribute('#while0_upper', 'class')).to.equal('upperPlug');
    expect(browser.getAttribute('#while0_lower', 'class')).to.equal('lowerPlug');
  });
  it("check 'foreach' component", function () {
    //foreach component
    browser.waitForVisible('.foreach0_box');
    expect(browser.getAttribute('#foreach0_upper', 'class')).to.equal('upperPlug');
    expect(browser.getAttribute('#foreach0_lower', 'class')).to.equal('lowerPlug');
  });
  it("component property 'name' check", function () {
    // component name test
    browser.click('.task0_box')
      .setValue('#nameInputField', renameTaskComponentName)
      .click('#node_svg')
      .waitForExist(`.${renameTaskComponentName}_box`);
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');
    expect(browser.getValue('#nameInputField')).to.equal(renameTaskComponentName);
  });
  it("component property 'description' check", function () {
    // description test
    browser.click(`.${renameTaskComponentName}_box`)
      .setValue('#descriptionInputField', testDescription)
      .click('#node_svg');
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(testDescription);
    expect(browser.getValue('#descriptionInputField')).to.equal(testDescription);
  });
  it("component property 'script' check", function () {
    // script test
    browser.click(`.${renameTaskComponentName}_box`)
      .setValue('#scriptInputField', testScript)
      .click('#node_svg');
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(testScript);
    expect(browser.getValue('#scriptInputField')).to.equal(testScript);
  });
  it("component property 'inputFiles' check", function () {
    // inputFiles test
    browser.click(`.${renameTaskComponentName}_box`)
      .setValue('.newInputFileNameInputField', testInputFiles)
      .click('.inputAddDelButton')
      .click('#node_svg')
      .waitForVisible(`#${renameTaskComponentName}_${testInputFiles}_receptor`, 100000);
    expect(browser.getText('#cbMessageArea')).to.equal(testInputFiles);
    expect(browser.getAttribute(`#${renameTaskComponentName}_${testInputFiles}_receptor`, 'data-name')).to.equal(testInputFiles);
  });
  it("component property 'outputFiles' check", function () {
    // outputFiles test
    browser.click(`.${renameTaskComponentName}_box`)
      .setValue('.newOutputFileNameInputField', testOutputFiles)
      .click('.outputAddDelButton')
      .click('#node_svg')
      .waitForVisible(`#${renameTaskComponentName}_${testOutputFiles}_connector`, 100000);
    expect(browser.getText('#cbMessageArea')).to.equal(testOutputFiles);
    expect(browser.getAttribute(`#${renameTaskComponentName}_${testOutputFiles}_connector`, 'data-name')).to.equal(testOutputFiles);
  });
  it("component property 'remotehost' check", function () {
    // remotehost test
    browser.click(`.${renameTaskComponentName}_box`)
      .selectByIndex('#remotehostSelectField', 1)
      .click('#node_svg');
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(testhost);
    expect(browser.getValue('#remotehostSelectField')).to.equal(testhost);
  });
  it("component property 'useJobScheduler' check", function () {
    // useJobScheduler test
    browser.click(`.${renameTaskComponentName}_box`)
      .click('#useJobSchedulerFlagField')
      .click('#node_svg');
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal('true');
  });
  it("component property 'queue' check", function () {
    // queue test
    browser.click(`.${renameTaskComponentName}_box`)
      .selectByIndex('#queueSelectField', 1)
      .click('#node_svg');
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal('b');
    expect(browser.getValue('#queueSelectField')).to.equal('b');
  });
  it("component property 'clean up flag' check", function () {
    // clean up flag test
    browser.click(`.${renameTaskComponentName}_box`)
      .click('#cleanUpFlag1')
      .click('#node_svg');
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal('1');
    expect(browser.getAttribute('#cleanUpFlag1', 'value')).to.equal('1');
  });
  it("component property 'include' check", function () {
    browser.scroll('#property', 0, 200);
    // include test
    browser.click(`.${renameTaskComponentName}_box`)
      .setValue('#includeInputField', testInclude)
      .click('#node_svg');
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(testInclude);
    expect(browser.getValue('#includeInputField')).to.equal(testInclude);
  });
  it("component property 'exclude' check", function () {
    // exclude test
    browser.click(`.${renameTaskComponentName}_box`)
      .setValue('#excludeInputField', testExclude)
      .click('#node_svg');
    browser.click(`.${renameTaskComponentName}_box`)
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(testExclude);
    expect(browser.getValue('#excludeInputField')).to.equal(testExclude);
  });
  it("component property 'parameter setting file' check", function () {
    // parameter setting file test
    browser.click(`.PS0_box`)
      .setValue('#parameterFileInputField', testParameterSettingFile)
      .click('#node_svg');
    browser.click(`.PS0_box`)
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(testParameterSettingFile);
    expect(browser.getValue('#parameterFileInputField')).to.equal(testParameterSettingFile);
  });
  it("component property 'forceOverwrite' check", function () {
    // forceOverwrite test
    browser.click('.PS0_box')
      .click('#forceOverwriteCheckbox')
      .click('#node_svg');
    browser.click('.PS0_box')
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal('true');
  });
  it("component property 'condition' check", function () {
    // condition test
    browser.click('.if0_box')
      .setValue('#conditionInputField', testCondition)
      .click('#node_svg');
    browser.click('.if0_box')
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(testCondition);
    expect(browser.getValue('#conditionInputField')).to.equal(testCondition);
  });
  it("component property 'start' check", function () {
    // start test
    browser.click('.for0_box')
      .setValue('#startInputField', testStart)
      .click('#node_svg');
    browser.click('.for0_box')
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(testStart);
    expect(browser.getValue('#startInputField')).to.equal(testStart);
  });
  it("component property 'end' check", function () {
    // end test
    browser.click('.for0_box')
      .setValue('#endInputField', testEnd)
      .click('#node_svg');
    browser.click('.for0_box')
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(testEnd);
    expect(browser.getValue('#endInputField')).to.equal(testEnd);
  });
  it("component property 'step' check", function () {
    // step test
    browser.click('.for0_box')
      .setValue('#stepInputField', testStep)
      .click('#node_svg');
    browser.click('.for0_box')
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(testStep);
    expect(browser.getValue('#stepInputField')).to.equal(testStep);
  });
  it("component property 'indexlist' check", function () {
    // indexlist test
    browser.click(`.foreach0_box`)
      .setValue('.newIndexListField', testIndexList)
      .click('.indexListButton')
      .click('#node_svg')
    browser.click('.foreach0_box')
      .waitForVisible('#property');
    expect(browser.getText('#cbMessageArea')).to.equal(testIndexList);
  });
  it("processing order connector check", function () {
    browser.click(`.workflow0_box`)
      .setValue('.newInputFileNameInputField', testInputFiles)
      .click('.inputAddDelButton')
      .click('#node_svg')
      .waitForVisible(`#workflow0_${testInputFiles}_receptor`, 100000);
    expect(browser.getAttribute(`#workflow0_${testInputFiles}_receptor`, 'data-name')).to.equal(testInputFiles);

    browser.dragAndDrop(`#${renameTaskComponentName}_lower`, '#PS0_upper')
      .waitForVisible(`#${renameTaskComponentName}_lower_PS0_upper_cable`, 100000);
  });
  it("file connector check", function () {
    browser.dragAndDrop(`#${renameTaskComponentName}_${testOutputFiles}_connector`, `#workflow0_${testInputFiles}_receptor`)
      .waitForVisible(`#${renameTaskComponentName}_${testOutputFiles}_connector_workflow0_${testInputFiles}_receptor_cable`, 100000);
  });
  it("else connector check", function () {
    browser.dragAndDrop('#if0_else', '#for0_upper')
      .waitForVisible('#if0_else_for0_upper_cable', 100000);
  });
  it("component delete check", function () {
    // component delete
    browser.rightClick('.foreach0_box')
      .click(deleteMenu)
      .waitForExist('.foreach0_box', 100000, true);
  });
});
