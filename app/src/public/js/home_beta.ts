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

    // setup contextMenu
    var openProject=function(key, opt){
      var rootPath=$(this).data('path')
      //project manager画面を呼び出すURLへアクセス
        $('<form/>', { action: '/swf/project_manager.html', method: 'post' })
            .append($('<input/>', { type: 'hidden', name: 'project', value: rootPath}))
            .appendTo(document.body)
            .submit();
    }
    var openProjectBeta=function(key, opt){
      var rootPath=$(this).data('path')
      //project manager画面を呼び出すURLへアクセス
        $('<form/>', { action: '/workflow', method: 'post' })
            .append($('<input/>', { type: 'hidden', name: 'project', value: rootPath}))
            .appendTo(document.body)
            .submit();
    }
    $.contextMenu({
      'selector': '#projectList li',
      'items': {
        'open':{
          name: 'Open',
          callback: openProject
        },
        'open(beta)':{
          name: 'Open beta version',
          callback: openProjectBeta
        },
        'rename':{
          name: 'Rename',
          callback: function (){
          var oldName=$(this).data('label');
          var html='<p>input new project name</p><input type="text" id="renamedProjectName">'
          dialogWrapper('#dialog', html).done(function(){
            var newName=$('#renamedProjectName').val();
            var obj={'oldName': oldName, 'newName': newName};
            socket.emit('rename', JSON.stringify(obj));
            }).fail(function(){
              console.log("btn canceled!");
            });
          }
        },
        'delete':{
          name: 'Delete',
          callback: function (){
            var targetID=$(this).data('id');
            dialogWrapper('#dialog', 'Are you sure you want to delete project?').done(function(){
              socket.emit('remove', targetID);
            }).fail(function(){
                console.log("btn canceled!");
            });
          }
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
      fb.request(eventName, null, null);
    });
    $('#btnImport').on("click", (event)=>{
      showFileDialogue();
      eventName='import';
      fb.request(eventName, null, null);
    });



    $('#btnCancel').on("click", (event)=>{
      resetScreen();
    });
    $('#btnOK').on("click", (event)=>{
      if(eventName == 'import'){
        socket.emit('add',fb.getRequestedPath()+'/'+fb.getLastClicked())
      }else if (eventName == 'new'){
        var label =$('#newProjectName').val();
        if(label){
          socket.emit('create',fb.getRequestedPath()+'/'+label)
        }else{
          console.log('illegal label: ', label);
        }
      }
      resetScreen();
    });


});
