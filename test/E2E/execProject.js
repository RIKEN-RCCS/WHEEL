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
    // id/class 
    const id_pageName = 'pageNameLabel';
    const id_prjName = 'projectName';
    const id_createDate = 'project_create_date';
    const id_updateDate = 'project_update_date';
    const id_listview = 'listView';
    const id_runButton = 'run_button';
    const id_prjState = 'projectState';
    const id_cleanButton = "clean_button";
    const id_nodeSvg = "node_svg";
    const cleanCheckDialog = '/html/body/div[2]';
    const cleanCheckDialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';
    // Xpath for "import"
    const importMenu = '//*[@id="importButton"]';
    const dialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
    // target project list
    const homeDirPath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    const execDirPath = homeDirPath + '/E2ETestDir/execPrjDir';
    const targetPrjDir = fs.readdirSync(execDirPath);

    targetPrjDir.forEach(function (target) {
        // set test project
        let testProject = target.replace(/([.*+?^=!:$@%&#,"'~;<>{}()|[\]\/\\])/g, "_");
        let projectName= testProject.slice(0, -6); // remove '.wheel'
        it("Home screen is drawn", function () {
            browser.url(url);
            browser.setWindowSize(1920, 1080);
            expect(browser.getTitle()).to.equal("WHEEL home");
            expect(`#${id_pageName}`).to.have.text("Home");
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
            $(`#prj_${projectName}`).waitForDisplayed();
            let elem = $(`#prj_${projectName}`).isDisplayed();
            expect(elem).to.be.true;
        });
        it(`project ${target} : open`, function () {
            $(`#prj_${projectName}`).doubleClick();
            $(`#${id_prjName}`).waitForDisplayed();
            let elem = $(`#${id_prjName}`).isDisplayed();
            expect(elem).to.be.true;
        });
        it(`project ${target} : execute`, function () {
            const createDate = $(`#${id_createDate}`).getText();
            let execFlag = false;
            $(`#${id_listview}`).click();
            $(`#${id_runButton}`).click();
            browser.waitUntil(function () {
                return $(`#${id_prjState}`).getText() === 'finished'
            }, 60000, 'expected text to be different after 60s');

            const updateDate = $(`#${id_updateDate}`).getText();
            if (`${createDate}` !== `${updateDate}`) {
                execFlag = true;
            }
            $('#graphView').click();
            expect(execFlag).to.be.true;
        });
        it("post process for retry", function () {
            $(`#${id_nodeSvg}`).click();
            $(`#${id_cleanButton}`).click();
            $(cleanCheckDialog).waitForDisplayed();
            $(cleanCheckDialogOkButton).click();
            browser.waitUntil(function(){
                return $(`#${id_prjState}`).getText() === 'not-started'
            }, 1000, 'expected text to be different after 1s');
            expect(`#${id_prjState}`).to.have.text("not-started");
        });
    });
});
