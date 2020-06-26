// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("script field test :#issue313, 348", function () {
    const url = '/';
    const targetProjectName = "script";
    const targetComponent0 = "svg_task0_box";
    const defaultScriptName = "test.sh";
    const testScriptName = "test_1.sh";
    const defaultScriptFile = "test_sh_data";
    const testScriptFiles = "test___sh_data";
    // id/class
    const id_E2ETestDir = "E2ETestDir_data";
    const id_targetProjectJson = "prj_wheel_json_data";
    const id_pageName = "pageNameLabel";
    const id_dialog = "dialog";
    const id_prjName = "projectName";
    const id_prjState = "projectState";
    const id_nodeSvg = "node_svg";
    const id_property = "property";
    const id_runButton = "run_button";
    const id_disableInputField = "disableInputField";
    const id_scriptField = "scriptSelectField";
    const id_dirBackButton = "dirBackButton";
    // Xpath home screen
    const importMenu = '//*[@id="importButton"]';
    const dialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
    // Xpath workflow screen
    const errorDialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';

    it("Home screen is drawn", function () {
        browser.url(url);
        browser.setWindowSize(1920, 1080);
        expect(browser.getTitle()).to.equal("WHEEL home");
        expect(`#${id_pageName}`).to.have.text("Home");
    });
    it(`project ${targetProjectName} : import`, function () {
        $(importMenu).click();
        $(`#${id_E2ETestDir}`).waitForDisplayed();
        $(`#${id_E2ETestDir}`).doubleClick();
        $(`#${targetProjectName}_wheel_data`).waitForDisplayed();
        $(`#${targetProjectName}_wheel_data`).doubleClick();
        $(`#${id_targetProjectJson}`).waitForDisplayed();
        $(`#${id_targetProjectJson}`).click();
        $(dialogOKButton).click();
        $(`#prj_${targetProjectName}`).waitForDisplayed();
        let elem = $(`#prj_${targetProjectName}`).isDisplayed();
        expect(elem).to.be.true;
    });
    it(`project ${targetProjectName} : open`, function () {
        $(`#prj_${targetProjectName}`).doubleClick();
        $(`#${id_prjName}`).waitForDisplayed();
        expect(`#${id_prjName}`).to.have.text(targetProjectName)  
    });
    it("run project without script #issue 313", function () {
        $(`#${id_runButton}`).click();
        $(`#${id_dialog}`).waitForDisplayed();
        $(errorDialogOkButton).click();
        expect(`#${id_prjState}`).to.have.text("not-started");  
    });
    it("set script", function () {
        $(`.${targetComponent0}`).click();
        $(`#${id_property}`).waitForDisplayed();
        $(`#${id_disableInputField}`).click();
        $(`#${id_property}`).scrollIntoView(0, 500);
        $(`#${testScriptFiles}`).waitForDisplayed();
        $(`#${testScriptFiles}`).doubleClick();
        $(`#${id_dirBackButton}`).waitForDisplayed();
        $(`#${id_scriptField}`).selectByVisibleText(testScriptName);
        let elem = $(`#${id_scriptField}`).getValue();
        expect(elem).to.equal(testScriptName);
    });
    it("script check #issue 348", function () {
        $(`#${id_nodeSvg}`).click();;
        $(`.${targetComponent0}`).click();
        $(`#${id_property}`).waitForDisplayed();
        let elem = $(`#${id_scriptField}`).getValue();
        expect(elem).to.equal(testScriptName);
    });
    it("initialize project", function () {
        $(`#${id_nodeSvg}`).click();
        $(`.${targetComponent0}`).click();
        $(`#${id_property}`).waitForDisplayed();
        $(`#${id_property}`).scrollIntoView(0, 500);
        $(`#${defaultScriptFile}`).waitForDisplayed();
        $(`#${id_scriptField}`).selectByVisibleText(defaultScriptName);
        $(`#${id_disableInputField}`).click();
    });
});