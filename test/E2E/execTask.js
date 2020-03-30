// setup test framework
const chai = require("chai");
const expect = chai.expect;
const assert = require("assert");
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#task component execute check #issue313, 348", function () {
    const url = '/';
    const targetProjectName = "execTask_test";
    // class/id name
    const id_E2ETestDir = "E2ETestDir_data";
    const id_targetProjectJson = "prj_wheel_json_data";
    const id_dialog = "dialog"
    const id_runButton = "run_button"
    const id_scriptField = "scriptSelectField"
    // Xpath for 'home screen'
    const importMenu = '//*[@id="importButton"]';
    const dialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
    // Xpath for 'workflow screen'
    const errorDialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';

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
        $(`#${id_targetProjectJson}`).waitForDisplayed();
        $(`#${id_targetProjectJson}`).click();
        $(dialogOKButton).click();
        $(`#prj_${targetProjectName}`).waitForExist();
    });
    it(`project ${targetProjectName} : open`, function () {
        $(`#prj_${targetProjectName}`).doubleClick();
        $('#project_name').waitForDisplayed();
        expect('#project_name').to.have.text(targetProjectName)  
    });

    it("run no setting script #issue 313", function () {
        $(`#${id_runButton}`).click();
        $(`#${id_dialog}`).waitForDisplayed();
        $(errorDialogOkButton).click();
        expect('#project_state').to.have.text("not-started");  
    });

    it("setting script", function () {
        $('.svg_task0_box').click();
        $("#property").waitForDisplayed();
        $('#property').scrollIntoView(0, 500);
        $("#test___sh_data").waitForDisplayed();
        $("#test___sh_data").doubleClick();
        $("#dirBackButton").waitForDisplayed();
        $(`#${id_scriptField}`).selectByVisibleText("test_1.sh");
        let elem = $(`#${id_scriptField}`).getValue();
        assert.equal(elem, "test_1.sh");
    });

    it("script check #issue 348", function () {
        $('#node_svg').click();;
        $('.svg_task0_box').click();
        $("#property").waitForDisplayed();
        $('#property').scrollIntoView(0, 500);
        $("#test___sh_data").waitForDisplayed();
        let elem = $(`#${id_scriptField}`).getValue();
        assert.equal(elem, "test_1.sh");
    });
});