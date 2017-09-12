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
    //TODO 別のファイルへお引っ越し?
    var openProject = function (key, opt) {
        console.log('open project!');
        //how to get project path from span element
        console.log($(this).children('.projectPath').text());
    };
    var renameProject = function (key, opt) {
        console.log('rename project!');
    };
    var deleteProject = function (key, opt) {
        console.log('delete project!');
    };
    // register context Menu for projectList
    $.contextMenu({
        'selector': '#projectList li',
        'items': {
            'open': {
                name: 'Open',
                callback: openProject
            },
            'rename': {
                name: 'Rename',
                callback: renameProject
            },
            'delete': {
                name: 'Delete',
                callback: deleteProject
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
        console.log(data);
        $('#projectList').empty();
        data.forEach(function (pj) {
            $('#projectList').append(`<li class="ui-state-default" id = ${pj.id} ><span class="projectPath">${pj.path}</span>${pj.label}</li>`);
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
            socket.emit('create', fb.getRequestedPath() + '/' + label);
        }
        resetScreen();
    });
});
//# sourceMappingURL=home_beta.js.map