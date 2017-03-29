$(function () {
    // socket io
    var socket = io('/swf/editor');
    var readFile = new ReadFileSocket(socket);
    var writeFile = new WriteFileSocket(socket);
    // elements
    var addressBar = $('#address_bar');
    var textArea = $('#text_area');
    var saveButton = $('#save_button');
    var resetButton = $('#reset_button');
    // cookie
    var editFilePath = ClientUtility.getCookies()['edit'];
    // connect flag to server
    var isConnect = false;
    /**
     * initialize
     */
    (function init() {
        if (editFilePath == null) {
            throw new Error('illegal access');
        }
        ClientUtility.deleteCookie('edit');
        readScriptFile();
        setClickEventForReset();
        setClickEventForSave();
    })();
    /**
     * set button click event to reset script
     */
    function setClickEventForReset() {
        resetButton.click(function () {
            readScriptFile();
        });
    }
    /**
     * set button click event to save script
     */
    function setClickEventForSave() {
        saveButton.click(function () {
            writeScriptFile();
        });
    }
    /**
     * read script file from server
     */
    function readScriptFile() {
        if (!isConnect) {
            isConnect = true;
            readFile.onConnect(editFilePath, function (data) {
                textArea.val(data);
                addressBar.val(editFilePath);
            });
        }
        else {
            readFile.emit(editFilePath);
        }
    }
    /**
     * write script file to server
     */
    function writeScriptFile() {
        writeFile.emit(editFilePath, textArea.val(), function (isSucceed) {
        });
    }
});
//# sourceMappingURL=editor.js.map