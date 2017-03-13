$(function () {
    var hostTable = $('#host_table');
    var sshKeyRadio = $('#authtype_sshkey');
    var browseButton = $('#browse_button');
    var addHostButton = $('#add_host_button');
    var addError = $('#add_error_area');
    // host setting
    var textLabel = $('#text_label');
    var textHost = $('#text_host');
    var textPath = $('#text_path');
    var textId = $('#text_id');
    var sshKeyAddress = $('#sshkey_address');
    var textBoxes = [textLabel, textHost, textPath, textId, sshKeyAddress];
    // socket io
    var socket = io('/swf/remotehost');
    var getRemoteHostListSocket = new GetRemoteHostListSocket(socket);
    var sshConnectionSocket = new SshConnectionSocket(socket);
    var addHostSocket = new AddHostSocket(socket);
    var deleteHostSocket = new DeleteHostSocket(socket);
    var getFileListSocket = new GetFileListSocket(socket, '');
    var remotHostList;
    // file dialog
    var inputText = $('#input_text_browse');
    var dialog = new FileDialog(getFileListSocket);
    /**
     * button animation for mouse cursor hover
     */
    browseButton.on('click', function () {
        dialog.updateDialog();
        dialog.show();
    });
    /**
     * click add host information event
     */
    addHostButton.click(function () {
        var isCheckedSshKey = sshKeyRadio.prop('checked');
        var label = textLabel.val().trim();
        var host = textHost.val().trim();
        var path = textPath.val().trim();
        var name = textId.val().trim();
        var sshkey = sshKeyAddress.val().trim();
        var errorText = '';
        textBoxes.forEach(function (textbox) { return textbox.borderValid(); });
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
        if (remotHostList.filter(function (host) { return host.name === label; }).length) {
            textLabel.borderInvalid();
            errorText = 'Label is duplicate';
        }
        if (errorText) {
            addError.text(errorText);
            return;
        }
        addError.text('Added');
        var hostInfo = {
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
        textBoxes.forEach(function (textbox) { return textbox.val(''); });
        addHostSocket.emit(hostInfo, function (isAdd) {
            getRemoteHostListSocket.emit(getHostListCallback);
        });
    });
    /**
     * select radio button event for disable brose button and text box
     */
    $(document)
        .on('change', '.auth_type_radio', function () {
        var isCheckedSshKey = sshKeyRadio.prop('checked');
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
        .onDirIconMouseup(function (directory) {
        inputText.val('');
    })
        .onDirIconDblClick(function (directory) {
        inputText.val('');
    })
        .onFileIconMouseup(function (filepath) {
        inputText.val(ClientUtility.basename(filepath));
    })
        .onFileIconDblClick(function (filepath) {
        sshKeyAddress.val(filepath);
        dialog.hide();
    })
        .onChangeAddress()
        .onClickCancel()
        .onClickOK(function () {
        var filepath = dialog.getLastSelectFilepath();
        var directory = dialog.getLastSelectDirectory();
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
        textBoxes.forEach(function (text) { return text.val(''); });
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
    function getHostListCallback(hostList) {
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
    function createHtml4RemoteHost(hostList) {
        var html = hostList.map(function (host) {
            if (host.username === undefined) {
                host.username = '';
            }
            var passwordHtml = '';
            if (!ClientUtility.isLocalHost(host.host)) {
                passwordHtml = "<input type=\"password\" class=\"text_box\" id=\"" + host.name + "_password\" autocomplete=\"off\">";
            }
            $(document).on('keyup', "#" + host.name + "_password", function (eventObject) {
                if (eventObject.which == 0x0D) {
                    testConnect($("#" + host.name + "_test_connect"));
                }
            });
            $(document).one('click', "#" + host.name + "_delete", function () {
                deleteHostSocket.emit(host.name, function (result) {
                    getRemoteHostListSocket.emit(getHostListCallback);
                    $(document).off('keyup', "#" + host.name + "_password");
                    $(document).off('click', '.test_connect_button, .ng_test_button');
                });
            });
            return "\n                <tr id=\"" + host.name + "\">\n                    <td class=\"hostlabel\">" + host.name + " : " + host.username + "@" + host.host + "</td>\n                    <td>" + passwordHtml + "</td>\n                    <td><button type=\"button\" class=\"test_connect_button button\" id=\"" + host.name + "_test_connect\">Test</button></td>\n                    <td><button type=\"button\" class=\"delete_button button\" id=\"" + host.name + "_delete\">Delete</button></td>\n                </tr>";
        });
        return html.join('');
    }
    /**
     *
     * @param button
     */
    function testConnect(button) {
        var TEST_OK = 'OK';
        var TEST_NG = 'NG';
        var TESTING = 'Now Testing';
        var label = button.parent().parent().id();
        var password = $("#" + label + "_password").val();
        button
            .text(TESTING)
            .prop('disabled', true)
            .class('testing_button button');
        sshConnectionSocket.emit(label, password, function (isConnect) {
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