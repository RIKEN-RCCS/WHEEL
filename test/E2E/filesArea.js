// setup test framework
const chai = require("chai");
const expect = chai.expect;
const chaiWebdriver = require('chai-webdriverio').default;
chai.use(chaiWebdriver(browser));

describe("#Files area check", function () {
    const url = '/';
    const targetProjectName = "filesArea";
    const dialogMessage_createDir = "Input new folder name (ex. aaa.txt)"
    const dialogMessage_createFile = "Input new file name (ex. aaa.txt)"
    const dialogMessage_renameFile = "Input new file name."
    const dialogMessage_delete = "Are you sure to delete this file?"
    const dirName = "test_dir"
    const fileName = "test.txt"
    const fileName_1 = "test_1.txt"
    const fileName_2 = "test_2.txt"
    // class/id name 
    const id_E2ETestDir = "E2ETestDir_data";
    const id_testProjectJson = "prj_wheel_json_data";
    const id_dialog = "dialog"
    const class_dialogMessage = "dialogMessage"
    const id_createDirButton = "createFolderButton"
    const id_createFileButton = "createFileButton"
    const id_inputDirName = "newfolderName"
    const id_inputFileName = "newfileName"
    const id_inputFileRename = "newName"
    const id_dirName = "test_dir_data"
    const id_fileName = "test_txt_data"
    const id_fileName_1 = "test_1_txt_data"
    const id_fileName_2 = "test_2_txt_data"
    const id_globFile = "test___txt_data"
    // Xpath for `home screen`
    const importMenu = '//*[@id="importButton"]';
    const importDialogOKButton = '/html/body/div[5]/div[3]/div/button[2]';
    // Xpath for 'workflow screen'
    const dialogOkButton = '/html/body/div[2]/div[3]/div/button[2]';
    const renameButton = '/html/body/ul[2]/li[1]';
    const deleteButton = '/html/body/ul[2]/li[2]'

    it("Home screen is drawn", function () {
        browser.url(url);
        browser.setWindowSize(1920, 1080);
        expect(browser.getTitle()).to.equal("WHEEL home");
        expect('#pageNameLabel').to.have.text("Home");
    });
    it(`project ${targetProjectName} : import`, function () {
        $(importMenu).click();
        $(`#${id_E2ETestDir}`).waitForDisplayed();
        $(`#${id_E2ETestDir}`).doubleClick();
        $(`#${targetProjectName}_wheel_data`).waitForDisplayed();
        $(`#${targetProjectName}_wheel_data`).doubleClick();
        $(`#${id_testProjectJson}`).waitForDisplayed();
        $(`#${id_testProjectJson}`).click();
        $(importDialogOKButton).click();
        expect(`#prj_${targetProjectName}`).to.exist;
    });
    it(`project ${targetProjectName} : open`, function () {
        $(`#prj_${targetProjectName}`).doubleClick();
        $('#project_name').waitForDisplayed();
        expect('#project_name').to.have.text(targetProjectName)  
    });
    it("open task component property", function(){
        $('.svg_task0_box').click();
        $('#property').waitForDisplayed();
        $('#property').scrollIntoView(0, 700);
        $(`#${id_createDirButton}`).waitForDisplayed();
    })
    it("create new directory", function(){
        $(`#${id_createDirButton}`).click()
        $(`#${id_dialog}`).waitForDisplayed();
        expect(`.${class_dialogMessage}`).to.have.text(dialogMessage_createDir);
        $(`#${id_inputDirName}`).setValue(dirName); 
        $(dialogOkButton).click();
        $(`#${id_dirName}`).waitForDisplayed();
        expect(`#${id_dirName}`).to.exist;
        $(`#${id_dirName}`).doubleClick();
        expect('#dirBackButton').to.exist;
    })
    it("create new file", function(){
        $(`#${id_createFileButton}`).click();
        $(`#${id_dialog}`).waitForDisplayed();
        expect(`.${class_dialogMessage}`).to.have.text(dialogMessage_createFile);
        $(`#${id_inputFileName}`).setValue(fileName_1);
        $(dialogOkButton).click();
        expect(`#${id_fileName_1}`).to.exist;
    })
    it("create new file for glob pattern", function(){
        $(`#${id_createFileButton}`).click();
        $(`#${id_dialog}`).waitForDisplayed();
        expect(`.${class_dialogMessage}`).to.have.text(dialogMessage_createFile);
        $(`#${id_inputFileName}`).setValue(fileName_2);
        $(dialogOkButton).click();
        expect(`#${id_globFile}`).to.exist;
    })
    it("open glob file", function(){
        $(`#${id_globFile}`).doubleClick();
        $('.backButton').waitForDisplayed();
        expect(`#${id_fileName_1}`).to.exist;
        expect(`#${id_fileName_2}`).to.exist;
    })
    it("rename file", function(){
        $(`#${id_fileName_1}`).click({button: "right"});
        $(renameButton).waitForDisplayed();
        $(renameButton).click();
        $(`#${id_dialog}`).waitForDisplayed();
        expect(`.${class_dialogMessage}`).to.have.text(dialogMessage_renameFile);
        $(`#${id_inputFileRename}`).setValue(fileName);
        $(dialogOkButton).click();
        expect(`#${id_fileName}`).to.exist;
    })
    it("delete directory", function(){
        $('#node_svg').click();
        $('#property').waitForExist(true);
        console.log("browser.click('#node_svg')")
        $('.svg_task0_box').click();
        $('#property').waitForDisplayed();
        console.log("click('.svg_task0_box')")
        $('#property').scrollIntoView(0, 500);
        $(`#${id_createDirButton}`).waitForDisplayed();
        $(`#${id_dirName}`).click({button: "right"});
        $(deleteButton).waitForDisplayed();
        $(deleteButton).click();
        $(`#${id_dialog}`).waitForDisplayed();
        expect(`.${class_dialogMessage}`).to.have.text(dialogMessage_delete);
        $(dialogOkButton).click();
        expect(`#${id_dirName}`).to.exist;
    })
});