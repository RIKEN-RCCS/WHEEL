// setup test framework
const chai = require("chai");
const expect = chai.expect;
const assert = require("assert");
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#state clean button check #issue288", function () {
    const url = '/';
    const targetProjectName = "stateCleanButton";
    const dialogMessage = "Are you sure to clean this state?"
    // class/id name 
    const id_E2ETestDir = "E2ETestDir_data";
    const id_testProjectJson = "prj_wheel_json_data";
    const id_dialog = "dialog"
    const class_dialogMessage = "dialogMessage"
    // Xpath for `home screen`
    const importMenu = '//*[@id="importButton"]';
    const importDialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
    // Xpath for 'workflow screen'
    const dialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';
    const dialogCancelButton = '/html/body/div[2]/div[3]/div/button[1]';

    it("Home screen is drawn", function () {
        browser.url(url);
        browser.setWindowSize(1920, 1080);
        expect(browser.getTitle()).to.equal("WHEEL home");
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
        $(`#prj_${targetProjectName}`, 10000, false).waitForExist();
    });
    it(`project ${targetProjectName} : open`, function () {
        $(`#prj_${targetProjectName}`).doubleClick();
        $('#project_name').waitForDisplayed();
        expect('#project_state').to.have.text('finished')
    });
    it("open task component property", function(){
        $('.svg_workflow0_box').doubleClick();
        $('.svg_task0_box').waitForDisplayed();
        $('.svg_task0_box').click();
        $('#cleanStateButton').waitForDisplayed();
    })
    it("state clean button click", function(){
        $('#cleanStateButton').click();
        $(`#${id_dialog}`).waitForDisplayed();
        expect(`.${class_dialogMessage}`).to.have.text(dialogMessage);
        $(dialogOkButton).click();
        $('#cleanStateButton').waitForExist({ reverce: true });
        expect('#project_state').to.have.text('finished')
    })
});