import $ from 'jquery';
import 'jquery-ui/ui/widgets/sortable';
import 'jquery-contextmenu';

import 'jquery-ui/themes/base/theme.css';
import 'jquery-ui/themes/base/sortable.css';
import 'jquery-contextmenu/dist/jquery.contextMenu.css';

import '../css/home.css';

import FileBrowser from  './fileBrowser';
import dialogWrapper from './dialogWrapper';

$(() => {
    // socket io
    const socket = io('/home');
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
        'selector': '#projectList ul',
        'items': {
            'open': {
                name: 'Open',
                callback: openProject
            },
            'rename': {
                name: 'Rename',
                callback: function () {
                    var id= $(this).data('id');
                    var path= $(this).data('path');
                    console.log(path);                    
                    var html = '<p>input new project name</p><input type="text" id="renamedProjectName">';
                    dialogWrapper('#dialog', html).done(function () {
                        var newName = $('#renamedProjectName').val();
                        socket.emit('renameProject', {'id': id, 'path': path, 'newName': newName });
                    });
                }
            },
            'delete': {
                name: 'Delete',
                callback: function () {
                    var targetID = $(this).data('id');
                    console.log(targetID);
                    dialogWrapper('#dialog', 'Are you sure you want to delete project?').done(function () {
                        socket.emit('removeProject', targetID);
                    });
                }
            }
        }
    });
    // setup project list UI
    $('#projectList').sortable({
        update: (e, ui) => {
            socket.emit('reorderProject', $('#projectList').sortable('toArray',{attribute: 'data-id'}));
        }
    });
    $('#projectList').disableSelection();
    socket.on('projectList', (data) => {
        $('#projectList').empty();
        data.forEach(function (pj) {
            $('#projectList').append(`<ul class="project" data-path="${pj.path}" data-id="${pj.id}" data-name="${pj.name}">
            <li class="projectName">${pj.name}</li>
            <li class="projectDescription">${pj.description}</li></ul>`);            
        });
    });
    const fb = new FileBrowser(socket, '#fileList', 'fileList');
    const dialogOptions = {
        height: $(window).height() * 0.98,
        width: $(window).width() * 0.98
    };
    // register btn click event listeners
    $('#newButton').on("click", (event) => {
        var html = '<p id="path"></p><ul id=fileList></ul><div>New project name<input type="text" id="newProjectName"></div>';
        dialogWrapper('#dialog', html, dialogOptions).done(function () {
            var label = $('#newProjectName').val();
            if (label) {
                socket.emit('addProject', fb.getRequestedPath() + '/' + label);
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
        var html = '<p id="path"></p><ul id=fileList></ul>';
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
    $('#drawer_button').click(function () {
      $('#drawer_menu').toggleClass('action', true);
    });
    
    $('#drawer_menu').mouseleave(function () {
      $('#drawer_menu').toggleClass('action', false);
    });
});
