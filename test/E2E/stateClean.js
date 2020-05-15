// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#state clean test :issue #288", function () {
    const url = '/';
    const targetProjectName = "stateClean";
    const targetComponent = "svg_task0_box";
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
        expect(`#${id_prjState}`).to.have.text("finished");
    });
    it("open task component property", function(){
        $(`.${targetComponent}`).click();
        $(`#${id_cleanStateButton}`).waitForDisplayed();
        let elem = $(`#${id_cleanStateButton}`).isDisplayed();
        expect(elem).to.be.true;
    })
    it("state clean button click", function(){
        $(`#${id_cleanStateButton}`).click();
        $(`#${id_dialog}`).waitForDisplayed();
        $(dialogOkButton).click();
        $(`#${id_cleanStateButton}`).waitForDisplayed(5000,true);
        let elem = $(`#${id_cleanStateButton}`).isDisplayed();
        expect(elem).to.not.be.true;
    })
    it("initialize project", function(){
        $(`#${id_cleanButton}`).click();
        browser.waitUntil(function(){
            return $(`#${id_prjState}`).getText() === 'not-started'
        }, 1000, 'expected text to be different after 1s');
        expect(`#${id_prjState}`).to.have.text("not-started");
        $(`#${id_runButton}`).click();
        browser.waitUntil(function(){
            return $(`#${id_prjState}`).getText() === 'finished'
        }, 5000, 'expected text to be different after 5s');
        expect(`#${id_prjState}`).to.have.text("finished");
    })
});