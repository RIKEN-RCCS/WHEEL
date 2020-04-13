// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#validation Check", function () {
    const url = '/';
    const targetProjectName = "validationCheck";
    const inputRename = "="
    const outputRename = "="
    // class/id name 
    const id_E2ETestDir = "E2ETestDir_data";
    const id_testProjectJson = "prj_wheel_json_data";
    const id_dialog = "dialog"
    // Xpath for `home screen`
    const importMenu = '//*[@id="importButton"]';
    const importDialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
    // Xpath for 'workflow screen'
    const dialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';
    const x_inputField = '/html/body/div/div/div[3]/div[4]/div[1]/div/div[9]/input'
    const x_outputField = '/html/body/div/div/div[3]/div[4]/div[1]/div/div[12]/input'
    
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
        $(`#prj_${targetProjectName}`).waitForExist();
    });
    it(`project ${targetProjectName} : open`, function () {
        $(`#prj_${targetProjectName}`).doubleClick();
        $('#project_name').waitForDisplayed();
        expect('#project_name').to.have.text(targetProjectName)
    });
    it("open task component property", function(){
        $('.svg_task0_box').click();
        $('#property').waitForDisplayed();
    })
    it("rename input file bad example", function(){
        $(x_inputField).setValue(inputRename);
        browser.keys('Tab')        
        $(`#${id_dialog}`).waitForDisplayed();
        $(dialogOkButton).click();
        $(`#${id_dialog}`, true).waitForExist();
    })
    it("rename output fille bad example", function(){
        $(x_outputField).setValue(outputRename);
        browser.keys('Tab')    
        $(`#${id_dialog}`).waitForDisplayed();
        $(dialogOkButton).click();
        $(`#${id_dialog}`, true).waitForExist();
    })
});