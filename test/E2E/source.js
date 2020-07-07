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
    const connectTargetFile = "task0_dataB_receptor";
    const connectTargetDir = "task0_data_receptor";
    const connectSrc1 = "source2_dataC_connector";
    const connectSrc2 = "source3_dataD_connector";
    const cable1 = `${connectSrc1}_${connectTargetDir}_cable`;
    const cable2 = `${connectSrc2}_${connectTargetDir}_cable`;

    // id/class 
    const id_E2ETestDir = "E2ETestDir_data";
    const id_testProjectJson = "prj_wheel_json_data";
    const id_dialog = "dialog"
    const id_pageName = "pageNameLabel";
    const id_prjName = "projectName";
    const id_prjState = "projectState";
    const id_runButton = "run_button"
    const id_cleanButton = "clean_button"
    // Xpath home screen
    const importMenu = '//*[@id="importButton"]';
    const importDialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
    // Xpath workflow screen
    const dialog = '/html/body/div[2]';
    const dialogSelectBox = '//*[@id="sourceFilename"]';
    const errDialog = '/html/body/div[2]';
    const errDialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';
    const dialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';
    const cleanCheckDialog = '/html/body/div[2]';
    const cleanCheckDialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';

    it("Home screen is drawn", function () {
        browser.url(url);
        browser.setWindowSize(1400, 1080);
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
    it("connect check 'file'", function(){
        const target = $(`#${connectTargetFile}`);
        $(`#${connectSrc1}`).dragAndDrop(target);
        $(errDialog).waitForDisplayed();
        let elem = $(errDialog).isDisplayed();
        expect(elem).to.be.true;
        $(errDialogOkButton).click();
    });
    it("connect check 'dir'", function(){
        const target = $(`#${connectTargetDir}`);
        $(`#${connectSrc1}`).dragAndDrop(target);
        $(`#${connectSrc2}`).dragAndDrop(target);
        $(`#${cable1}`).waitForDisplayed();
        $(`#${cable2}`).waitForDisplayed();
        let elem1 = $(`#${cable1}`).isDisplayed();
        let elem2 = $(`#${cable2}`).isDisplayed();
        expect(elem1).to.be.true;
        expect(elem2).to.be.true;
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
        $(".v-card__title=unsaved files").waitForDisplayed();
        $(".v-btn__content=discard all changes").click();
        browser.waitUntil(function(){
            return $(`#${id_prjState}`).getText() === 'not-started'
        }, 1000, 'expected text to be different after 1s');
        expect(`#${id_prjState}`).to.have.text("not-started");
    });
});
