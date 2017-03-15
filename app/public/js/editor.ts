$(() => {
    const socket = io('/swf/editor');
    const readFile = new ReadFileSocket(socket);
    const writeFile = new WriteFileSocket(socket);

    const addressBar = $('#address_bar');
    const textArea = $('#text_area');
    const saveButton = $('#save_button');
    const resetButton = $('#reset_button');

    const cookies = ClientUtility.getCookies();
    const editFilePath = cookies['edit'];

    /**
     *
     */
    readFile.onConnect(editFilePath, (data) => {
        var encodedString: string = String.fromCharCode.apply("", new Uint8Array(data));
        textArea.val(encodedString);
        addressBar.val(editFilePath);
    });

    /**
     *
     */
    resetButton.click(() => {
        readFile.emit(editFilePath);
    });

    /**
     *
     */
    saveButton.click(() => {
        writeFile.emit(editFilePath, textArea.val(), (isSucceed: boolean) => {

        });
    });
});