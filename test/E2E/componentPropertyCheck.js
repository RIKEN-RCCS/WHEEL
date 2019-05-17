// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("component property check:", function () {
    const url = '/';
    const E2ETestDir = "E2ETestDir";
    const testProject = "componentPropertyCheck_wheel";
    const testProjectJson = "prj_wheel_json";
    const testProjectName = "componentPropertyCheck";
    // Xpath for "import"
    const importMenu = '//*[@id="importButton"]';
    const dialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
    //task0 component info
    const task0Id = 'task0_box';
    const createFileName = "test.txt";
    const createFolderName = "test";
    const fileDialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';
    //workflow0 component info(parent)
    const workflow0Id = 'workflow0_box';
    const renameParent = 'workflow1';
    //task1 component info(child)
    const task1Id = 'task1_box';
    const renameChild = 'task2';

    it("Home screen is drawn", function () {
        browser.url(url);
        browser.windowHandleSize({ width: 1920, height: 1080 });
        expect(browser.getTitle()).to.equal("WHEEL home");
        expect('#pageNameLabel').to.have.text("Home");
    });
    it(`project ${testProject} : import`, function () {
        browser.click(importMenu)
            .waitForVisible('.dir');
        browser.doubleClick(`#${E2ETestDir}`)
            .waitForVisible('.dir');
        browser.doubleClick(`#${testProject}`)
            .waitForVisible('.file');
        browser.click(`#${testProjectJson}`)
            .click(dialogOKButton)
            .waitForExist(`#prj_${testProjectName}`, 10000, false);
    });
    it(`project ${testProject} : open`, function () {
        browser.doubleClick(`#prj_${testProjectName}`)
            .waitForVisible('#project_name');
    });
    it("create file #issue 242", function () {
        // scroll #property
        browser.click(`.${task0Id}`)
            .scroll('#property', 0, 500)
            .waitForVisible('#createFileButton');
        browser.click('#createFileButton')
            .waitForVisible('#dialog');
        browser.setValue('#newFileName', createFileName)
            .click(fileDialogOkButton)
            .waitForVisible('.file');
    });
    it("create dir #issue 242", function () {
        // scroll #property
        browser.click('#createFolderButton')
            .waitForVisible('#dialog');
        browser.setValue('#newFolderName', createFolderName)
            .click(fileDialogOkButton)
            .waitForVisible('.dir');
    });
    it("rename parent component #issue 243", function () {
        browser.click(`.${workflow0Id}`)
            .waitForVisible('#property');
        browser.setValue('#nameInputField', renameParent);
        // browser.pause(1000);
        browser.click('#descriptionInputField');
        // browser.pause(1000);
        browser.waitForExist(`.${renameParent}_box`);
    });
    it("rename child component #issue 243", function () {
        browser.doubleClick(`.${renameParent}_box`)
            .waitForVisible('#breadcrumbButton_1');
        browser.click(`.${task1Id}`)
            .waitForVisible('#property');
        browser.setValue('#nameInputField', renameChild)
            .click('#descriptionInputField')
            .waitForExist(`.${renameChild}_box`);
    });
    it("create file (child) #issue 242", function () {
        browser.click(`.${renameChild}_box`)
            .scroll('#property', 0, 500)
            .waitForVisible('#createFileButton');
        browser.click('#createFileButton')
            .waitForVisible('#dialog');
        browser.setValue('#newFileName', createFileName)
            .click(fileDialogOkButton)
            .waitForVisible('.file');
    });
});
