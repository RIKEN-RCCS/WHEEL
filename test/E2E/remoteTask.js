// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#remote task component execute check", function () {
    const url = '/';
    const targetProjectName = "remoteTask_test";
    const SSHConnectionPW = "hoge";
    const testFileName = "test___txt_data";
    // class/id name 
    const id_E2ETestDir = "E2ETestDir_data";
    const id_testProjectJson = "prj_wheel_json_data";
    const id_dialog = "dialog"
    const id_runButton = "run_button"
    const id_password = "password"
    const id_cleanButton = "clean_button"
    const id_remotehostButton = "remotehostButton"
    // Xpath for 'home screen'
    const importMenu = '//*[@id="importButton"]';
    const importDialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
    // Xpath for 'workflow screen'
    const dialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';
    const dialogCancelButton = '/html/body/div[2]/div[3]/div/button[1]';
    // for remotehost screen
    const labelName = 'pbs';
    const hostName = 'localhost';
    const port = 4000;
    const userID = "pbsuser";
    const workDir = "/home/pbsuser/";
    const id_pageName = 'pageNameLabel';
    const id_hostLabel = 'hostLabelInputArea';
    const id_hostName = 'hostNameInputArea';
    const id_port = 'hostPortInputArea';
    const userIDAreaId = 'hostUserIDInputArea';
    const id_workDir = 'hostWorkDirInputArea';
    const id_pw = 'hostPasswordInputArea';
    const id_confirmButton = 'confirmButton';
    const id_deleteButton = 'deleteButton';
    const class_decoupleError = 'decoupleError';
    //Xpath
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
        $('#drawerButton').click();
        $(drawerRemotehost).waitForDisplayed();
        expect(drawerRemotehost).to.exist;
        const CLICK =  $(`${drawerRemotehost}`).isClickable();
        console.log(CLICK)
        browser.pause(1000);
        $(`${drawerRemotehost}`).click();
        $(hostlist).waitForDisplayed(); 
        browser.newWindow('WHEEL host');
        $(`#${id_hostLabel}`).waitForDisplayed();
        expect(`#${id_hostLabel}`).to.exist;
    });
    it("add remotehost", function () {
        $(`#${id_hostLabel}`).setValue(labelName)
        $(`#${id_hostName}`).setValue(hostName)
        $(`#${userIDAreaId}`).setValue(userID)
        $(`#${id_port}`).click()
        browser.keys('Backspace')
        browser.keys('Backspace')
        $(`#${id_port}`).setValue(port)
        $(`#${id_workDir}`).setValue(workDir)
        $(`#${id_pw}`).click();
        $(`#${id_confirmButton}`).click();
        $(`#${labelName}`).waitForDisplayed(5000);
        expect(`#${labelName}`).to.exist;
    });
    it("return to home screen", function () {
        $('#title').click()
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
        $(`#prj_${targetProjectName}`, 10000, false).waitForExist();
        expect(`#prj_${targetProjectName}`).to.exist;
    });
    it(`project ${targetProjectName} : open`, function () {
        $(`#prj_${targetProjectName}`).doubleClick();
        $('#project_name').waitForDisplayed();
        expect('#project_name').to.exist;
    });
    it("SSH connection dialog check #issue329", function(){
        $(`#${id_runButton}`).click();
        $(`#${id_dialog}`).waitForDisplayed();
        expect('#project_state').to.have.text("prepareing");  
        $(dialogCancelButton).click();
        $(`#${id_dialog}`, true).waitForExist();
        expect('#project_state').to.have.text("not-started");
    })
    it("run remoteTask #issue314", function(){
        $(`#${id_runButton}`).click();
        $(`#${id_dialog}`).waitForDisplayed();
        $(`#${id_password}`).setValue(SSHConnectionPW);
        $(dialogOkButton).click();
        browser.waitUntil(function(){
            return $('#project_state').getText() === 'running'
        }, 1000, 'expected text to be different after 1s');
        browser.waitUntil(function(){
            return $('#project_state').getText() === 'finished'
        }, 5000, 'expected text to be different after 5s');
        expect('#project_state').to.have.text("finished");  
    })
    it("Files area check #issue275", function(){
        $('.svg_remoteTask_box').click();
        $('#property').waitForDisplayed();
        $('#property').scrollIntoView(0, 500);
        $(`#${testFileName}`).waitForDisplayed();
        expect('#project_name').to.exist;
    })
    it("rerun project check #issue286, 312", function(){
        $(`#${id_cleanButton}`).click();
        // $(`#${id_dialog}`).waitForDisplayed();   // dev2019から実装される機能
        // $(dialogOkButton).click();
        browser.waitUntil(function(){
            return $('#project_state').getText() === 'not-started'
        }, 5000, 'expected text to be different after 5s');
        $(`#${id_runButton}`).click();
        $(`#${id_dialog}`).waitForDisplayed();
        $(dialogCancelButton).click();
        expect('#project_state').to.have.text("not-started");  
    })
    it("move to remotehost screen", function () {
        $('#drawer_button').click();
        $(`#${id_remotehostButton}`).waitForDisplayed();
        expect(`#${id_remotehostButton}`).to.exist;
        const CLICK =  $(`#${id_remotehostButton}`).isClickable();
        console.log(CLICK)
        browser.pause(1000);
        $(`#${id_remotehostButton}`).click();
        browser.pause(1000);
        browser.newWindow('WHEEL host');
        $(`#${id_hostLabel}`).waitForDisplayed();
        expect(`#${id_hostLabel}`).to.exist;
    });
    it("delete remotehost", function () {
        $(`#${labelName}`).click();
        browser.waitUntil(function(){
            return $(`#${id_hostLabel}`).getValue() === `${labelName}`
        }, 5000, 'expected text to be different after 5s');
        $(`#${id_deleteButton}`).click();
        $("#dialog").waitForDisplayed();
        $(okBtn).click();
        $(`#${labelName}`).waitForExist(10000,true);
    });
});