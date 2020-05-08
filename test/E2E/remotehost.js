// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#remotehost screen", function () {
    const url = '/';
    const hostName = 'localhost';
    const port = 4000;
    const labelName = 'pbs';
    const userID = "pbsuser";
    const workDir = "/home/pbsuser/";
    // id/class name
    const id_pageName = 'pageNameLabel';
    const id_hostLabel = 'hostLabelInputArea';
    const id_hostName = 'hostNameInputArea';
    const id_port = 'hostPortInputArea';
    const id_userId = 'hostUserIDInputArea';
    const id_workDir = 'hostWorkDirInputArea';
    const id_pw = 'hostPasswordInputArea';
    const id_confirmButton = 'confirmButton';
    const id_copyButton = 'copyButton';
    const id_deleteButton = 'deleteButton';
    const class_decoupleError = 'decoupleError';
    // Xpath
    const drawerRemotehost = '//*[@id="drawerMenuList"]/li[1]/a';
    const okBtn = '/html/body/div[4]/div[3]/div/button[2]';
    const hostlist = '//*[@id="pageNameArea"]';

    it("Home screen is drawn", function () {
        browser.url(url);
        browser.setWindowSize(1920, 1080);
        const title = browser.getTitle();
        console.log(title)
        expect(`#${id_pageName}`).to.have.text("Home");
    }); 
    it("move to remotehost screen", function () {
        $('#drawerButton').click();
        $(drawerRemotehost).waitForDisplayed();
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
        $(`#${id_userId}`).setValue(userID)
        $(`#${id_port}`).click()
        browser.keys('Backspace')
        browser.keys('Backspace')
        $(`#${id_port}`).setValue(port)
        $(`#${id_workDir}`).setValue(workDir)
        $(`#${id_pw}`).click();
        $(`#${id_confirmButton}`).click()
        $(`#${labelName}`).waitForDisplayed(5000)
        expect(`#${labelName}`).to.exist;
    });
    it("copy remotehost", function () {
        $(`#${labelName}`).click()
        $(`#${id_copyButton}`).click()
        $(`.${class_decoupleError}`).waitForExist();
        expect(`.${class_decoupleError}`).to.have.text("duplicated label");
    });
    it("delete remotehost", function () {
        $(`#${id_deleteButton}`).click()
        $("#dialog").waitForDisplayed(5000)
        $(okBtn).click()
        $(`.${class_decoupleError}`).waitForExist(10000, true);
        expect(`.${class_decoupleError}`).to.not.have.text("duplicated label");
    });
    it("return to home screen", function () {
        $('#title').click()
        expect(`#${id_pageName}`).to.have.text("Home");
    });
});