// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("remotehost SecretKey Check #issue 241 259 : ", function () {
    const url = '/';
    //Xpath
    const drawerRemotehost = '//*[@id="drawerMenuList"]/li[1]/a';
    const hostlist = '//*[@id="pageNameArea"]';
    const dialogOKButton = '/html/body/div[4]/div[3]/div/button[2]';
    const E2ETestDir = "E2ETestDir_data";
    const keyfile = 'keyfile_txt_data';

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
    it("set Key File", function () {
        browser.click("#browseButton")
            .waitForVisible('.dir');
        browser.doubleClick(`#${E2ETestDir}`)
            .waitForVisible('.file');
        browser.click(`#${keyfile}`)
            .click(dialogOKButton)
        const keyfilePathElement = $('#keyfilePath');
        const path = keyfilePathElement.getText();
        const pathSep = path[0] === '/' ? '/' : '\\';
        let searchResult = '';
        let result = '';

        if (pathSep === '\\') {
            searchResult = path.indexOf('/');
        } else {
            searchResult = path.indexOf('\\');
        }

        if (searchResult === -1) {
            result = true;
        } else {
            result = false;
        }
        expect(result).to.equal(true);
    });
});