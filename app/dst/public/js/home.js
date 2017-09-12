$(() => {
    // socket io
    const socket = io('/swf/home');
    const getFileListSocket = new GetFileListSocket(socket);
    const createNewProjectSocket = new CreateNewProjectSocket(socket);
    // menu
    const createNew = $('#create_new_workflow');
    // file dialog
    const dialog = new FileDialog(getFileListSocket);
    /**
     * initialize
     */
    (function init() {
        setCreateNewProjectDialog();
        setClickEventForNewButton();
    })();
    /**
     * set several events for file dialog to create a new project
     */
    function setCreateNewProjectDialog() {
        dialog
            .onDirIconMouseup()
            .onDirIconDblClick()
            .onChangeAddress()
            .onClickCancel()
            .onClickOK((inputTextElement) => {
            const dirname = inputTextElement.val().trim();
            if (!dirname || !ClientUtility.isValidDirectoryName(dirname)) {
                inputTextElement.borderInvalid();
                return;
            }
            const directoryPath = `${dialog.getLastSelectDirectory()}${dirname}`;
            createNewProjectSocket.emit(directoryPath, (rootFilePath) => {
                if (!rootFilePath) {
                    inputTextElement.borderInvalid();
                    return;
                }
                else {
                    ClientUtility.moveWorkflowLink(rootFilePath);
                }
            });
        });
    }
    /**
     * set button click event to create a new project
     */
    function setClickEventForNewButton() {
        createNew.click(() => {
            dialog.updateDialog();
            dialog.show();
        });
    }
});
//# sourceMappingURL=home.js.map