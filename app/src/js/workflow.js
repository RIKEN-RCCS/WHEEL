import $ from 'jquery';
import 'jquery-ui/ui/widgets/sortable';
import 'jquery-contextmenu';

import 'jquery-ui/themes/base/theme.css';
import 'jquery-ui/themes/base/sortable.css';
import 'jquery-contextmenu/dist/jquery.contextMenu.css';

import Vue from 'vue/dist/vue.esm.js';
import Cookies from 'js-cookie';
import SVG from 'svgjs/dist/svg.js';
import 'svg.draggable.js/dist/svg.draggable.js';

import '../css/pure-drawer.min-1.0.2.css';
import '../css/workflow.css';

import FileBrowser from  './fileBrowser';
import dialogWrapper from './dialogWrapper';
import logReciever from './logReciever';
import config from './config';
import SvgNodeUI from './svgNodeUI';

$(() => {
  // chek project Json file path
  const projectFilePath = Cookies.get('project');
  if (projectFilePath == null) {
    throw new Error('illegal access');
  }
  let rootWorkflow=Cookies.get('root');
  let rootDir=Cookies.get('rootDir');
  let cwf=rootWorkflow;
  let cwd=rootDir;
  let dirStack=[];

  // create vue.js instance for property subscreen
  let vm = new Vue({
    el: '#property',
    data: {
      node: {},
      newInputFilename: "",
      newOutputFilename: "",
      newIndexOfForeach: "",
      names: []
    },
    methods:{
      addInputFile: function(){
        let filename=this.newInputFilename;
        if(filename === "") return
        let duplicate = this.node.inputFiles.some((e)=>{
          return e.name === filename;
        });
        if(duplicate) return
        this.newInputFilename="";
        let newVal={name: filename, srcNode: null, srcName: null}
        sio.emit('updateNode', {index: this.node.index, property: 'inputFiles', value: newVal, cmd: 'add'});
      },
      addOutputFile: function(){
        let filename=this.newOutputFilename;
        if(filename === "") return
        let duplicate = this.node.outputFiles.some((e)=>{
          return e.name === filename;
        });
        if(duplicate) return
        this.newOutputFilename="";
        let newVal={name: filename, dst: []}
        sio.emit('updateNode', {index: this.node.index, property: 'outputFiles', value: newVal, cmd: 'add'});
      },
      addIndexOfForeach: function(){
        let val =this.newIndexOfForeach;
        if(val === "") return
        let duplicate = this.node.indexList.some((e)=>{
          return e.label === val;
        });
        if(duplicate) return
        this.newIndexOfForeach="";
        let newVal = {label: val};
        sio.emit('updateNode', {index: this.node.index, property: 'indexList', value: newVal, cmd: 'add'});
      },
      delInputFile: function(i){
        let val=this.node.inputFiles[i]
        sio.emit('updateNode', {index: this.node.index, property: 'inputFiles', value: val, cmd: 'del'});
      },
      delOutputFile: function(i){
        let val=this.node.outputFiles[i]
        sio.emit('updateNode', {index: this.node.index, property: 'outputFiles', value: val, cmd: 'del'});
      },
      delIndexOfForeach: function(i){
        let val=this.node.indexList[i]
        sio.emit('updateNode', {index: this.node.index, property: 'indexList', value: val, cmd: 'del'});
      },
      updateNodeName: function(){
        let val=this.node.name;
        let dup = this.names.some((name)=>{
          return name === val;
        })
        if(! dup){
          sio.emit('updateNode', {index: this.node.index, property: 'name', value: this.node.name, cmd: 'update'});
        }else{
          console.log('duplicated name is not allowd!');
        }
      },
      updateProperty: function(property, arrayFlag){
        let val=this.node[property];
        let cmd = arrayFlag ? 'updataArrayProperty': 'update';
        sio.emit('updateNode', {index: this.node.index, property: property, value: val, cmd: cmd});
      }
    }
  });

  // set default view
  $('.project_manage_area').hide();
  $('#graphView').prop('checked', true);
  $('#log_area').hide();
  $('#property').hide();
  $('#parentDirBtn').hide();
  $('#pause_menu').hide();
  $('#clean_menu').hide();
  $('#stop_menu').hide();

  // setup socket.io client
  const sio = io('/workflow');

  // setup FileBrowser
  const fb = new FileBrowser(sio, '#fileList', 'fileList', true, {
    'edit': {
      name: 'edit',
      callback: function() {
        const path = $(this).data('path');
        const filename = $(this).data('name');
        const params= $.param({
          "path": path,
          "filename": filename,
          "pm": false
        });
        window.open(`/editor?${params}`);
      }
    },
    'edit for parameter survey': {
      name: 'edit for PS',
      callback: function() {
        const path = $(this).data('path');
        const filename = $(this).data('name');
        const params= $.param({
          "path": path,
          "filename": filename,
          "pm": true
        });
        window.open(`/editor?${params}`);
      }
    }
  });

  // set "go to parent dir" button behavior
  $('#parentDirBtn').on('click',function(){
    let tmp=dirStack.pop();
    cwd=tmp.dir;
    cwf=tmp.wf;
    if(cwd !== rootDir){
      $('#parentDirBtn').show();
    }else{
      $('#parentDirBtn').hide();
    }
    fb.request('fileListRequest', cwd, null);
    sio.emit('workflowRequest', cwf);
  });


  // container of svg elements
  let nodes = [];
  let selectedNode=0;

  const svg = SVG('node_svg');
  sio.on('connect', function () {
    fb.request('fileListRequest', cwd, null);
    sio.emit('workflowRequest', cwf);
    sio.on('workflow', function(wf){
      $('#path').text(wf.path);
      // remove all node from workflow editor
      nodes.forEach(function(v){
        if(v !== null) v.remove();
      });
      nodes=[];
      if(wf.nodes.length > 0){
        let names=wf.nodes.map((e)=>{
          return e != null? e.name : null;
        });
        vm.names=names;
        vm.node=wf.nodes[selectedNode];
      }
      drawNodes(wf.nodes);
      drawLinks(nodes);
    });

    sio.on('projectState', (state)=>{
      if(state === 'running'){
        $('#run_menu').hide();
        $('#pause_menu').show();
        $('#clean_menu').show();
        $('#stop_menu').show();
      }else if(state === 'paused'){
        $('#run_menu').show();
        $('#pause_menu').hide();
        $('#clean_menu').show();
        $('#stop_menu').show();
      }else if(state === 'finished'){
        $('#run_menu').hide();
        $('#pause_menu').hide();
        $('#clean_menu').show();
        $('#stop_menu').hide();
      }else{
        $('#run_menu').show();
        $('#pause_menu').hide();
        $('#clean_menu').hide();
        $('#stop_menu').hide();
      }
    });

    //setup log reciever
    logReciever(sio);

    // register btn click event listeners
    $('#run_menu').on('click',function(){
      sio.emit('runProject', true);
    });
    $('#pause_menu').on('click',function(){
      sio.emit('pauseProject', true);
    });
    $('#clean_menu').on('click',function(){
      sio.emit('cleanProject', true);
    });
    $('#stop_menu').on('click',function(){
      sio.emit('stopProject', true);
    });
  });

  // hide property and select parent WF if background is clicked
  $('#node_svg').on('mousedown', function(){
    fb.request('fileListRequest', cwd, null);
    $('#property').hide();
  });

  // setup file uploader
  const uploader = new SocketIOFileUpload(sio);
  uploader.listenOnDrop(document.getElementById('fileBrowser'));
  uploader.listenOnInput(document.getElementById('fileSelector'));


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
          sio.emit('removeNode', selectedNode);
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
  }

  var hideLog = function () {
    var currentHeight = $('.sub_content_area').innerHeight();
    var logHeight = $('#log_area').outerHeight(true);
    $('.sub_content_area').innerHeight(currentHeight + logHeight);
    $('#log_area').hide();
  }

  /**
   * get mouse positoin where contextmenu is created
   * @param option second argument of callback function of jquery.contextMenu
   */
  var getClickPosition = function(option) {
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
  var isDupulicated = function(files, filename){
    return -1 !== files.findIndex(function(v){
      return v.name === filename;
    });
  }

  /**
   * draw nodes
   * @param nodeInWF node list in workflow Json
   */
  var drawNodes=function(nodesInWF){
      nodesInWF.forEach(function(v,i){
        // workflow内のnodeとSVG要素のnodeのindexが一致するようにnullで消されている時もnodesの要素は作成する
        if(v ===null){
          nodes.push(null);
        }else{
          let node=new SvgNodeUI(svg, sio, v);
          node.onMousedown(function(e){
            let nodeIndex=e.target.instance.parent('.node').data('index');
            selectedNode=nodeIndex;
            let nodePath = cwd+'/'+nodesInWF[nodeIndex].path;
            fb.request('fileListRequest', nodePath, null);
            let name = nodesInWF[nodeIndex].name;
            vm.node=v;
            $('#path').text(name);
            $('#property').show().animate({width: '350px', 'min-width': '350px'}, 100);
          })
          .onDblclick(function(e){
            let nodeType=e.target.instance.parent('.node').data('type');
            if(nodeType === 'workflow' ||nodeType === 'parameterStudy' || nodeType === 'for' || nodeType === 'while' || nodeType === 'foreach'){
              let path=e.target.instance.parent('.node').data('path');
              let json=e.target.instance.parent('.node').data('jsonFile');
              dirStack.push({dir: cwd, wf: cwf});
              cwd=cwd+'/'+path;
              cwf=cwd+'/'+json
              fb.request('fileListRequest', cwd, null);
              sio.emit('workflowRequest', cwf);
              if(cwd !== rootDir){
                $('#parentDirBtn').show();
              }else{
                $('#parentDirBtn').hide();
              }
            }
          });
          nodes.push(node);
        }
      });
  }
  /**
   * draw cables between Lower and Upper plug Connector and Receptor plug respectively
   * @param nodeInWF node list in workflow Json
   */
  var drawLinks=function(nodes){
    nodes.forEach(function(node){
      if(node != null){
        node.drawLinks();
      }
    });
    nodes.forEach(function(node){
      if(node != null){
        node.nextLinks.forEach(function(cable){
          let dst = cable.cable.data('dst');
          nodes[dst].previousLinks.push(cable);
        });
        node.elseLinks.forEach(function(cable){
          let dst = cable.cable.data('dst');
          nodes[dst].previousLinks.push(cable);
        });
        node.outputFileLinks.forEach(function(cable){
          let dst = cable.cable.data('dst');
          nodes[dst].inputFileLinks.push(cable);
        });
      }
    });
  }
});
