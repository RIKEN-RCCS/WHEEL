$(() => {

    // socket io
    const socket = io('/swf/select');
    const getFileListSocket = new GetFileListSocket(socket, config.extension.project);

    // file dialog
    const dialog = new FileDialog(getFileListSocket);

    /**
     * file dialog event
     */
    dialog
        .onDirIconMouseup()
        .onDirIconDblClick()
        .onFileIconMouseup()
        .onFileIconDblClick(ClientUtility.moveWorkflowLink)
        .onChangeAddress()
        .updateDialog();
});