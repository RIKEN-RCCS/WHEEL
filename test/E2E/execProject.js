// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
const fs = require("fs");
chai.use(chaiWebdriver(browser));

describe("project result check", function () {
    const url = '/';
    const E2ETestDir = "E2ETestDir";
    const execPrjDir = "execPrjDir";
    const id_targetProjectJson = "prj_wheel_json_data";
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
        let  projectName= testProject.slice(0, -6);
        it("Home screen is drawn", function () {
            browser.url(url);
            browser.setWindowSize(1920, 1080);
            expect(browser.getTitle()).to.equal("WHEEL home");
            expect('#pageNameLabel').to.have.text("Home");
        });
        it(`project ${target} : import`, function () {
            $(importMenu).click();
            $('.dir').waitForDisplayed();
            $(`#${E2ETestDir}_data`).doubleClick();
            $('.dir').waitForDisplayed();
            $(`#${execPrjDir}_data`).doubleClick();
            $('.dir').waitForDisplayed();
            $(`#${testProject}_data`).doubleClick();
            $('.file').waitForDisplayed();
            $(`#${id_targetProjectJson}`).click();
            $(dialogOKButton).click();
            $(`#prj_${projectName}`).waitForExist();
        });
        it(`project ${target} : open`, function () {
            $(`#prj_${projectName}`).doubleClick();
            $('#project_name').waitForDisplayed();
        });
        it(`project ${target} : execute`, function () {
            const updateTimeBeforeElement = $('#project_create_date');
            const updateTimeAfterElement = $('#project_update_date');
            const updateTimeBeforeRun = $(updateTimeBeforeElement).getText();
            let updateTimeCheckFlag = false;

            browser.pause(2000);
            $('#listView').click();
            $('#run_button').click();
            browser.waitUntil(function () {
                return $('#project_state').getText() === 'finished'
            }, 60000, 'expected text to be different after 60s');

            const updateTimeAftereRun = $(updateTimeAfterElement).getText();

            console.log(`${updateTimeBeforeRun}`)
            console.log(`${updateTimeAftereRun}`)

            if (`${updateTimeBeforeRun}` !== `${updateTimeAftereRun}`) {
                updateTimeCheckFlag = true;
            }
            expect(`${updateTimeCheckFlag}`).to.equal("true");
            $('#graphView').click();

        });
    });
});
