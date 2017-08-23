$(function () {
    // socket io
    var socket = io('/swf/select');
    var getFileListSocket = new GetFileListSocket(socket, config.extension.project);
    // file dialog
    var dialog = new FileDialog(getFileListSocket);
    /**
     * set dialog events
     */
    (function setDialogEvents() {
        dialog
            .onDirIconMouseup()
            .onDirIconDblClick()
            .onFileIconMouseup()
            .onFileIconDblClick(ClientUtility.moveWorkflowLink)
            .onChangeAddress()
            .updateDialog();
    })();
});
//# sourceMappingURL=select.js.map