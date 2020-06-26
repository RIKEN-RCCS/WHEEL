// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("open job script screen", function () {
    const url = '/';
    const id_pageName = "pageNameLabel";
    const id_drawerButton = "drawerButton";
    const id_templateListArea = "templateListArea";
    const id_templateName = "templateName";
    const id_hpcCenterLabel = "hpcCenterLabel";
    const id_other = "other";
    const id_drawerjobscript = "jobScriptEditorButton";
    it("Home screen check", function () {
        browser.url(url);
        browser.setWindowSize(1400, 1080);
        expect(browser.getTitle()).to.equal("WHEEL home");
        expect(`#${id_pageName}`).to.have.text("Home");
    }); 
    it("move to jobscript editor screen", function () {
        $(`#${id_drawerButton}`).click();
        $(`#${id_drawerjobscript}`).waitForDisplayed();
        browser.pause(1000);
        $(`#${id_drawerjobscript}`).click();
        browser.newWindow('WHEEL JobScript Template Editor');
        $(`#${id_templateListArea}`).waitForDisplayed(); 
        let elem = $(`#${id_templateListArea}`).isDisplayed();
        expect(elem).to.be.true;
    });
    it("default parameter check", function () {
        $(`#${id_templateName}`).waitForDisplayed();
        $(`#${id_hpcCenterLabel}`).waitForDisplayed();
        $(`#${id_other}`).waitForDisplayed();
        expect(`#${id_templateName}`).to.have.text("Template Name");
        expect(`#${id_hpcCenterLabel}`).to.have.text("HPC Center");
        expect(`#${id_other}`).to.have.text("other command");
    }); 
});
describe("jobscript screen action check : add TCS template", function () {
    // TCS parameter
    const id_templateNameInputArea = "templateNameInputArea";
    const id_hpcCenterSelectArea = "hpcCenterSelectArea";
    const id_rscunit = "rscunit";
    const id_rscgrp = "rscgrp";
    const id_nodeNum = "nodeNum";
    const id_coreNum = "coreNum";
    const id_elapsedTime = "elapsedTime";
    const id_stdoutName = "stdoutName";
    const id_stderrName = "stderrName";
    const id_jobName = "jobName";
    const id_other = "otherInputTextArea";
    const test_templateNameInputArea = "tcs_sample";
    const test_hpcCenterSelectArea = "KYUSHU UNIVERSITY ITO";
    const test_rscunit = "ito-a";
    const test_rscgrp = "ito-q-dbg";
    const test_nodeNum = 4;
    const test_coreNum = 8;
    const test_elapsedTime = "02:00:00";
    const test_stdoutName = "stdout";
    const test_stderrName = "stderr";
    const test_jobName = "tcs_job";
    const test_other = "module load AAA";
    const id_confirmButton = "confirmButton";
    it("add TCS template ", function () {
        $(`#${id_templateNameInputArea}`).setValue(test_templateNameInputArea);
        $(`#${id_hpcCenterSelectArea}`).selectByVisibleText(test_hpcCenterSelectArea);
        $(`#${id_rscunit}`).waitForDisplayed();
        $(`#${id_rscunit}`).selectByVisibleText(test_rscunit);
        $(`#${id_rscgrp}`).selectByVisibleText(test_rscgrp);
        $(`#${id_nodeNum}`).setValue(test_nodeNum);
        $(`#${id_coreNum}`).setValue(test_coreNum);
        $(`#${id_elapsedTime}`).setValue(test_elapsedTime);
        $(`#${id_stdoutName}`).setValue(test_stdoutName);
        $(`#${id_stderrName}`).setValue(test_stderrName);
        $(`#${id_jobName}`).setValue(test_jobName);
        $(`#${id_other}`).setValue(test_other);
        $(`#${id_confirmButton}`).click();
        $(`#${test_templateNameInputArea}`).waitForDisplayed();
        expect(`#${test_templateNameInputArea}`).to.exist;
        let elem = $(`#${test_templateNameInputArea}`).isDisplayed();
        expect(elem).to.be.true;
    });
});
describe("jobscript screen action check : add other template", function () {
    // other parameter
    const id_templateNameInputArea = "templateNameInputArea";
    const id_hpcCenterSelectArea = "hpcCenterSelectArea";
    const id_rsctype = "rsctype";
    const id_rscnum = "rscnum";
    const id_elapsedTime = "elapsedTime";
    const id_priority = "priority";
    const id_taskId = "taskId";
    const id_holdId = "holdId";
    const id_arId = "arId";
    const id_stdoutName = "stdoutName";
    const id_stderrName = "stderrName";
    const id_jobName = "jobName";
    const id_other = "otherInputTextArea";
    const test_templateNameInputArea = "other_sample";
    const test_hpcCenterSelectArea = "other";
    const test_rsctype = "rt_G.large";
    const test_rscnum = 4;
    const test_elapsedTime = "02:00:00";
    const test_priority = "0";
    const test_taskId = "0-10:1";
    const test_holdId = "456";
    const test_arId = "789";
    const test_stdoutName = "stdout";
    const test_stderrName = "stderr";
    const test_jobName = "other_job";
    const test_other = "module load BBB";
    const id_confirmButton = "confirmButton";
    it("add other template ", function () {
        $(`#${id_templateNameInputArea}`).setValue(test_templateNameInputArea);
        $(`#${id_hpcCenterSelectArea}`).selectByVisibleText(test_hpcCenterSelectArea);
        $(`#${id_rsctype}`).waitForDisplayed();
        $(`#${id_rsctype}`).selectByVisibleText(test_rsctype);
        $(`#${id_rscnum}`).setValue(test_rscnum);
        $(`#${id_priority}`).setValue(test_priority);
        $(`#${id_taskId}`).setValue(test_taskId);
        $(`#${id_holdId}`).setValue(test_holdId);
        $(`#${id_arId}`).setValue(test_arId);
        $(`#${id_elapsedTime}`).setValue(test_elapsedTime);
        $(`#${id_stdoutName}`).setValue(test_stdoutName);
        $(`#${id_stderrName}`).setValue(test_stderrName);
        $(`#${id_jobName}`).setValue(test_jobName);
        $(`#${id_other}`).setValue(test_other);
        $(`#${id_confirmButton}`).click();
        $(`#${test_templateNameInputArea}`).waitForDisplayed();
        let elem = $(`#${test_templateNameInputArea}`).isDisplayed();
        expect(elem).to.be.true;
    });
});
describe("jobscript screen action check : copy, delete", function () {
    const test_templateNameInputArea = "tcs_sample"; 
    const test_templateNameInputArea2 = "tcs_sample_1"; 
    const id_copyButton = "copyButton";
    const id_deleteButton = 'deleteButton';
    const xpath_dialog = '/html/body/div[3]';
    const xpath_ok = '/html/body/div[3]/div[3]/div/button[2]';
    it("copy template", function () {
        $(`#${test_templateNameInputArea}`).click();
        $(`#${id_copyButton}`).click();
        $(`#${test_templateNameInputArea2}`).waitForDisplayed();
        let elem = $(`#${test_templateNameInputArea2}`).isDisplayed();
        expect(elem).to.be.true;
    });
    it("delete template", function () {
        $(`#${test_templateNameInputArea2}`).click();
        $(`#${id_deleteButton}`).click();
        $(xpath_dialog).waitForDisplayed();
        $(xpath_ok).click();
        $(`#${test_templateNameInputArea2}`).waitForDisplayed(10000,true);
        let elem = $(`#${test_templateNameInputArea2}`).isDisplayed();
        expect(elem).to.not.be.true;
    });
});
describe("create jobscript", function () {
    const id_title = "title";
    const id_pageName = "pageNameLabel";
    const id_prjName = "projectName";
    const id_property = "property";
    const id_createJobScriptButton = "createJobScriptButton";
    const id_cleanButton = "clean_button";
    const id_jobScriptSelectBox = "jobScriptSelectBox";
    const id_jobScriptName = "jobScriptName";
    const id_E2ETestDir = "E2ETestDir_data";
    const id_testProjectJson = "prj_wheel_json_data";  
    const xpath_importMenu = '//*[@id="importButton"]';
    const xpath_importDlgOk = '/html/body/div[5]/div[3]/div/button[2]';
    const xpath_jobscriptDlg = '/html/body/div[2]';
    const xpath_jobscriptDlgOk = '/html/body/div[2]/div[3]/div/button[2]';
    const xpath_cleanCheckDlg = '/html/body/div[2]';
    const xpath_cleanCheckDlgOk = '/html/body/div[2]/div[3]/div/button[2]';
  
    // test parameter
    const targetProjectName = "jobscript";
    const targetComponent = "svg_task0_box";
    const targetTemplate = "tcs_sample";
    const test_filename = "tcs_job.sh";
    const targetFile = "tcs_job_sh_data";
    it("return to home screen", function () {
        $(`#${id_title}`).click()
        browser.pause(1000);
        expect(`#${id_pageName}`).to.have.text("Home");
    });
    it(`project ${targetProjectName} : import`, function () {
        $(xpath_importMenu).click();
        $(`#${id_E2ETestDir}`).waitForDisplayed();
        $(`#${id_E2ETestDir}`).doubleClick();
        $(`#${targetProjectName}_wheel_data`).waitForDisplayed();
        $(`#${targetProjectName}_wheel_data`).doubleClick();
        $(`#${id_testProjectJson}`).waitForDisplayed();
        $(`#${id_testProjectJson}`).click();
        $(xpath_importDlgOk).click();
        $(`#prj_${targetProjectName}`).waitForDisplayed();
        let elem = $(`#prj_${targetProjectName}`).isDisplayed();
        expect(elem).to.be.true;
    });
    it(`project ${targetProjectName} : open`, function () {
        $(`#prj_${targetProjectName}`).doubleClick();
        $(`#${id_prjName}`).waitForDisplayed();
        expect(`#${id_prjName}`).to.have.text(targetProjectName)  
    });
    it("create jobscript", function () {
        $(`.${targetComponent}`).click();
        $(`#${id_property}`).waitForDisplayed();
        $(`#${id_property}`).scrollIntoView(0, 700);
        $(`#${id_createJobScriptButton}`).waitForDisplayed();
        $(`#${id_createJobScriptButton}`).click();
        $(xpath_jobscriptDlg).waitForDisplayed();
        $(`#${id_jobScriptSelectBox}`).selectByVisibleText(targetTemplate);
        $(`#${id_jobScriptName}`).setValue(test_filename);
        $(xpath_jobscriptDlgOk).click();
        $(`#${targetFile}`).waitForDisplayed();
        let elem = $(`#${targetFile}`).isDisplayed();
        expect(elem).to.be.true;
    });
    it("initialize project", function(){
        $(`#${id_cleanButton}`).click();
        $(xpath_cleanCheckDlg).waitForDisplayed();
        $(xpath_cleanCheckDlgOk).click();
        let elem = $(`#${targetFile}`).isDisplayed();
        expect(elem).to.not.be.true;
    });
});