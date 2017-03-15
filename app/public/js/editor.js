$(function () {
    var socket = io('/swf/editor');
    var readFile = new ReadFileSocket(socket);
    var writeFile = new WriteFileSocket(socket);
    var addressBar = $('#address_bar');
    var textArea = $('#text_area');
    var saveButton = $('#save_button');
    var resetButton = $('#reset_button');
    var cookies = ClientUtility.getCookies();
    var editFilePath = cookies['edit'];
    /**
     *
     */
    readFile.onConnect(editFilePath, function (data) {
        var encodedString = String.fromCharCode.apply("", new Uint8Array(data));
        textArea.val(encodedString);
        addressBar.val(editFilePath);
    });
    /**
     *
     */
    resetButton.click(function () {
        readFile.emit(editFilePath);
    });
    /**
     *
     */
    saveButton.click(function () {
        writeFile.emit(editFilePath, textArea.val(), function (isSucceed) {
        });
    });
});
//# sourceMappingURL=editor.js.map