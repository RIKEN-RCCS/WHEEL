$(() => {
    // socket io
    const socket = io('/home');

    var resetScreen=function(){
      $('#normal').show();
      $('#dialogue').hide();
      $('#path').empty();
      $('#newProjectName').val('');
    }
    var showFileDialogue=function(){
      $('#fileList').empty();
      $('#normal').hide();
      $('#dialogue').show();
      $('#projectNameInputArea').hide();
    }


    //TODO 別のファイルへお引っ越し?
    var openProject=function(key, opt){
      var rootPath=$(this).data('path')
      console.log(rootPath);
      //project manager画面を呼び出すURLへアクセス
        $('<form/>', { action: '/swf/project_manager.html', method: 'post' })
            .append($('<input/>', { type: 'hidden', name: 'project', value: rootPath}))
            .appendTo(document.body)
            .submit();
    }
    var renameProject=function(key, opt){
      console.log('rename project! not implemented yet !!')
      //TODO ここでダイアログをポップアップさせてnewNameを受けとる
      var oldName=$(this).data('label');
      //socket.emit('rename', {"oldName": oldName, "newName": 'huga'});
    }
    var deleteProject=function(key, opt){
      socket.emit('remove', $(this).data('id'));
    }

    // register context Menu for projectList
    $.contextMenu({
      'selector': '#projectList li',
      'items': {
        'open':{
          name: 'Open',
          callback: openProject
        },
        'rename':{
          name: 'Rename',
          callback: renameProject
        },
        'delete':{
          name: 'Delete',
          callback: deleteProject
        }
      }
    });

    // setup project list UI
    $('#projectList').sortable({
    update: (e,ui)=>{
          socket.emit('reorder', $('#projectList').sortable('toArray'));
        }
    });
    $('#projectList').disableSelection();

    // project list
    socket.on('projectList', (data)=>{
      console.log(data);
      $('#projectList').empty();
      data.forEach(function(pj){
        $('#projectList').append(`<li class="ui-state-default" data-path="${pj.path}" data-id="${pj.id}" data-label="${pj.label}">${pj.label}</li>`);
      });
    });


    //file browser
    const fb=new FileBrowser(socket, '#fileList', 'fileList');
    fb.onFileDblClick(function(target){
        socket.emit('add',target);
        resetScreen();
    });

    // register btn click event listeners
    var eventName=null;
    $('#btnNew').on("click", (event)=>{
      showFileDialogue();
      $('#projectNameInputArea').show();
      eventName='new';
      fb.request(eventName, null);
    });
    $('#btnImport').on("click", (event)=>{
      showFileDialogue();
      eventName='import';
      fb.request(eventName, null);
    });
    $('#btnCancel').on("click", (event)=>{
      resetScreen();
    });
    $('#btnOK').on("click", (event)=>{
      if(eventName == 'import'){
        socket.emit('add',fb.getRequestedPath()+'/'+fb.getSelectedFile())
      }else if (eventName == 'new'){
        var label =$('#newProjectName').val();
        socket.emit('create',fb.getRequestedPath()+'/'+label)
      }
      resetScreen();
    });


});
