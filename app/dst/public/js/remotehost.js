$(function () {
    // socket io
    var socket = io('/swf/remotehost');
    var getRemoteHostListSocket = new GetRemoteHostListSocket(socket);
    var sshConnectionSocket = new SshConnectionSocket(socket);
    var addHostSocket = new AddHostSocket(socket);
    var deleteHostSocket = new DeleteHostSocket(socket);
    var getFileListSocket = new GetFileListSocket(socket, '');
    // elements
    var hostTable = $('#host_table');
    var sshKeyRadio = $('#authtype_sshkey');
    var browseButton = $('#browse_button');
    var addHostButton = $('#add_host_button');
    var addError = $('#add_error_area');
    var inputText = $('#input_text_browse');
    var textLabel = $('#text_label');
    var textHost = $('#text_host');
    var textPath = $('#text_path');
    var textId = $('#text_id');
    var sshKeyAddress = $('#sshkey_address');
    var textBoxes = [textLabel, textHost, textPath, textId, sshKeyAddress];
    // romote host list
    var remotHostList = [];
    // file dialog
    var dialog = new FileDialog(getFileListSocket);
    // connect flag to server
    var isConnect = false;
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
        browseButton.on('click', function () {
            dialog.updateDialog();
            dialog.show();
        });
    }
    /**
     * set button click event to add host information
     */
    function setClickEventForAddButton() {
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
                description: ''
            };
            if (isCheckedSshKey) {
                hostInfo.privateKey = sshkey;
            }
            textBoxes.forEach(function (textbox) { return textbox.val(''); });
            addHostSocket.emit(hostInfo, function (isAdd) {
                getHostList();
            });
        });
    }
    /**
     * set several events for host list
     */
    function setHostListEvents() {
        $(document).on('change', '.auth_type_radio', function () {
            var isCheckedSshKey = sshKeyRadio.prop('checked');
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
            getRemoteHostListSocket.onConnect(function (hostlist) {
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
        textBoxes.forEach(function (text) { return text.val(''); });
    }
    /**
     * create html content
     * @param hostList registerd host list
     * @return html string
     */
    function createHtmlContent(hostList) {
        initTestConnectEnvet();
        var html = hostList.map(function (host) {
            if (host.username === undefined) {
                host.username = '';
            }
            var passwordHtml = '';
            if (!ClientUtility.isLocalHost(host)) {
                passwordHtml = "<input type=\"password\" class=\"text_box\" id=\"" + host.name + "_password\" autocomplete=\"off\">";
            }
            setTestConnectEnvet(host);
            return "\n                <tr id=\"" + host.name + "\">\n                    <td class=\"hostlabel\">" + host.name + " : " + host.username + "@" + host.host + "</td>\n                    <td>" + passwordHtml + "</td>\n                    <td><button type=\"button\" class=\"test_connect_button button\" id=\"" + host.name + "_test_connect\">Test</button></td>\n                    <td><button type=\"button\" class=\"delete_button button\" id=\"" + host.name + "_delete\">Delete</button></td>\n                </tr>";
        });
        return html.join('');
    }
    /**
     * init test connect event
     */
    function initTestConnectEnvet() {
        remotHostList.forEach(function (remote) {
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
        var ENTER_KEY = 0x0D;
        var keyPressed = false;
        $(document).on('keypress', "#" + host.name + "_password", function (eventObject) {
            keyPressed = true;
        });
        $(document).on('keyup', "#" + host.name + "_password", function (eventObject) {
            if (eventObject.which === ENTER_KEY) {
                runConnect($("#" + host.name + "_test_connect"));
            }
            keyPressed = false;
        });
        $(document).on('click', "#" + host.name + "_test_connect", function () {
            runConnect($(this));
        });
        $(document).one('click', "#" + host.name + "_delete", function () {
            deleteHostSocket.emit(host.name, function (result) {
                getHostList();
            });
        });
    }
    /**
     * run connect to host
     * @param button cliced button element
     */
    function runConnect(button) {
        var TEST_OK = 'OK';
        var TEST_NG = 'NG';
        var TESTING = 'Now Testing';
        var label = button.parent().parent().id();
        var password = $("#" + label + "_password").val();
        button
            .text(TESTING)
            .prop('disabled', true)
            .class('disable_button button');
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