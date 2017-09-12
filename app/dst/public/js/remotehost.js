$(() => {
    // socket io
    const socket = io('/swf/remotehost');
    const getRemoteHostListSocket = new GetRemoteHostListSocket(socket);
    const sshConnectionSocket = new SshConnectionSocket(socket);
    const addHostSocket = new AddHostSocket(socket);
    const deleteHostSocket = new DeleteHostSocket(socket);
    const getFileListSocket = new GetFileListSocket(socket, '');
    // elements
    const hostTable = $('#host_table');
    const sshKeyRadio = $('#authtype_sshkey');
    const browseButton = $('#browse_button');
    const addHostButton = $('#add_host_button');
    const addError = $('#add_error_area');
    const inputText = $('#input_text_browse');
    const textLabel = $('#text_label');
    const textHost = $('#text_host');
    const textPath = $('#text_path');
    const textId = $('#text_id');
    const sshKeyAddress = $('#sshkey_address');
    const textBoxes = [textLabel, textHost, textPath, textId, sshKeyAddress];
    // romote host list
    let remotHostList = [];
    // file dialog
    const dialog = new FileDialog(getFileListSocket);
    // connect flag to server
    let isConnect = false;
    /**
     * initialize
     */
    (function init() {
        getHostList();
        setClickEventForBrowseButton();
        setClickEventForAddButton();
        setHostListEvents();
        setFileDialogEvents();
        clearInputText();
        enableRadioButtonToSshKey();
    })();
    /**
     * set button click event to open file dialog
     */
    function setClickEventForBrowseButton() {
        browseButton.on('click', () => {
            dialog.updateDialog();
            dialog.show();
        });
    }
    /**
     * set button click event to add host information
     */
    function setClickEventForAddButton() {
        addHostButton.click(() => {
            const isCheckedSshKey = sshKeyRadio.prop('checked');
            const label = textLabel.val().trim();
            const host = textHost.val().trim();
            const path = textPath.val().trim();
            const name = textId.val().trim();
            const sshkey = sshKeyAddress.val().trim();
            let errorText = '';
            textBoxes.forEach(textbox => textbox.borderValid());
            if (!ClientUtility.isLocalHost(host)) {
                if (isCheckedSshKey && !sshkey) {
                    sshKeyAddress.borderInvalid();
                    errorText = 'Key File is empty or white space';
                }
                if (!name) {
                    textId.borderInvalid();
                    errorText = 'ID is empty or white space';
                }
            }
            if (!path) {
                textPath.borderInvalid();
                errorText = 'Path is empty or white space';
            }
            if (!host) {
                textHost.borderInvalid();
                errorText = 'Host is empty or white space';
            }
            if (!label) {
                textLabel.borderInvalid();
                errorText = 'Label is empty or white space';
            }
            if (remotHostList.filter(host => host.name === label).length) {
                textLabel.borderInvalid();
                errorText = 'Label is duplicate';
            }
            if (errorText) {
                addError.text(errorText);
                return;
            }
            addError.text('Added');
            const hostInfo = {
                name: label,
                host: host,
                path: path,
                username: name,
                description: ''
            };
            if (isCheckedSshKey) {
                hostInfo.privateKey = sshkey;
            }
            textBoxes.forEach(textbox => textbox.val(''));
            addHostSocket.emit(hostInfo, (isAdd) => {
                getHostList();
            });
        });
    }
    /**
     * set several events for host list
     */
    function setHostListEvents() {
        $(document).on('change', '.auth_type_radio', () => {
            const isCheckedSshKey = sshKeyRadio.prop('checked');
            if (!isCheckedSshKey) {
                enableRadioButtonToPass();
            }
            else {
                enableRadioButtonToSshKey();
            }
        });
    }
    /**
     * set several events for file dialog
     */
    function setFileDialogEvents() {
        dialog
            .onDirIconMouseup((directory) => {
            inputText.val('');
        })
            .onDirIconDblClick((directory) => {
            inputText.val('');
        })
            .onFileIconMouseup((filepath) => {
            inputText.val(ClientUtility.basename(filepath));
        })
            .onFileIconDblClick((filepath) => {
            sshKeyAddress.val(filepath);
            dialog.hide();
        })
            .onChangeAddress()
            .onClickCancel()
            .onClickOK(() => {
            const filepath = dialog.getLastSelectFilepath();
            const directory = dialog.getLastSelectDirectory();
            if (filepath) {
                sshKeyAddress.val(filepath);
                dialog.hide();
            }
            else if (directory) {
                dialog.updateDialog();
            }
        });
    }
    /**
     * enable radio button to ssh key
     */
    function enableRadioButtonToSshKey() {
        sshKeyRadio
            .prop('checked', 'checked');
        sshKeyAddress
            .removeAttr('disabled')
            .class('remotehost_text text_box');
        browseButton.prop('disabled', false);
    }
    /**
     * enable radio button to password
     */
    function enableRadioButtonToPass() {
        sshKeyAddress
            .attr('disabled', 'disabled')
            .class('remotehost_text text_box text_readonly');
        browseButton.prop('disabled', true);
    }
    /**
     * get host list
     */
    function getHostList() {
        if (!isConnect) {
            isConnect = true;
            getRemoteHostListSocket.onConnect((hostlist) => {
                if (hostlist == null) {
                    console.error('remote host list file is not found');
                }
                hostTable.html(createHtmlContent(hostlist));
                remotHostList = hostlist;
            });
        }
        else {
            getRemoteHostListSocket.emit();
        }
    }
    /**
     * clear input text
     */
    function clearInputText() {
        textBoxes.forEach(text => text.val(''));
    }
    /**
     * create html content
     * @param hostList registerd host list
     * @return html string
     */
    function createHtmlContent(hostList) {
        initTestConnectEnvet();
        const html = hostList.map(host => {
            if (host.username === undefined) {
                host.username = '';
            }
            let passwordHtml = '';
            if (!ClientUtility.isLocalHost(host)) {
                passwordHtml = `<input type="password" class="text_box" id="${host.name}_password" autocomplete="off">`;
            }
            setTestConnectEnvet(host);
            return `
                <tr id="${host.name}">
                    <td class="hostlabel">${host.name} : ${host.username}@${host.host}</td>
                    <td>${passwordHtml}</td>
                    <td><button type="button" class="test_connect_button button" id="${host.name}_test_connect">Test</button></td>
                    <td><button type="button" class="delete_button button" id="${host.name}_delete">Delete</button></td>
                </tr>`;
        });
        return html.join('');
    }
    /**
     * init test connect event
     */
    function initTestConnectEnvet() {
        remotHostList.forEach(remote => {
            $(document).off('keypress', '[id$=_password]');
            $(document).off('keyup', '[id$=_password]');
            $(document).off('click', '[id$=_test_connect]');
        });
    }
    /**
     * set test connect event
     * @param host host information
     */
    function setTestConnectEnvet(host) {
        const ENTER_KEY = 0x0D;
        let keyPressed = false;
        $(document).on('keypress', `#${host.name}_password`, (eventObject) => {
            keyPressed = true;
        });
        $(document).on('keyup', `#${host.name}_password`, (eventObject) => {
            if (eventObject.which === ENTER_KEY) {
                runConnect($(`#${host.name}_test_connect`));
            }
            keyPressed = false;
        });
        $(document).on('click', `#${host.name}_test_connect`, function () {
            runConnect($(this));
        });
        $(document).one('click', `#${host.name}_delete`, () => {
            deleteHostSocket.emit(host.name, (result) => {
                getHostList();
            });
        });
    }
    /**
     * run connect to host
     * @param button cliced button element
     */
    function runConnect(button) {
        const TEST_OK = 'OK';
        const TEST_NG = 'NG';
        const TESTING = 'Now Testing';
        const label = button.parent().parent().id();
        const password = $(`#${label}_password`).val();
        button
            .text(TESTING)
            .prop('disabled', true)
            .class('disable_button button');
        sshConnectionSocket.emit(label, password, (isConnect) => {
            if (isConnect) {
                button
                    .text(TEST_OK)
                    .class('ok_test_button button');
            }
            else {
                button
                    .text(TEST_NG)
                    .prop('disabled', false)
                    .class('ng_test_button button');
            }
        });
    }
});
//# sourceMappingURL=remotehost.js.map