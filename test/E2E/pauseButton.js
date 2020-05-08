// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#pause button check #issue358,(296, 361, 409)", function () {
    const url = '/';
    const targetProjectName = "pauseButton";
    const dialogMessage = "Enter password/phrase to connect pbs"
    const SSHConnectionPW = "hoge";
    // class/id name 
    const id_E2ETestDir = "E2ETestDir_data";
    const id_testProjectJson = "prj_wheel_json_data";
    const id_dialog = "dialog"
    const class_dialogMessage = "dialogMessage"
    const id_runButton = "run_button"
    const id_pauseButton = "pause_button"
    const id_password = "password"
    const id_remotehostButton = "remotehostButton"
    // Xpath for `home screen`
    const importMenu = '//*[@id="importButton"]';
    const importDialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
    // Xpath for 'workflow screen'
    const dialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';
    // ↓ for remotehost screen
    const labelName = 'pbs';
    const hostName = 'localhost';
    const port = 4000;
    const userID = "pbsuser";
    const workDir = "/home/pbsuser/";
    // id/class name
    const labelAreaId = 'hostLabelInputArea';
    const hostNameAreaId = 'hostNameInputArea';
    const portAreaId = 'hostPortInputArea';
    const userIDAreaId = 'hostUserIDInputArea';
    const workDirAreaId = 'hostWorkDirInputArea';
    const PWButtonId = 'hostPasswordInputArea';
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
        $(`#prj_${targetProjectName}`).waitForExist();
    });
    it(`project ${targetProjectName} : open`, function () {
        $(`#prj_${targetProjectName}`).doubleClick();
        $('#project_name').waitForDisplayed();
        expect('#project_name').to.have.text(targetProjectName)
    });
    it("run project", function(){
        $(`#${id_runButton}`).click();
        $(`#${id_dialog}`).waitForDisplayed();
        // expect(`.${class_dialogMessage}`).to.have.text(dialogMessage);
        $(`#${id_password}`).setValue(`${SSHConnectionPW}`)
        $(dialogOkButton).click();
        browser.waitUntil(function(){
            return $('#project_state').getText() === 'running'
        }, 1000, 'expected text to be different after 1s');
    })
    it("pause button click", function(){
        $(`#${id_pauseButton}`).click();
        browser.waitUntil(function(){
            return $('#project_state').getText() === 'paused'
        }, 5000, 'expected text to be different after 1s');
    })
    it("rerun project", function(){
        $(`#${id_runButton}`).click();
        $(`#${id_dialog}`).waitForDisplayed();
        // expect(`.${class_dialogMessage}`).to.have.text(dialogMessage);
        $(`#${id_password}`).setValue(`${SSHConnectionPW}`)
        $(dialogOkButton).click();
        browser.waitUntil(function(){
            return $('#project_state').getText() === 'finished'
        }, 5000, 'expected text to be different after 5s');
    })
    it("move to remotehost screen", function () {
        // open right drawer.
        $('#drawer_button').click();
        $(`#${id_remotehostButton}`).waitForDisplayed();
        expect(`#${id_remotehostButton}`).to.exist;
        // $('#remotehostButton').click();
        const CLICK =  $(`#${id_remotehostButton}`).isClickable();
        console.log(CLICK)
        browser.pause(1000);
        $(`#${id_remotehostButton}`).click();
        // $(hostlist).waitForDisplayed(); 
        browser.pause(1000);
        browser.newWindow('WHEEL host');
        // $('#propertyTable').waitForDisplayed(); 
        $(`#${labelAreaId}`).waitForDisplayed();
        expect(`#${labelAreaId}`).to.exist;
    });
    it("delete remotehost", function () {
        // delete remotehost
        $(`#${labelName}`).click();
        browser.waitUntil(function(){
            return $(`#${labelAreaId}`).getValue() === `${labelName}`
        }, 5000, 'expected text to be different after 5s');
        $("#deleteButton").click()
        $("#dialog").waitForDisplayed(5000)
        const okBtn = $('/html/body/div[4]/div[3]/div/button[2]')
        $(okBtn).click()
        $(".decoupleError").waitForExist(10000, true);
    });
});