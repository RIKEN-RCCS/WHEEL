import $ from 'jquery';
import 'jquery-ui/sortable';
import 'jquery-contextmenu';

import 'jquery-ui-css/all.css';
import 'jquery-contextmenu/dist/jquery.contextMenu.css';

import Cookies from 'js-cookie';
import SVG from 'svgjs/dist/svg.js';
import 'svg.draggable.js/dist/svg.draggable.js';

import FileBrowser from  './fileBrowser';
import dialogWrapper from './dialogWrapper';
import logReciever from './logReciever';
import config from './config';
import SvgNodeUI from './svgNodeUI';
import Nodes from './svgNodeCollection';
import createPropertyHtml from './createProperty';

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
  $('#property').hide();

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
  const nodes = new Nodes();

  const svg = SVG('node_svg');
  sio.on('connect', function () {
    fb.request('fileListRequest', cwd, null);
    $('#path').text('root');
    sio.emit('workflowRequest', rootWorkflow);

    sio.on('workflow', function(wf){
      nodes.removeAll();
      wf.nodes.forEach(function(v,i){
        if(v!==null){
          let node=new SvgNodeUI(svg, v, createLink, createFileLink);
          let diffX=0;
          let diffY=0;
          node.onMousedown(function(e){
            let nodeIndex=e.target.instance.parent('.node').data('index');
            nodes.setSelectedNode(nodeIndex);
            let nodePath = cwd+'/'+wf.nodes[nodeIndex].path;
              console.log(wf.nodes[nodeIndex]);
            fb.request('fileListRequest', nodePath, null);
            let name = wf.nodes[nodeIndex].name;
            $('#path').text(name);
            //TODO propertyを更新するような処理をした後で再度property画面を書き換える
            $('#property').html(createPropertyHtml(v));
            $('#inputFilesAddBtn').on('click',function(){
              let inputVal=$('#inputFilesInputField').val();
              if(isDupulicated(v.inputFiles, inputVal)) return;
              let newVal={name: inputVal, srcNode: null, srcName: null}
              sio.emit('updateNode', {index: i, property: 'inputFiles', value: newVal, cmd: 'add'});
            });
            $('#outputFilesAddBtn').on('click',function(){
              let inputVal=$('#outputFilesInputField').val();
              if(isDupulicated(v.outputFiles, inputVal)) return;
              let newVal={name: inputVal, dstNode: null, dstName: null}
              sio.emit('updateNode', {index: i, property: 'outputFiles', value: newVal, cmd: 'add'});
            });
            $('.inputFilesDelBtn').on('click',function(btnEvent){
              let index=btnEvent.target.value;
              let val=v.inputFiles[index]
              sio.emit('updateNode', {index: i, property: 'inputFiles', value: val, cmd: 'del'});
            });
            $('.outputFilesDelBtn').on('click',function(btnEvent){
              let index=btnEvent.target.value;
              let val=v.outputFiles[index]
              sio.emit('updateNode', {index: i, property: 'outputFiles', value: val, cmd: 'del'});
            });
            $('#property').show().animate({width: '350px', 'min-width': '350px'}, 100);
          })
          .onDragstart(function(e){
            diffX=e.detail.p.x - e.target.instance.select('.box').first().x();
            diffY=e.detail.p.y - e.target.instance.select('.box').first().y()
          })
          .onDragmove(function(e){
            //TODO 各plugの座標を取得する
            console.log(e);

            //TODO lower/upper/connector/receptorから出ているケーブルのリストを順に回ってアップデートする
            node.nextLinks.forEach(function(e,i){
            });
            node.elseLinks.forEach(function(e,i){
            });
            node.previousLinks.forEach(function(e,i){
            });
            node.outputFileLinks.forEach(function(e,i){
            });
            node.inputFileLinks.forEach(function(e,i){
            });
          })
          .onDragend(function(e){
            let x = e.detail.p.x - diffX;
            let y = e.detail.p.y - diffY;
            sio.emit('updateNode', {index: i, property: 'pos', value: {'x': x, 'y': y}, cmd: 'update'});
          });
          nodes.add(node);
        //TODO cableを作成(src to nextとoutpufFile to inputFile)

        //TODO 作成したcableを前後のnodeのコンテナ(nextLinks, elseLinks, previousLinks, outputFileLinks, inputFileLinks)へpush
        }
      });
    });
    //TODO property画面で入力されたデータの送信処理をどこかに入れる必要あり

    //TODO project 進行状況の受信
  });

  // setup file uploader
  const uploader = new SocketIOFileUpload(sio);
  uploader.listenOnDrop(document.getElementById('fileBrowser'));
  uploader.listenOnInput(document.getElementById('fileSelector'));

  //setup log reciever
  logReciever(sio);

  // show or hide log area
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
           "while":   {name: "while"},
           "foreach": {name: "foreach"}
         }
      },
      "delete": {
        "name": "delete",
        callback: function(){
          sio.emit('removeNode', nodes.getSelectedNode());
        }
      }
    }
  });


  // function definition
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
  function getClickPosition(option) {
    const parentOffset = $(option.selector).offset();
    const clickPosition = option.$menu.position();
    const position = {
      x: Math.round(clickPosition.left - parentOffset.left),
      y: Math.round(clickPosition.top - parentOffset.top)
    };
    return position;
  }
  /**
   * check if filename is already in inputFiles or outputFiles
   * @param files inputFiles or outputFiles of any workflow component
   * @param filename testee
   */
  function isDupulicated(files, filename){
    return -1 !== files.findIndex(function(v){
      return v.name === filename;
    });
  }

  /**
   * call addLink API
   */
  function createLink(srcNode, dstNode, isElse=false){
    sio.emit('addLink', {src: srcNode, dst: dstNode, isElse: isElse});
  }

  /**
   * call addFileLink API
   */
  function createFileLink(srcNode, dstNode, srcName, dstName){
    sio.emit('addFileLink', {src: srcNode, dst: dstNode, srcName: srcName, dstName: dstName});
  }
});
