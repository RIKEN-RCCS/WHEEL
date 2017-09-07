$(function () {
    // socket io
    var socket = io('/home');
    //サーバからのデータ受信時の処理
    socket.on('projectList', function (data) {
        if (!data.hasOwnProperty('label'))
            return;
        if (!data.hasOwnProperty('path'))
            return;
        $('#projectList').append("<li class=\"ui-state-default\" id = " + data.id + " ><span class=\"projectPath\">" + data.path + "</span>" + data.label + "</li>");
    });
    socket.on('files', function (data) {
        if (!data.hasOwnProperty('name'))
            return;
        if (!data.hasOwnProperty('type'))
            return;
        if (!(data.type in ['file', 'dir', 'linkToFile', 'linkToDir']))
            return;
    });
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
        update: function (e, ui) {
            socket.emit('reorder', $('#projectList').sortable('toArray'));
        }
    });
    $('#projectList').disableSelection();
    // btn click event
    $('#btnNew').on("click", function (event) {
        socket.emit('new', true);
        $('#normal').hide();
        $('#dialogue').show();
    });
    $('#btnImport').on("click", function (event) {
        socket.emit('import', true);
        $('#normal').hide();
        $('#dialogue').show();
    });
    $('#btnCancel').on("click", function (event) {
        $('#normal').show();
        $('#dialogue').hide();
    });
});
//# sourceMappingURL=home_beta.js.map