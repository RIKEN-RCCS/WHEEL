import $ from 'jquery';
import 'jquery-ui/sortable';
import 'jquery-contextmenu';

import 'jquery-ui-css/all.css';
import 'jquery-contextmenu/dist/jquery.contextMenu.css';

import Cookies from 'js-cookie';

import FileBrowser from  './fileBrowser';
import dialogWrapper from './dialogWrapper';
import logReciever from './logReciever';
import config from './config';


$(() => {
  // chek project Json file path
  const projectFilePath = Cookies.get('project');
  if (projectFilePath == null) {
    throw new Error('illegal access');
  }
  let rootWorkflow=Cookies.get('root');
  let cwd=Cookies.get('rootDir');

  // set default view
  $('.project_manage_area').hide();
  $('#graphView').prop('checked', true);
  $('#log_area').hide();

  // setup socket.io client
  const sio = io('/workflow');
  // setup FileBrowser
  const additionalMenu={
    'edit': {
      name: 'edit',
      callback: function() {
        var path = $(this).data('path');
        var filename = $(this).data('name');
        $('<form/>', { action: '/editor', method: 'get' })
          .append($('<input/>', { type: 'text', name: 'path',     value: path}))
          .append($('<input/>', { type: 'text', name: 'filename', value: filename}))
          .append($('<input/>', { name: 'pm', value: false}))
          .appendTo(document.body)
          .submit();
      }
    },
    'edit for parameter survey': {
      name: 'edit for PS',
      callback: function() {
        var path = $(this).data('path');
        var filename = $(this).data('name');
        $('<form/>', { action: '/editor', method: 'get' })
          .append($('<input/>', { name: 'path',     value: path}))
          .append($('<input/>', { name: 'filename', value: filename}))
          .append($('<input/>', { name: 'pm', value: true}))
          .appendTo(document.body)
          .submit();
      }
    }
  }
  const fb = new FileBrowser(sio, '#fileList', 'fileList', true, additionalMenu);
  sio.on('connect', function () {
    fb.request('fileListRequest', cwd, null);
    sio.emit('workflowRequest', rootWorkflow);

    sio.on('workflow', function(wf){
      console.log(wf);
    //workflow graphの描画処理
    });

    //TODO project 進行状況の受信
  });

  // setup file uploader
  const uploader = new SocketIOFileUpload(sio);
  uploader.listenOnDrop(document.getElementById('fileBrowser'));
  uploader.listenOnInput(document.getElementById('fileSelector'));

  //setup log reciever
  logReciever(sio);

  // show or hide log area
  var showLog = function () {
    var currentHeight = $('.sub_content_area').innerHeight();
    var logHeight = $('#log_area').outerHeight(true);
    $('.sub_content_area').innerHeight(currentHeight - logHeight);
    $('#log_area').show();
  };
  var hideLog = function () {
    var currentHeight = $('.sub_content_area').innerHeight();
    var logHeight = $('#log_area').outerHeight(true);
    $('.sub_content_area').innerHeight(currentHeight + logHeight);
    $('#log_area').hide();
  };
  $('#displayLog').change(function () {
    if ($('#displayLog').prop('checked')) {
      showLog();
    }
    else {
      hideLog();
    }
  });
  $('input[name=view]').change(function () {
    if ($('#listView').prop('checked')) {
      $('.project_manage_area').show();
    }
    else {
      $('.project_manage_area').hide();
    }
    if ($('#graphView').prop('checked')) {
      $('.workflow_manage_area').show();
    }
    else {
      $('.workflow_manage_area').hide();
    }
  });

  // setup context menu
  function getClickPosition(option) {
    const parentOffset = $(option.selector).offset();
    const clickPosition = option.$menu.position();
    const position = {
      x: Math.round(clickPosition.left - parentOffset.left),
      y: Math.round(clickPosition.top - parentOffset.top)
    };
    return position;
  }
  let selectedNode=null;
  $.contextMenu({
    selector: '#node_svg',
    autoHide: true,
    reposition: false,
    callback: function(itemKey, opt){
      var pos=getClickPosition(opt);
      sio.emit('createNode', {"type": itemKey, "pos": pos});
    },
    items: {
      "new": {
        "name": "new",
         "items":
         {
           "task":    {name: "task"},
           "workflow":{name: "workflow"},
           "PS":      {name: "parameter study"},
           "if":      {name: "if"},
           "for":     {name: "for"},
           "foreach": {name: "foreach"}
         }
      },
      "delete": {
        "name": "delete",
        callback: function(){
          sio.emit('removeNode', selectedNode);
        }
      }
    }
  });
});
