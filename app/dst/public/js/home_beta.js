$(() => {
    // socket io
    const socket = io('/home');
    var resetScreen = function () {
        $('#normal').show();
        $('#dialogue').hide();
        $('#path').empty();
        $('#newProjectName').val('');
    };
    var showFileDialogue = function () {
        $('#fileList').empty();
        $('#normal').hide();
        $('#dialogue').show();
        $('#projectNameInputArea').hide();
    };
    var openProject = function (key, opt) {
        var rootPath = $(this).data('path');
        //project manager画面を呼び出すURLへアクセス
        $('<form/>', { action: '/swf/project_manager.html', method: 'post' })
            .append($('<input/>', { type: 'hidden', name: 'project', value: rootPath }))
            .appendTo(document.body)
            .submit();
    };
    var openProjectBeta = function (key, opt) {
        var rootPath = $(this).data('path');
        //project manager画面を呼び出すURLへアクセス
        $('<form/>', { action: '/workflow', method: 'post' })
            .append($('<input/>', { type: 'hidden', name: 'project', value: rootPath }))
            .appendTo(document.body)
            .submit();
    };
    // setup dialog
    $('#renameDialog').dialog({
        autoOpen: false,
        draggable: false,
        modal: true,
        title: "new name",
        buttons: {
            "OK": function (event) {
                var oldName = $('#renameDialog').attr('data-oldName');
                var newName = $('#renamedProjectName').val();
                var obj = { 'oldName': oldName, 'newName': newName };
                socket.emit('rename', JSON.stringify(obj));
                $(this).dialog('close');
            }
        }
    });
    $('#removeDialog').dialog({
        autoOpen: false,
        draggable: false,
        modal: true,
        buttons: {
            "OK": function (event) {
                var targetID = $('#removeDialog').attr('data-targetId');
                socket.emit('remove', targetID);
                $(this).dialog('close');
            },
            "Cancel": function (event) {
                $(this).dialog('close');
            }
        }
    });
    // setup contextMenu
    $.contextMenu({
        'selector': '#projectList li',
        'items': {
            'open': {
                name: 'Open',
                callback: openProject
            },
            'open(beta)': {
                name: 'Open beta version',
                callback: openProjectBeta
            },
            'rename': {
                name: 'Rename',
                callback: function () {
                    var oldName = $(this).data('label');
                    $('#renameDialog').attr('data-oldName', oldName);
                    $('#renameDialog').dialog('open');
                }
            },
            'delete': {
                name: 'Delete',
                callback: function () {
                    var targetID = $(this).data('id');
                    $('#removeDialog').attr('data-targetId', targetID);
                    $('#removeDialog').dialog('open');
                }
            }
        }
    });
    // setup project list UI
    $('#projectList').sortable({
        update: (e, ui) => {
            socket.emit('reorder', $('#projectList').sortable('toArray'));
        }
    });
    $('#projectList').disableSelection();
    // project list
    socket.on('projectList', (data) => {
        $('#projectList').empty();
        data.forEach(function (pj) {
            $('#projectList').append(`<li class="ui-state-default" data-path="${pj.path}" data-id="${pj.id}" data-label="${pj.label}">${pj.label}</li>`);
        });
    });
    //file browser
    const fb = new FileBrowser(socket, '#fileList', 'fileList');
    fb.onFileDblClick(function (target) {
        socket.emit('add', target);
        resetScreen();
    });
    // register btn click event listeners
    var eventName = null;
    $('#btnNew').on("click", (event) => {
        showFileDialogue();
        $('#projectNameInputArea').show();
        eventName = 'new';
        fb.request(eventName, null);
    });
    $('#btnImport').on("click", (event) => {
        showFileDialogue();
        eventName = 'import';
        fb.request(eventName, null);
    });
    $('#btnCancel').on("click", (event) => {
        resetScreen();
    });
    $('#btnOK').on("click", (event) => {
        if (eventName == 'import') {
            socket.emit('add', fb.getRequestedPath() + '/' + fb.getSelectedFile());
        }
        else if (eventName == 'new') {
            var label = $('#newProjectName').val();
            if (label) {
                socket.emit('create', fb.getRequestedPath() + '/' + label);
            }
            else {
                console.log('illegal label: ', label);
            }
        }
        resetScreen();
    });
});
//# sourceMappingURL=home_beta.js.map