$(() => {
    const hostTable = $('#host_table');
    const sshKeyRadio = $('#authtype_sshkey');
    const browseButton = $('#browse_button');
    const addHostButton = $('#add_host_button');
    const addError = $('#add_error_area');

    // host setting
    const textLabel = $('#text_label');
    const textHost = $('#text_host');
    const textPath = $('#text_path');
    const textId = $('#text_id');
    const sshKeyAddress = $('#sshkey_address');
    const textBoxes: JQuery[] = [textLabel, textHost, textPath, textId, sshKeyAddress];

    // socket io
    const socket = io('/swf/remotehost');
    const getRemoteHostListSocket = new GetRemoteHostListSocket(socket);
    const sshConnectionSocket = new SshConnectionSocket(socket);
    const addHostSocket = new AddHostSocket(socket);
    const deleteHostSocket = new DeleteHostSocket(socket);
    const getFileListSocket = new GetFileListSocket(socket, '');
    let remotHostList: SwfHostJson[];

    // file dialog
    const inputText = $('#input_text_browse');
    const dialog = new FileDialog(getFileListSocket);

    /**
     * button animation for mouse cursor hover
     */
    browseButton.on('click', () => {
        dialog.updateDialog();
        dialog.show();
    });

    /**
     * click add host information event
     */
    addHostButton.click(() => {
        const isCheckedSshKey: boolean = sshKeyRadio.prop('checked');
        const label: string = textLabel.val().trim();
        const host: string = textHost.val().trim();
        const path: string = textPath.val().trim();
        const name: string = textId.val().trim();
        const sshkey: string = sshKeyAddress.val().trim();
        let errorText: string = '';

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

        const hostInfo: SwfHostJson = {
            name: label,
            host: host,
            path: path,
            username: name,
            description: '',
            job_scheduler: ''
        };

        if (isCheckedSshKey) {
            hostInfo.privateKey = sshkey;
        }

        textBoxes.forEach(textbox => textbox.val(''));
        addHostSocket.emit(hostInfo, (isAdd: boolean) => {
            getRemoteHostListSocket.emit(getHostListCallback);
        });
    });

    /**
     * select radio button event for disable brose button and text box
     */
    $(document)
        .on('change', '.auth_type_radio', () => {
            const isCheckedSshKey: boolean = sshKeyRadio.prop('checked');
            if (!isCheckedSshKey) {
                disableKeyBrowse();
            }
            else {
                enableKeyBrowse();
            }
        })
        .on('click', '.test_connect_button, .ng_test_button', function () {
            testConnect($(this));
        });

    /**
     * request remote host list event
     */
    getRemoteHostListSocket.onConnect(getHostListCallback);

    /**
     * click ok button event
     */
    dialog
        .onDirIconMouseup((directory: string) => {
            inputText.val('');
        })
        .onDirIconDblClick((directory: string) => {
            inputText.val('');
        })
        .onFileIconMouseup((filepath: string) => {
            inputText.val(ClientUtility.basename(filepath));
        })
        .onFileIconDblClick((filepath: string) => {
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

    /**
     *
     */
    (function initDisplay() {
        textBoxes.forEach(text => text.val(''));
        enableKeyBrowse();
    })();

    /**
     *
     */
    function enableKeyBrowse() {
        sshKeyRadio
            .prop('checked', 'checked');
        sshKeyAddress
            .removeAttr('disabled')
            .class('remotehost_text text_box');
        browseButton.prop('disabled', false);
    }

    /**
     *
     */
    function disableKeyBrowse() {
        sshKeyAddress
            .attr('disabled', 'disabled')
            .class('remotehost_text text_box text_readonly');
        browseButton.prop('disabled', true);
    }

    /**
     *
     * @param hostList
     */
    function getHostListCallback(hostList: SwfHostJson[]) {
        if (hostList == null) {
            console.error('remote host list file is not found');
        }
        hostTable.html(createHtml4RemoteHost(hostList));
        remotHostList = hostList;
    }

    /**
     *
     * @param hostList
     */
    function createHtml4RemoteHost(hostList: SwfHostJson[]): string {
        const html: string[] = hostList.map(host => {
            if (host.username === undefined) {
                host.username = '';
            }

            let passwordHtml = '';
            if (!ClientUtility.isLocalHost(host.host)) {
                passwordHtml = `<input type="password" class="text_box" id="${host.name}_password" autocomplete="off">`;
            }

            $(document).on('keyup', `#${host.name}_password`, (eventObject: JQueryEventObject) => {
                if (eventObject.which == 0x0D) {
                    testConnect($(`#${host.name}_test_connect`));
                }
            });

            $(document).one('click', `#${host.name}_delete`, () => {
                deleteHostSocket.emit(host.name, (result: boolean): void => {
                    getRemoteHostListSocket.emit(getHostListCallback);
                    $(document).off('keyup', `#${host.name}_password`);
                    $(document).off('click', '.test_connect_button, .ng_test_button');
                });
            });

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
     *
     * @param button
     */
    function testConnect(button: JQuery) {
        const TEST_OK = 'OK';
        const TEST_NG = 'NG';
        const TESTING = 'Now Testing';
        const label = button.parent().parent().id();
        const password = $(`#${label}_password`).val();

        button
            .text(TESTING)
            .prop('disabled', true)
            .class('testing_button button');

        sshConnectionSocket.emit(label, password, true, (isConnect: boolean) => {
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