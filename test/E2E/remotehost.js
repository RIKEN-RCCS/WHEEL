// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#home", function () {
    const url = '/';
    const labelName = 'testhost';
    const hostName = 'testname';
    const userID = "testID";
    const workDir = "testDir";
    const queue = "a,b,c";

    it("Home screen is drawn", function () {
        browser.url(url);
        browser.windowHandleSize({ width: 1200, height: 1200 });
        expect(browser.getTitle()).to.equal("WHEEL home");
        expect('#pageNameLabel').to.have.text("Home");
    });
    it("remotehost check test", function () {
        //Xpath
        const drawerRemotehost = '//*[@id="drawerMenuList"]/li[1]/a';
        const hostlist = '//*[@id="pageNameArea"]';
        const labelArea = '//*[@id="leftFormArea"]/div[1]/input';
        const hostNameArea = '//*[@id="leftFormArea"]/div[3]/input';
        const userIDArea = '//*[@id="leftFormArea"]/div[5]/input';
        const workDirArea = '//*[@id="leftFormArea"]/div[6]/input';
        const queueArea = '//*[@id="centerFormArea"]/div[5]/input';
        const confirmButton = '//*[@id="confirmButton"]';
        const homePath = '//*[@id="title"]';

        // remotehost画面を開く(新規タブ)
        browser.click("#drawerButton")
            .waitForVisible(drawerRemotehost);
        browser.click("#remotehostButton")
            .waitForVisible(hostlist);

        // remotehost画面に遷移
        browser.newWindow('WHEEL host');

        // remotehost画面　登録
        browser.setValue(labelArea, labelName)
            .setValue(hostNameArea, hostName)
            .setValue(userIDArea, userID)
            .setValue(workDirArea, workDir)
            .setValue(queueArea, queue);

        browser.click(confirmButton)
            .waitForVisible(`#${labelName}`);

        // home画面に遷移
        browser.click(homePath);
        expect('#pageNameLabel').to.have.text("Home");
    });
});