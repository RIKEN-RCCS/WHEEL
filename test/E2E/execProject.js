// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
const fs = require("fs");
chai.use(chaiWebdriver(browser));

describe("component property check:", function () {
    const url = '/';
    const E2ETestDir = "E2ETestDir";
    const ececPrjDir = "execPrjDir";
    const testProjectJson = "prj_wheel_json";
    // Xpath for "import"
    const importMenu = '//*[@id="importButton"]';
    const dialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
    // issue project list
    const homeDirPath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    const execDirPath = homeDirPath + '/E2ETestDir/execPrjDir';
    const targetPrjDir = fs.readdirSync(execDirPath);

    targetPrjDir.forEach(function (target) {
        // set test project
        let testProject = target.replace(/([.*+?^=!:$@%&#,"'~;<>{}()|[\]\/\\])/g, "_");
        let testProjectName = testProject.slice(0, -6);
        it("Home screen is drawn", function () {
            browser.url(url);
            browser.windowHandleSize({ width: 1920, height: 1080 });
            expect(browser.getTitle()).to.equal("WHEEL home");
            expect('#pageNameLabel').to.have.text("Home");
        });
        it(`project ${target} : import`, function () {
            browser.click(importMenu)
                .waitForVisible('.dir');
            browser.doubleClick(`#${E2ETestDir}`)
                .waitForVisible('.dir');
            browser.doubleClick(`#${ececPrjDir}`)
                .waitForVisible('.dir');
            browser.doubleClick(`#${testProject}`)
                .waitForVisible('.file');
            browser.click(`#${testProjectJson}`)
                .click(dialogOKButton)
                .waitForExist(`#prj_${testProjectName}`, 10000, false);
        });
        it(`project ${target} : open`, function () {
            browser.doubleClick(`#prj_${testProjectName}`)
                .waitForVisible('#project_name');
        });
        it(`project ${target} : execute`, function () {
            const updateTimeBeforeElement = $('#project_create_date');
            const updateTimeAfterElement = $('#project_update_date');
            const updateTimeBeforeRun = updateTimeBeforeElement.getText();
            let updateTimeCheckFlag = false;

            browser.pause(2000);
            browser.click('#listView')
            browser.click('#run_button')
                .waitUntil(function () {
                    return browser.getText('#project_state') === 'finished'
                }, 60000, 'expected text to be different after 60s');

            const updateTimeAftereRun = updateTimeAfterElement.getText();

            if (updateTimeBeforeRun !== updateTimeAftereRun) {
                updateTimeCheckFlag = true;
            }
            expect(updateTimeCheckFlag).to.equal(true);
            browser.click('graphView')

        });
    });

});
