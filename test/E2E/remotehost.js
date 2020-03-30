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
        const title = browser.getTitle();
        console.log(title)
        // expect(title).to.have.value("<WHEEL home>");
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
    it("copy remotehost", function () {
        // copy remotehost
        $(`#${labelName}`).click()
        $("#copyButton").click()
        $(".dialogStateError").waitForExist();
    });
    it("delete remotehost", function () {
        // delete remotehost
        $("#deleteButton").click()
        $("#dialog").waitForDisplayed(5000)
        const okBtn = $('/html/body/div[4]/div[3]/div/button[2]')
        $(okBtn).click()
        $(".dialogStateError").waitForExist(10000, true);
    });
    it("return to home screen", function () {
    $('#title').click()
        expect('#pageNameLabel').to.have.text("Home");
    });
});