$(function () {
    // socket io
    var socket = io('/swf/home');
    var getFileListSocket = new GetFileListSocket(socket);
    var createNewProjectSocket = new CreateNewProjectSocket(socket);
    // menu
    var createNew = $('#create_new_workflow');
    // file dialog
    var dialog = new FileDialog(getFileListSocket);
    // file dialog event
    dialog
        .onDirIconMouseup()
        .onDirIconDblClick()
        .onChangeAddress()
        .onClickCancel()
        .onClickOK(function (inputTextElement) {
        var dirname = inputTextElement.val().trim();
        if (!dirname || !ClientUtility.isValidDirectoryName(dirname)) {
            inputTextElement.borderInvalid();
            return;
        }
        var directoryPath = "" + dialog.getLastSelectDirectory() + dirname;
        createNewProjectSocket.emit(directoryPath, function (rootFilePath) {
            if (!rootFilePath) {
                inputTextElement.borderInvalid();
                return;
            }
            else {
                ClientUtility.moveWorkflowLink(rootFilePath);
            }
        });
    });
    /**
     * click create new workflow icon
     */
    createNew.click(function () {
        dialog.updateDialog();
        dialog.show();
    });
});
//# sourceMappingURL=home.js.map