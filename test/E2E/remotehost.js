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
    const labelArea = '//*[@id="leftFormArea"]/div[1]/input';
    const hostNameArea = '//*[@id="leftFormArea"]/div[3]/input';
    const userIDArea = '//*[@id="leftFormArea"]/div[5]/input';
    const workDirArea = '//*[@id="leftFormArea"]/div[6]/input';
    const queueArea = '//*[@id="centerFormArea"]/div[5]/input';
    const confirmButton = '//*[@id="confirmButton"]';
    const okBtn = '//*[@id="dialogOkButton"]';
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
            .setValue(labelArea, labelName)
            .setValue(hostNameArea, hostName)
            .setValue(userIDArea, userID)
            .setValue(workDirArea, workDir)
            .setValue(queueArea, queue);
        browser.click(confirmButton)
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
            .waitForVisible("#deleteCheckDialog");
        browser.click(okBtn)
            .waitForExist(".dialogStateError", 10000, true);
    });
    it("return to home screen", function () {
        browser.click('#title')
        expect('#pageNameLabel').to.have.text("Home");
    });
});