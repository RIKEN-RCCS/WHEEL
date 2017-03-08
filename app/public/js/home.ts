$(() => {

    // socket io
    const socket = io('/swf/home');
    const getFileListSocket = new GetFileListSocket(socket);
    const createNewProjectSocket = new CreateNewProjectSocket(socket);

    // menu
    const createNew = $('#create_new_workflow');

    // file dialog
    const dialog = new FileDialog(getFileListSocket);

    // file dialog event
    dialog
        .onDirIconMouseup()
        .onDirIconDblClick()
        .onChangeAddress()
        .onClickCancel()
        .onClickOK((inputTextElement: JQuery) => {
            const dirname = inputTextElement.val().trim();
            if (!dirname || !ClientUtility.isValidDirectoryName(dirname)) {
                inputTextElement.borderInvalid();
                return;
            }

            const directoryPath = `${dialog.getLastSelectDirectory()}${dirname}`;
            createNewProjectSocket.emit(directoryPath, (rootFilePath: string) => {
                if (!rootFilePath) {
                    inputTextElement.borderInvalid();
                    return;
                }
                else {
                    ClientUtility.moveWorkflowLink(rootFilePath);
                }
            })
        });

    /**
     * click create new workflow icon
     */
    createNew.click(() => {
        dialog.updateDialog();
        dialog.show();
    });
});