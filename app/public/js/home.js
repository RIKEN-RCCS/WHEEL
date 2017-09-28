$(() => {
    // socket io
    const socket = io('/home');
    // setup contextMenu
    var openProject = function (key, opt) {
        var rootPath = $(this).data('path');
        //project manager画面を呼び出すURLへアクセス
        $('<form/>', { action: '/workflow', method: 'post' })
            .append($('<input/>', { type: 'hidden', name: 'project', value: rootPath }))
            .appendTo(document.body)
            .submit();
    };
    $.contextMenu({
        'selector': '#projectList li',
        'items': {
            'open': {
                name: 'Open',
                callback: openProject
            },
            'rename': {
                name: 'Rename',
                callback: function () {
                    var oldName = $(this).data('label');
                    var html = '<p>input new project name</p><input type="text" id="renamedProjectName">';
                    dialogWrapper('#dialog', html).done(function () {
                        var newName = $('#renamedProjectName').val();
                        var obj = { 'oldName': oldName, 'newName': newName };
                        socket.emit('rename', JSON.stringify(obj));
                    });
                }
            },
            'delete': {
                name: 'Delete',
                callback: function () {
                    var targetID = $(this).data('id');
                    dialogWrapper('#dialog', 'Are you sure you want to delete project?').done(function () {
                        socket.emit('remove', targetID);
                    });
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
    socket.on('projectList', (data) => {
        $('#projectList').empty();
        data.forEach(function (pj) {
            $('#projectList').append(`<li class="ui-state-default" data-path="${pj.path}" data-id="${pj.id}" data-label="${pj.label}">${pj.label}</li>`);
        });
    });
    const fb = new FileBrowser(socket, '#fileList', 'fileList');
    const dialogOptions = {
        height: $(window).height() * 0.98,
        width: $(window).width() * 0.98
    };
    // register btn click event listeners
    $('#btnNew').on("click", (event) => {
        var html = '<p id="path"></p><ul id=fileList></ul><div>New project name<input type="text" id="newProjectName"></div>';
        dialogWrapper('#dialog', html, dialogOptions).done(function () {
            var label = $('#newProjectName').val();
            if (label) {
                socket.emit('create', fb.getRequestedPath() + '/' + label);
            }
            else {
                console.log('illegal label: ', label);
            }
        });
        $('#fileList').empty();
        fb.resetOnClickEvents();
        fb.onRecv(function () {
            $('#path').text(fb.getRequestedPath());
        });
        fb.request('new', null, null);
    });
    $('#btnImport').on("click", (event) => {
        var html = '<p id="path"></p><ul id=fileList></ul>';
        dialogWrapper('#dialog', html, dialogOptions).done(function () {
            socket.emit('add', fb.getRequestedPath() + '/' + fb.getLastClicked());
        });
        $('#fileList').empty();
        fb.resetOnClickEvents();
        fb.onRecv(function () {
            $('#path').text(fb.getRequestedPath());
        });
        fb.onFileDblClick(function (target) {
            socket.emit('add', target);
        });
        fb.request('import', null, null);
    });
});
//# sourceMappingURL=home_beta.js.map
