// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#pause test :issue #296, 358, 361, 409", function () {
    const url = '/';
    const targetProjectName = "pause";
    const SSHConnectionPW = "hoge";
    // id name 
    const id_E2ETestDir = "E2ETestDir_data";
    const id_testProjectJson = "prj_wheel_json_data";
    const id_dialog = "dialog";
    const id_title ="title";
    const id_prjName = "projectName";
    const id_prjState = "projectState";
    const id_drawerButton = "drawerButton";
    const id_runButton = "run_button";
    const id_pauseButton = "pause_button";
    const id_cleanButton = "clean_button";
    const id_password = "password";
    const id_remotehostButton = "remotehostEditorButton";
    // Xpath home screen
    const importMenu = '//*[@id="importButton"]';
    const importDialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
    // Xpath workflow screen
    const dialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';
    // remotehost screen param
    const labelName = "pbs";
    const hostName = "localhost";
    const port = 4000;
    const userID = "pbsuser";
    const workDir = '/home/pbsuser/';
    const id_pageName = "pageNameLabel";
    const id_hostLabel = "hostLabelInputArea";
    const id_hostName = "hostNameInputArea";
    const id_port = "hostPortInputArea";
    const id_userId = "hostUserIDInputArea";
    const id_workDir = "hostWorkDirInputArea";
    const id_pw = "hostPasswordInputArea";
    const id_confirmButton = "confirmButton";
    const id_deleteButton = "deleteButton";
    const cleanCheckDialog = '/html/body/div[2]';
    const cleanCheckDialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';
    const drawerRemotehost = '//*[@id="drawerMenuList"]/li[1]/a';
    const okBtn = '/html/body/div[4]/div[3]/div/button[2]';
    const hostlist = '//*[@id="pageNameArea"]';

    it("Home screen is drawn", function () {
        browser.url(url);
        browser.setWindowSize(1920, 1080);
        expect(browser.getTitle()).to.equal("WHEEL home");
        expect(`#${id_pageName}`).to.have.text("Home");
    });
    it("move to remotehost screen", function () {
        $(`#${id_drawerButton}`).click();
        $(drawerRemotehost).waitForDisplayed();
        browser.pause(1000);
        $(drawerRemotehost).click();
        $(hostlist).waitForDisplayed(); 
        browser.newWindow('WHEEL host');
        $(`#${id_hostLabel}`).waitForDisplayed();
        let elem = $(`#${id_hostLabel}`).isDisplayed();
        expect(elem).to.be.true;
    });
    it("add remotehost", function () {
        $(`#${id_hostLabel}`).setValue(labelName)
        $(`#${id_hostName}`).setValue(hostName)
        $(`#${id_userId}`).setValue(userID)
        $(`#${id_port}`).click()
        browser.keys('Backspace')
        browser.keys('Backspace')
        $(`#${id_port}`).setValue(port)
        $(`#${id_workDir}`).setValue(workDir)
        $(`#${id_pw}`).click();
        $(`#${id_confirmButton}`).click();
        $(`#${labelName}`).waitForDisplayed(5000);
        let elem = $(`#${labelName}`).isDisplayed();
        expect(elem).to.be.true;
    });
    it("return to home screen", function () {
        $(`#${id_title}`).click()
        browser.pause(1000);
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
        $(`#${id_dialog}`).waitForDisplayed();
        $(`#${id_password}`).setValue(`${SSHConnectionPW}`)
        $(dialogOkButton).click();
        browser.waitUntil(function(){
            return $(`#${id_prjState}`).getText() === 'running'
        }, 1000, 'expected text to be different after 1s');
        expect(`#${id_prjState}`).to.have.text("running");
    })
    it("pause project", function(){
        $(`#${id_pauseButton}`).click();
        browser.waitUntil(function(){
            return $(`#${id_prjState}`).getText() === 'paused'
        }, 1000, 'expected text to be different after 1s');
        expect(`#${id_prjState}`).to.have.text("paused");
    })
    it("rerun project", function(){
        $(`#${id_runButton}`).click();
        $(`#${id_dialog}`).waitForDisplayed();
        $(`#${id_password}`).setValue(`${SSHConnectionPW}`)
        $(dialogOkButton).click();
        browser.waitUntil(function(){
            return $(`#${id_prjState}`).getText() === 'finished'
        }, 30000, 'expected text to be different after 30s');
        expect(`#${id_prjState}`).to.have.text("finished");
    })
    it("clean project", function(){
        $(`#${id_cleanButton}`).click();
        $(cleanCheckDialog).waitForDisplayed();
        $(cleanCheckDialogOkButton).click();
        browser.waitUntil(function(){
            return $(`#${id_prjState}`).getText() === 'not-started'
        }, 1000, 'expected text to be different after 1s');
        expect(`#${id_prjState}`).to.have.text("not-started");
    })
    it("move to remotehost screen", function () {
        $(`#${id_drawerButton}`).click();
        $(`#${id_remotehostButton}`).waitForDisplayed();
        expect(`#${id_remotehostButton}`).to.exist;
        browser.pause(1000);
        $(`#${id_remotehostButton}`).click();
        browser.pause(1000);
        browser.newWindow('WHEEL host');
        $(`#${id_hostLabel}`).waitForDisplayed();
        let elem = $(`#${id_hostLabel}`).isDisplayed();
        expect(elem).to.be.true;
    });
    it("delete remotehost", function () {
        $(`#${labelName}`).click();
        browser.waitUntil(function(){
            return $(`#${id_hostLabel}`).getValue() === `${labelName}`
        }, 5000, 'expected text to be different after 5s');
        $(`#${id_deleteButton}`).click();
        $(`#${id_dialog}`).waitForDisplayed();
        $(okBtn).click();
        $(`#${labelName}`).waitForExist(10000,true);
        let elem = $(`#${labelName}`).isDisplayed();
        expect(elem).to.not.be.true;
    });
});