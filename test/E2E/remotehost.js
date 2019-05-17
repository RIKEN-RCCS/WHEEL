// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#remotehost screen", function () {
    const url = '/';
    //Xpath
    const drawerRemotehost = '//*[@id="drawerMenuList"]/li[1]/a';
    const hostlist = '//*[@id="pageNameArea"]';
    const labelArea = 'hostLabelInputArea';
    const hostNameArea = 'hostNameInputArea';
    const userIDArea = 'hostUserIDInputArea';
    const workDirArea = 'hostWorkDirInputArea';
    const queueArea = 'hostQueueInputArea';
    const confirmButton = 'confirmButton';
    const okBtn = '/html/body/div[4]/div[3]/div/button[2]';
    const labelName = 'testHost';
    const hostName = 'testHostName';
    const userID = "testUserID";
    const workDir = "testWorkDir";
    const queue = "a,b,c";

    it("Home screen is drawn", function () {
        browser.url(url);
        browser.windowHandleSize({ width: 1920, height: 1080 });
        expect(browser.getTitle()).to.equal("WHEEL home");
        expect('#pageNameLabel').to.have.text("Home");
    });
    it("move to remotehost screen", function () {
        // open right drawer.
        browser.click("#drawerButton")
            .waitForVisible(drawerRemotehost);
        browser.click("#remotehostButton")
            .waitForVisible(hostlist);

        browser.newWindow('WHEEL host');
    });
    it("add remotehost", function () {
        // add remotehost
        browser.click("#newButton")
            .setValue(`#${labelArea}`, labelName)
            .setValue(`#${hostNameArea}`, hostName)
            .setValue(`#${userIDArea}`, userID)
            .setValue(`#${workDirArea}`, workDir)
            .setValue(`#${queueArea}`, queue);
        browser.click(`#${confirmButton}`)
            .waitForVisible(`#${labelName}`);
    });
    it("copy remotehost", function () {
        // copy remotehost
        browser.click(`#${labelName}`)
            .click("#copyButton")
            .waitForExist(".dialogStateError");
    });
    it("delete remotehost", function () {
        // delete remotehost
        browser.click("#deleteButton")
            .waitForVisible("#dialog");
        browser.click(okBtn)
            .waitForExist(".dialogStateError", 10000, true);
    });
    it("return to home screen", function () {
        browser.click('#title')
        expect('#pageNameLabel').to.have.text("Home");
    });
});