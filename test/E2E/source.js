// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("source component test :issue #392, 449, 492", function () {
    const url = '/';
    const targetProjectName = "source";
    const targetComponent = "svg_task0_box";
    const selectData = "dataB";
    // id/class 
    const id_E2ETestDir = "E2ETestDir_data";
    const id_testProjectJson = "prj_wheel_json_data";
    const id_dialog = "dialog"
    const id_pageName = "pageNameLabel";
    const id_prjName = "project_name";
    const id_prjState = "project_state";
    const id_cleanStateButton = "cleanStateButton";
    const id_runButton = "run_button"
    const id_cleanButton = "clean_button"
    // Xpath home screen
    const importMenu = '//*[@id="importButton"]';
    const importDialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
    // Xpath workflow screen
    const dialog = '/html/body/div[2]';
    const dialogSelectBox = '//*[@id="sourceFilename"]';
    const dialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';

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
        $(`#${id_testProjectJson}`).waitForDisplayed();
        $(`#${id_testProjectJson}`).click();
        $(importDialogOKButton).click();    
        $(`#prj_${targetProjectName}`).waitForDisplayed();
        let elem = $(`#prj_${targetProjectName}`).isDisplayed();
        expect(elem).to.be.true;
    });
    it(`project ${targetProjectName} : open`, function () {
        $(`#prj_${targetProjectName}`).doubleClick();
        $(`#${id_prjName}`).waitForDisplayed();
        expect(`#${id_prjName}`).to.have.text(targetProjectName)  
    });
    it("run project", function(){
        $(`#${id_runButton}`).click();
        $(dialog).waitForDisplayed();
        $(dialogSelectBox).selectByVisibleText(selectData);
        $(dialogOkButton).click();
        browser.waitUntil(function(){
            return $(`#${id_prjState}`).getText() === 'finished'
        }, 5000, 'expected text to be different after 5s');
        expect(`#${id_prjState}`).to.have.text("finished");
    });
    it("initialize project", function(){
        $(`#${id_cleanButton}`).click();
        browser.waitUntil(function(){
            return $(`#${id_prjState}`).getText() === 'not-started'
        }, 1000, 'expected text to be different after 1s');
        expect(`#${id_prjState}`).to.have.text("not-started");
    })
});