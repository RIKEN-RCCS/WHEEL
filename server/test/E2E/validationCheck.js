// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#validation Check", function () {
    const url = '/';
    const targetProjectName = "validationCheck";
    const tartgetComponent = "svg_task0_box";
    const inputRename = "=";
    const outputRename = "=";
    // id/class 
    const id_E2ETestDir = "E2ETestDir_data";
    const id_testProjectJson = "prj_wheel_json_data";
    const id_dialog = "dialog";
    const id_pageName = "pageNameLabel";
    const id_prjName = "projectName";
    const id_property = "property";
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
        expect(`#${id_prjName}`).to.have.text(targetProjectName)
    });
    it("open task component property", function(){
        $(`.${tartgetComponent}`).click();
        $(`#${id_property}`).waitForDisplayed();
        let elem = $(`#${id_property}`).isDisplayed();
        expect(elem).to.be.true;
    })
    it("rename input file bad example", function(){
        $('.newInputFileNameInputField').setValue(inputRename);
        browser.keys('Tab')        
        $(`#${id_dialog}`).waitForDisplayed();
        $(dialogOkButton).click();
        $(`#${id_dialog}`).waitForDisplayed(10000,true);
        let elem = $(`#${id_dialog}`).isDisplayed();
        expect(elem).to.not.be.true;
    })
    it("rename output fille bad example", function(){
        $('.newOutputFileNameInputField').setValue(outputRename);
        browser.keys('Tab')    
        $(`#${id_dialog}`).waitForDisplayed();
        $(dialogOkButton).click();
        $(`#${id_dialog}`).waitForDisplayed(10000,true);
        let elem = $(`#${id_dialog}`).isDisplayed();
        expect(elem).to.not.be.true;
    })
});