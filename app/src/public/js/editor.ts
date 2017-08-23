$(() => {
    // socket io
    const socket = io('/swf/editor');
    const readFile = new ReadFileSocket(socket);
    const writeFile = new WriteFileSocket(socket);

    // elements
    const addressBar = $('#address_bar');
    const textArea = $('#text_area');
    const saveButton = $('#save_button');
    const resetButton = $('#reset_button');

    // cookie
    const editFilePath = ClientUtility.getCookies()['edit'];

    // connect flag to server
    let isConnect: boolean = false;

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
        resetButton.click(() => {
            readScriptFile();
        });
    }

    /**
     * set button click event to save script
     */
    function setClickEventForSave() {
        saveButton.click(() => {
            writeScriptFile();
        });
    }

    /**
     * read script file from server
     */
    function readScriptFile() {
        if (!isConnect) {
            isConnect = true;
            readFile.onConnect(editFilePath, (data) => {
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
        writeFile.emit(editFilePath, textArea.val(), (isSucceed: boolean) => {

        });
    }
});