var $ = require('jquery');
require('jquery-ui/sortable');
require('jquery-contextmenu');

require('jquery-ui-css/all.css');
require('jquery-contextmenu/dist/jquery.contextMenu.css')

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

  // set default view
  $('.project_manage_area').hide();
  $('#graphView').prop('checked', true);
  $('#log_area').hide();


  // setup socket.io client
  const sioWF = io('/swf/workflow');
  const sioPJ = io('/swf/project');

  // setup FileBrowser
  const fb = new FileBrowser(sioWF, '#fileList', 'fileList', true);
  sioWF.on('connect', function () {
    //TODO project Jsonファイルのpathではなく表示するworkflowのpathを投げる
    fb.request('fileListRequest', projectFilePath, null);


    //TODO workflow graphの受信と描画

    //TODO project 進行状況の受信
  });

  // setup file uploader
  const uploader = new SocketIOFileUpload(sioWF);
  uploader.listenOnDrop(document.getElementById('fileBrowser'));
  uploader.listenOnInput(document.getElementById('fileSelector'));

  //setup log reciever
  logReciever(sioPJ);

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
      sioWF.emit('createNode', {"type": itemKey, "pos": pos});
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
          sioWF.emit('removeNode', selectedNode);
        }
      }
    }
  });

});
