import $ from 'jquery';
import 'jquery-ui/ui/widgets/sortable';
import 'jquery-contextmenu';

import 'jquery-ui/themes/base/theme.css';
import 'jquery-ui/themes/base/sortable.css';
import 'jquery-contextmenu/dist/jquery.contextMenu.css';

import '../css/workflow.css';

import Vue from 'vue/dist/vue.esm.js';
import Cookies from 'js-cookie';
import SVG from 'svgjs/dist/svg.js';
import 'svg.draggable.js/dist/svg.draggable.js';

import FileBrowser from  './fileBrowser';
import dialogWrapper from './dialogWrapper';
import logReciever from './logReciever';
import config from './config';
import SvgNodeUI from './svgNodeUI';
import * as svgNode from './svgNodeUI';


$(() => {
  // chek project Json file path
  const projectFilePath = Cookies.get('project');
  if (projectFilePath == null) {
    throw new Error('illegal access');
  }
  let rootWorkflow = Cookies.get('root');
  let rootDir = Cookies.get('rootDir');
  let currentWorkFlow = rootWorkflow;
  let currentWorkDir = rootDir;
  let currentNode = '';
  let nodeStack = [''];
  let dirStack = [rootDir];
  let wfStack = [rootWorkflow];
  let childrenViewBoxList = [];

  let projectLootDir = currentWorkDir;

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
        let val = this.newIndexOfForeach;
        if(val === "") return
        let duplicate = this.node.indexList.some((e)=>{
          return e.label === val;
        });
        if(duplicate) return
        this.newIndexOfForeach = "";
        let newVal = {label: val};
        sio.emit('updateNode', {index: this.node.index, property: 'indexList', value: newVal, cmd: 'add'});
      },
      delInputFile: function(i){
        let val = this.node.inputFiles[i]
        sio.emit('updateNode', {index: this.node.index, property: 'inputFiles', value: val, cmd: 'del'});
      },
      delOutputFile: function(i){
        let val = this.node.outputFiles[i]
        sio.emit('updateNode', {index: this.node.index, property: 'outputFiles', value: val, cmd: 'del'});
      },
      delIndexOfForeach: function(i){
        let val = this.node.indexList[i]
        sio.emit('updateNode', {index: this.node.index, property: 'indexList', value: val, cmd: 'del'});
      },
      updateNodeName: function(){
        let val = this.node.name;
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
  $('#project_manage_area').hide();
  $('#graphView').prop('checked', true);
  $('#log_area').hide();
  $('#property').hide();
  $('#parentDirBtn').hide();
  $('#taskLibraryMenu').hide();

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
    // TODO download 
    // ,'download file': {
    //   name: 'Download',
    //   callback: function() {
    //     const path = $(this).data('path');
    //     const filename = $(this).data('name');
    //     const message= {
    //       "path": path,
    //       "name": filename
    //     };
    //     sio.emit('download', message);
    //   }
    // }
  });

  // sio.on('download', (message) => {
  //   console.log(message.toString());
  // });

  // container of svg elements
  let nodes = [];
  let selectedNode=0;

  const svg = SVG('node_svg');
  sio.on('connect', function () {
    fb.request('getFileList', currentWorkDir, null);
    sio.emit('getWorkflow', currentWorkFlow);

    //一先ずここでemitしとく
    sio.emit('getProjectJson', rootWorkflow);
    
    sio.on('workflow', function(wf){
      nodeStack[nodeStack.length - 1] = wf.name;

      updateBreadrumb();

      // remove all node from workflow editor
      nodes.forEach(function(v){
        if (v !== null) v.remove();
      });
      nodes = [];
      if (wf.nodes.length > 0) {
        let names = wf.nodes.map((e) => {
          return e != null? e.name : null;
        });
        vm.names = names;
        vm.node = wf.nodes[selectedNode];
      }
      
      drawNodes(wf.nodes);
      drawLinks(nodes);
    });

    //子表示用として作成したが実装方法変更のため一時的にコメントアウト
/*     //children nodes view
    let childrenNodes = [];
    let selectedChildrenNodes = 0;    
    sio.on('nodes', function(wfForChildren){
      console.log("sio.on drawNodesNodes");      
      console.log(wfForChildren);
          
      childrenNodes.forEach(function(v){
        if (v !== null) v.remove();
      });
      childrenNodes = [];
      if (wfForChildren.nodes.length > 0) {
        let names = wfForChildren.nodes.map((e) => {
          return e != null? e.name : null;
        });
        vm.names = names;
        vm.node = wfForChildren.nodes[selectedChildrenNodes];
      }

      console.log("SVG-drawNodesNodes");      
      drawNodesNodes(wfForChildren.nodes);
    });

    sio.on('taskStateList', (taskStateList) => {
      updateTaskStateTable(taskStateList);
    }) */

    // TODO 現在のプロジェクト状態の取得をサーバにリクエストする
    sio.on('projectJson', (projectJson) => {

      $('#project_name').text(projectJson.name);
      $('#project_state').text(projectJson.state);
      // 仮で現在日時を表示
      let now = new Date();
      let date = '' + now.getFullYear() + '/' + now.getMonth() + '/' + now.getDate() + ' ' + now.getHours() + ':' + ('0' + now.getMinutes()).slice(-2);
      $('#project_create_date').text(projectJson.ctime);
      $('#project_update_date').text(projectJson.mtime);

    });

    sio.on('projectState', (state)=>{
      if (state === 'running') {
        $('#project_state').text('Running');

      } else if(state === 'paused') {
        $('#project_state').text('Paused');

      } else if (state === 'finished') {
        $('#project_state').text('Finished');

      } else {
        $('#project_state').text('Planning');
      }
    });

    //setup log reciever
    logReciever(sio);

    // register btn click event listeners
    $('#run_menu').on('click',function(){
      sio.emit('runProject', rootWorkflow);
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

    //save,revert
    $('#save_button').on('click',function(){
      //サーバー側未実装
      sio.emit('saveProject', null, (result) => {
        console.log(result);
      });
    });

    $('#revert_button').on('click',function(){
      //サーバー側未実装
      sio.emit('revertProject', null, (result) => {
        console.log(result);
      });
  　});

  });


  // hide property and select parent WF if background is clicked
  $('#node_svg').on('mousedown', function(){
    fb.request('getFileList', currentWorkDir, null);
    $('#property').hide();
  });

  // setup file uploader
  const uploader = new SocketIOFileUpload(sio);
  uploader.listenOnDrop(document.getElementById('fileBrowser'));  
  uploader.listenOnInput(document.getElementById('fileSelector'));


  // show or hide log area
  var isDisplayLog = false;
  $('#displayLogButton').click(function () {
    isDisplayLog = !isDisplayLog;
    if (isDisplayLog) {
      showLog();
    } else {
      hideLog();
    }
  });

  //ボタンでのviewの切り替え
  $('#listView').click(function () {
    $('#workflow_manage_area').hide();
    $('#project_manage_area').show();
    sio.emit('getTaskStateList', null);
  });
  $('#graphView').click(function () {
    $('#project_manage_area').hide();
    $('#workflow_manage_area').show();
    //sio.emit('getTaskStateList', null);
  }); 

  //ラジオボタンでのviewの切り替え
  $('input[name=view]').change(function () {
    if ($('#listView').prop('checked')) {
      $('#project_manage_area').show();
      sio.emit('getTaskStateList', null);
    }
    else {
      $('#project_manage_area').hide();
    }
    if ($('#graphView').prop('checked')) {
      $('#workflow_manage_area').show();
    }
    else {
      $('#workflow_manage_area').hide();
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

  //タスクのドラッグアンドドロップ操作
  $('#workflowComponents .type').mouseover(function () {      
    var target = $(this).attr("id");
    var objectDrag = document.getElementById(target); 
    var objectDrop = document.getElementById("node_svg");

    objectDrag.ondragstart = function(event){
      event.dataTransfer.setData("text", event.target.id);
    };

    objectDrop.ondragover = function(event){
      event.preventDefault();
    };

    objectDrop.ondrop = function(event){
      event.preventDefault();
      var objectName = event.dataTransfer.getData("text");
      var xCoordinate = event.offsetX;
      var yCoordinate = event.offsetY;
  
      const pos = {x: xCoordinate, y: yCoordinate};
      sio.emit('createNode', {"type": objectName, "pos": pos});    
    };
  });

  //タスクライブラリーの表示非表示
  // function definition
  function showTaskLibrary() {
    $('#taskLibraryButton').show().animate({left: '155px'},50);
    $('#taskLibraryMenu').show().animate({width: '155px', 'min-width': '155px'}, 50);
  }

  function hideTaskLibrary() {
    $('#taskLibraryButton').show().animate({left: '-=155px'},100);    
    $('#taskLibraryMenu').hide();
  }

  // show or hide log area
  var isDisplayLog = false;
  $('#taskLibraryButton').click(function () {
    isDisplayLog = !isDisplayLog;
    if (isDisplayLog) {
      showTaskLibrary();
    } else {
      hideTaskLibrary();
    }
  });

  // function definition
  function showLog() {
    $('#logArea').show();
    $('#displayLogButton').toggleClass('display', true);
  }

  function hideLog() {
    $('#logArea').hide();
    $('#displayLogButton').toggleClass('display', false);
  }

  /**
   * get mouse positoin where contextmenu is created
   * @param option second argument of callback function of jquery.contextMenu
   */
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
  function isDupulicated(files, filename) {
    return -1 !== files.findIndex(function(v){
      return v.name === filename;
    });
  }

  /**
   * draw nodes
   * @param nodeInWF node list in workflow Json
   */
  function drawNodes(nodesInWF) {
      nodesInWF.forEach(function(v,i){
        // workflow内のnodeとSVG要素のnodeのindexが一致するようにnullで消されている時もnodesの要素は作成する
        if(v === null){
          nodes.push(null);
          childrenViewBoxList.push(null);
        }else{
          let node=new SvgNodeUI(svg, sio, v);

          let childrenWorkflow = currentWorkDir+'/'+v.name+'/'+v.jsonFile;
          if(v.type === 'workflow' || v.type === 'parameterStudy' || v.type === 'for' || v.type === 'while' || v.type === 'foreach'){
            sio.emit('getNodes', childrenWorkflow);
          }
          childrenViewBoxList.push(svg);

          node.onMousedown(function(e){
            let nodeIndex=e.target.instance.parent('.node').data('index');           
            selectedNode=nodeIndex;
            let name = nodesInWF[nodeIndex].name;         
            let nodePath = currentWorkDir+'/'+nodesInWF[nodeIndex].name;
            //ファイルブラウザ用
            fb.request('getFileList', nodePath, null);

            //プロパティ表示用相対パス
            let currentPropertyDir = "."+currentWorkDir.replace(projectLootDir,"")+"/"+nodesInWF[nodeIndex].name;
            let nodeType = nodesInWF[nodeIndex].type;
            vm.node=v;
            $('#componentPath').html(currentPropertyDir);
            $('#property').show().animate({width: '360px', 'min-width': '360px'}, 100);
          })
          .onDblclick(function(e){
            let nodeType=e.target.instance.parent('.node').data('type');
            if(nodeType === 'workflow' ||nodeType === 'parameterStudy' || nodeType === 'for' || nodeType === 'while' || nodeType === 'foreach'){
              let nodeIndex=e.target.instance.parent('.node').data('index');
              let name = nodesInWF[nodeIndex].name;
              let path=e.target.instance.parent('.node').data('path');
              let json=e.target.instance.parent('.node').data('jsonFile');
              currentWorkDir=currentWorkDir+'/'+name;
              currentWorkFlow=currentWorkDir+'/'+json;
              //dirStack.push({dir: currentWorkDir, wf: currentWorkFlow});
              dirStack.push(currentWorkDir);
              wfStack.push(currentWorkFlow);
              nodeStack.push(name);
              
              fb.request('getFileList', currentWorkDir, null);
              sio.emit('getWorkflow', currentWorkFlow);
            }
          });
          nodes.push(node);
        }
      });
  }

  //子表示用として作成したが実装方法変更のため一時的にコメントアウト
    /**
   * draw nodes children
   * @param nodeForChildren node list in workflow Json
   */
  /* function drawNodesNodes(nodeForChildren){
    //viewBoxListに登録した子要素表示対象nodeのインスタンスを作成する
    nodeForChildren.forEach(function(v,i){
      //indexとiが一緒の時、子表示をする
      if(v !== null){
        console.log(v);
        console.log(i);
        console.log(childrenViewBoxList);
        let childrenNode = new svgNode.SvgChildrenNodeUI(childrenViewBoxList[i], v);
        //let childrenNode = new svgNode.SvgChildrenNodeUI(svg, v);

      }
    });
  } */
  /**
   * draw cables between Lower and Upper plug Connector and Receptor plug respectively
   * @param nodeInWF node list in workflow Json
   */
  function drawLinks(nodes) {
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

  function updateBreadrumb() {
    let breadcrumb = $('#breadcrumb');
    breadcrumb.empty();

    for (let index = 0; index < nodeStack.length; index++) {
      if (0 < index) {
        breadcrumb.append(`<span> > </span>`)
      }
      let id = `breadcrumbButton_${index}`;
      breadcrumb.append(`<input type="button" id=${id} class="breadcrumbButton" value=${nodeStack[index]}>`)

      $(`#${id}`).click(function () {

        while (index + 1 < nodeStack.length) {
          currentNode = nodeStack.pop();
          dirStack.pop();
          currentWorkDir = dirStack[nodeStack.length-1];
          currentWorkFlow = wfStack[nodeStack.length-1];
        }
        updateBreadrumb(); 

        fb.request('getFileList', currentWorkDir, null);
        sio.emit('getWorkflow', currentWorkFlow);
      });
    }
  }

  function updateTaskStateTable(taskStateList) {
    let taskStateTable = $('#project_table_body');
    for (let i = 0; i < taskStateList.length; i++) {
      taskStateTable.append(`<tr><td>${taskStateList[i].name}</td><td>${taskStateList[i].state}</td><td>${taskStateList[i].startTime}</td><td>${taskStateList[i].endTime}</td></tr>`);
    }
  }

  //プロパティエリアのファイル、フォルダー新規作成
  $('#createFileButton').click(function () {
    const html = '<p>New File Name (ex. aaa.txt)</p><input type=text id="newFileName">'
    dialogWrapper('#dialog', html)
      .done(function () {
        let newFileName = $('#newFileName').val();
        let newFilePath = fb.getRequestedPath() + "/" + newFileName;
        sio.emit('createNewFile', newFilePath, (result) => {
          console.log(result);
          console.log(newFilePath);          
      });
  　});
　});
  $('#createFolderButton').click(function () {
    const html = '<p>New Folder Name</p><input type=text id="newFolderName">'
    dialogWrapper('#dialog', html)
      .done(function () {
        let newFolderName = $('#newFolderName').val();
        let newFolderPath = fb.getRequestedPath() + "/" + newFolderName;        
        sio.emit('createNewDir', newFolderPath, (result) => {
          console.log(result);
          console.log(newFolderPath);
      });
    });
　});
  $('#fileUploadButton').click(function () {
    $('#fileSelector').click();
  });

  $('#drawer_button').click(function () {
    $('#drawer_menu').toggleClass('action', true);
  });

  $('#drawer_menu').mouseleave(function () {
    $('#drawer_menu').toggleClass('action', false);
  });

});
