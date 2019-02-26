import $ from 'jquery';
import 'jquery-ui/ui/widgets/sortable';
import 'jquery-contextmenu';
import 'jquery-ui/themes/base/theme.css';
import 'jquery-ui/themes/base/sortable.css';
import 'jquery-contextmenu/dist/jquery.contextMenu.css';
import '../css/home.css';
import FileBrowser from './fileBrowser';
import dialogWrapper from './dialogWrapper';
import showMessage from './showMessage';

$(() => {
    // socket io
    const socket = io('/home');
    socket.on('showMessage', showMessage);

    socket.emit('getProjectList', true);
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
        selector: '#projectList ul',
        itemClickEvent: 'click',
        items: {
            'open': {
                name: 'Open',
                callback: openProject
            },
            'rename': {
                name: 'Rename',
                callback: function () {
                    var id = $(this).data('id');
                    var path = $(this).data('path');
                    var html = '<p id="renameLabel">input new project name</p><input type="text" id="renamedProjectName">';
                    dialogWrapper('#dialogContext', html).done(function () {
                        var newName = $('#renamedProjectName').val();
                        socket.emit('renameProject', { 'id': id, 'path': path, 'newName': newName });
                    });
                }
            },
            'delete': {
                name: 'Delete',
                callback: function () {
                    var targetID = $(this).data('id');
                    var html = '<p id="deleteLabel">Delete project</p><div id="deleteMessage">Are you sure to delete project?</div>';
                    dialogWrapper('#dialogContext', html).done(function () {
                        socket.emit('removeProject', targetID);
                    });
                }
            }
        }
    });

    // setup project list UI
    $('#projectList').sortable({
        update: (e, ui) => {
            socket.emit('reorderProject', $('#projectList').sortable('toArray', { attribute: 'data-index' }));
        }
    });
    $('#projectList').disableSelection();
    socket.on('projectList', (data) => {
        $('#projectList').empty();
        data.forEach(function (pj, i) {
            let pjPath = pj.path;
            let deleteWord = "\\" + pj.name + ".wheel\\swf.prj.json";
            let displayPjPath = pjPath.replace(deleteWord, "");

            $('#projectList').append(`<ul class="project" data-path="${pj.path}" data-id="${pj.id}" data-name="${pj.name}" data-index="${i}">
            <li class="projectName" id="prj_${pj.name}">${pj.name}</li>
            <li class="projectDescription">${pj.description}</li>
            <li class="projectPath">${displayPjPath}</li>
            <li class="projectCreateDay">${pj.ctime}</li>
            <li class="projectUpdateDay">${pj.mtime}</li>
            <li class="projectState">${pj.state}</li></ul>`);
        });

        // db click event
        $('#projectList ul').dblclick(openProject);
    });
    const fb = new FileBrowser(socket, '#fileList', 'fileList');

    let dialogOptions;
    // register btn click event listeners
    $('#newButton').on("click", (event) => {
        dialogOptions = {
            height: $(window).height() * 0.9,
            width: $(window).width() * 0.6
        };
        var html = '<p id="path"></p><ul id="fileList"></ul>'
            + '<div id="nameTextbox"><label id="projectNameLabel">New project name</label><input type="text" id="newProjectName"></div >'
            + '<div id="descriptionTextbox"><label id="projectDescriptionLabel">Description</label><input type="text" id="description" placeholder="This is new project." ></div>';
        dialogWrapper('#dialog', html, dialogOptions).done(function () {
            var label = $('#newProjectName').val();
            var description = $('#description').val();
            if (description === "") description = null;
            if (label) {
                socket.emit('addProject', fb.getRequestedPath() + '/' + label, description);
            } else {
                console.log('illegal label: ', label);
            }
        });
        $('#fileList').empty();
        fb.resetOnClickEvents();
        fb.onRecv(function () {
            $('#path').text(fb.getRequestedPath());
        });
        fb.request('getDirList', null, null);
    });

    $('#importButton').on("click", (event) => {
        dialogOptions = {
            height: $(window).height() * 0.9,
            width: $(window).width() * 0.6
        };
        var html = '<p id="path"></p><ul id="fileList"></ul>';
        dialogWrapper('#dialog', html, dialogOptions).done(function () {
            socket.emit('importProject', fb.getRequestedPath() + '/' + fb.getLastClicked());
        });
        $('#fileList').empty();
        fb.resetOnClickEvents();
        fb.onRecv(function () {
            $('#path').text(fb.getRequestedPath());
        });
        fb.onFileDblClick(function (target) {
            $('#dialog').dialog('close');
            socket.emit('importProject', target);
        });
        fb.request('getDirListAndProjectJson', null, null);
    });

    //管理者設定画面へのドロワー
    $('#drawerButton').click(function () {
        $('#drawerMenu').toggleClass('action', true);
    });

    $('#drawerMenu').mouseleave(function () {
        $('#drawerMenu').toggleClass('action', false);
    });

    var pos = $("#titleUserName").offset();
    $("#userImg").css('right', window.innerWidth - pos.left + "px");
});
