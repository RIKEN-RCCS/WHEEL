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

import FileBrowser from './fileBrowser';
import dialogWrapper from './dialogWrapper';
import showMessage from './showMessage';
import logReciever from './logReciever';
import config from './config';
import SvgNodeUI from './svgNodeUI';
import * as svgNode from './svgNodeUI';
import SvgParentNodeUI from './svgNodeUI';
import * as svgParentNode from './svgNodeUI';

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
  let nodeTypeStack = [''];
  let dirStack = [rootDir];
  let wfStack = [rootWorkflow];
  //for 'save' button control
  let presentState = '';

  let projectRootDir = currentWorkDir;

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
    methods: {
      addInputFile: function () {
        let filename = this.newInputFilename;
        if (filename === "") return
        let duplicate = this.node.inputFiles.some((e) => {
          return e.name === filename;
        });
        if (duplicate) return
        this.newInputFilename = "";
        let newVal = { name: filename, srcNode: null, srcName: null }
        sio.emit('updateNode', { index: this.node.index, property: 'inputFiles', value: newVal, cmd: 'add' });
      },
      addOutputFile: function () {
        let filename = this.newOutputFilename;
        if (filename === "") return
        let duplicate = this.node.outputFiles.some((e) => {
          return e.name === filename;
        });
        if (duplicate) return
        this.newOutputFilename = "";
        let newVal = { name: filename, dst: [] }
        sio.emit('updateNode', { index: this.node.index, property: 'outputFiles', value: newVal, cmd: 'add' });
      },
      addIndexOfForeach: function () {
        let val = this.newIndexOfForeach;
        if (val === "") return
        let duplicate = this.node.indexList.some((e) => {
          return e.label === val;
        });
        if (duplicate) return
        this.newIndexOfForeach = "";
        let newVal = { label: val };
        sio.emit('updateNode', { index: this.node.index, property: 'indexList', value: newVal, cmd: 'add' });
      },
      delInputFile: function (i) {
        let val = this.node.inputFiles[i]
        sio.emit('updateNode', { index: this.node.index, property: 'inputFiles', value: val, cmd: 'del' });
      },
      delOutputFile: function (i) {
        let val = this.node.outputFiles[i]
        sio.emit('updateNode', { index: this.node.index, property: 'outputFiles', value: val, cmd: 'del' });
      },
      delIndexOfForeach: function (i) {
        let val = this.node.indexList[i]
        sio.emit('updateNode', { index: this.node.index, property: 'indexList', value: val, cmd: 'del' });
      },
      updateNodeName: function () {
        let val = this.node.name;
        let dup = this.names.some((name) => {
          return name === val;
        })
        if (!dup) {
          sio.emit('updateNode', { index: this.node.index, property: 'name', value: this.node.name, cmd: 'update' });
          let currentComponentDir = currentWorkDir + '/' + val;
          fb.request('getFileList', currentComponentDir, null);
          let displayDirPath = "." + currentWorkDir.replace(projectRootDir, "") + "/" + val;
          $('#componentPath').html(displayDirPath);
        } else {
          console.log('duplicated name is not allowed!');
        }
      },
      updateProperty: function (property, arrayFlag) {
        let val = this.node[property];
        let cmd = arrayFlag ? 'updataArrayProperty' : 'update';
        sio.emit('updateNode', { index: this.node.index, property: property, value: val, cmd: cmd });
      },
      changeQueueListState: function (useJocSchedulerFlag) {

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
      callback: function () {
        const path = $(this).data('path');
        const filename = $(this).data('name');
        const params = $.param({
          "path": path,
          "filename": filename,
          "pm": false
        });
        window.open(`/editor?${params}`);
      }
    },
    'edit for parameter survey': {
      name: 'edit for PS',
      callback: function () {
        const path = $(this).data('path');
        const filename = $(this).data('name');
        const params = $.param({
          "path": path,
          "filename": filename,
          "pm": true
        });
        window.open(`/editor?${params}`);
      }
    },
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

  // file edit by button.
  let filePath = '';
  let filename = '';
  $(document).on('click', '.file', function () {
    filePath = $(this).attr("data-path");
    filename = $(this).attr("data-name");
  });

  $('#editFileButton').click(function () {
    if (filePath !== '') {
      const path = filePath
      const name = filename
      const params = $.param({
        "path": path,
        "filename": name,
        "pm": false
      });
      window.open(`/editor?${params}`);
    }
  });

  $('#editPSFileButton').click(function () {
    if (filePath !== '') {
      const path = filePath
      const name = filename
      const params = $.param({
        "path": path,
        "filename": name,
        "pm": true
      });
      window.open(`/editor?${params}`);
    }
  });

  // container of svg elements
  let nodes = [];
  let parentnode = [];
  let selectedNode = 0;

  // container of hostlist info
  let selectedParent = 0;
  let remotehost = '';
  let remotehostArray = [];
  let remotehostDataArray = [];
  let queueArray = [];
  let selectedHostQueue = '';

  const svg = SVG('node_svg');
  sio.on('connect', function () {
    fb.request('getFileList', currentWorkDir, null);
    console.log("connect");
    sio.emit('getWorkflow', currentWorkFlow);
    sio.emit('getProjectJson', rootWorkflow);
    sio.emit('getProjectState', rootWorkflow);
    sio.emit('getTaskStateList', rootWorkflow);
    sio.emit('getHostList', true);

    sio.on('showMessage', showMessage);
    sio.on('askPassword', (hostname) => {
      const html = `<p id="sshConnectionLabel">Input SSH connection password for ${hostname}</p><input type=password id="password">`;
      dialogWrapper('#dialog', html)
        .done(() => {
          const password = $('#password').val();
          sio.emit('password', password);
        });
      //TODO ユーザがキャンセルした時の対応を検討
    });

    sio.on('workflow', function (wf) {
      nodeStack[nodeStack.length - 1] = wf.name;
      nodeTypeStack[nodeStack.length - 1] = wf.type;
      console.log("get workflow");
      updateBreadrumb();

      // remove all node from workflow editor
      nodes.forEach(function (v) {
        if (v !== null) v.remove();
      });
      nodes = [];
      if (wf.descendants.length > 0) {
        let names = wf.descendants.map((e) => {
          return e != null ? e.name : null;
        });
        vm.names = names;
        vm.node = wf.descendants[selectedNode];
      }
      //remove parent node
      parentnode.forEach(function (vv) {
        if (vv !== null) vv.remove();
      });
      parentnode = [];
      if (wf.length > 0) {
        let names = wf.map((e) => {
          return e != null ? e.name : null;
        });
        vm.names = names;
        vm.node = wf[selectedParent];
      }
      drawNodes(wf.descendants);
      drawParentFileRelation(wf);
      drawLinks(nodes);
      drawParentLinks(parentnode, nodes);
    });

    sio.on('taskStateList', (taskStateList) => {
      updateTaskStateTable(taskStateList);
    })

    // TODO 現在のプロジェクト状態の取得をサーバにリクエストする
    sio.on('projectJson', (projectJson) => {

      $('#project_name').text(projectJson.name);
      $('#project_state').text(projectJson.state);
      presentState = projectJson.state;

      if (projectJson.state === 'running') {
        $('#project_state').css('background-color', '#88BB00');
      } else if (projectJson.state === 'failed') {
        $('#project_state').css('background-color', '#E60000');
      } else {
        $('#project_state').css('background-color', '#000000');
      }

      let now = new Date();
      let date = '' + now.getFullYear() + '/' + now.getMonth() + '/' + now.getDate() + ' ' + now.getHours() + ':' + ('0' + now.getMinutes()).slice(-2);
      $('#project_create_date').text(projectJson.ctime);
      $('#project_update_date').text(projectJson.mtime);

    });

    /*create host, queue selectbox*/
    sio.on('hostList', function (hostlist) {
      remotehostDataArray = hostlist;
      let remotehostSelectField = $('#remotehostSelectField');
      remotehostSelectField.empty();
      remotehostArray = [];

      remotehostSelectField.append(`<option value="localhost">localhost</option>`);
      for (let index = 0; index < hostlist.length; index++) {
        remotehostSelectField.append(`<option value="${hostlist[index].name}">${hostlist[index].name}</option>`);
        remotehostArray.push(hostlist[index].name);
      }
      //selectboxへの設定
      remotehostSelectField.val(remotehost);
      $('#remotehostSelectField').change(function () {
        let selectedHost = $('#remotehostSelectField option:selected').text();
        updateQueueList(selectedHost, selectedHostQueue);
      });
    });

    //setup log reciever
    logReciever(sio);

  });

  // register btn click event listeners
  $('#run_menu').on('click', function () {
    sio.emit('runProject', rootWorkflow);
  });
  $('#pause_menu').on('click', function () {
    sio.emit('pauseProject', true);
  });
  $('#clean_menu').on('click', function () {
    // パンくずリストをrootに更新
    let rootNodeStack = nodeStack[0];
    let rootDirStack = dirStack[0];
    let rootWfStack = wfStack[0];
    nodeStack = [];
    dirStack = [];
    wfStack = [];
    nodeStack.push(rootNodeStack);
    dirStack.push(rootDirStack);
    wfStack.push(rootWfStack);
    currentWorkDir = dirStack[nodeStack.length - 1];
    fb.request('getFileList', currentWorkDir, null);
    sio.emit('cleanProject', true);
  });

  $('#stop_menu').on('click', function () {
    sio.emit('stopProject', true);
  });

  //save
  $('#save_button').on('click', function () {
    if (presentState === 'not-started') {
      sio.emit('saveProject', null, (result) => {
      });
    }
  });
  $('#save_button').mouseover(function () {
    if (presentState === 'not-started') {
      $('#save_button_img').attr("src", "/image/btn_save_h.png");
      $('#save_button').css("color", "#CCFF00");
    }
  });
  $('#save_button').mouseleave(function () {
    $('#save_button_img').attr("src", "/image/btn_save_n.png");
    $('#save_button').css("color", "#FFFFFF");
  });

  //revert
  $('#revert_button').on('click', function () {
    sio.emit('revertProject', null, (result) => {
    });
  });
  $('#revert_button').mouseover(function () {
    $('#revert_button_img').attr("src", "/image/btn_reset_h.png");
  });
  $('#revert_button').mouseleave(function () {
    $('#revert_button_img').attr("src", "/image/btn_reset_n.png");
  });

  // hide property and select parent WF if background is clicked
  $('#node_svg').on('mousedown', function () {
    fb.request('getFileList', currentWorkDir, null);
    $('#property').hide();
  });

  // setup file uploader
  const uploader = new SocketIOFileUpload(sio);
  uploader.listenOnDrop(document.getElementById('fileBrowser'));
  uploader.listenOnInput(document.getElementById('fileSelector'));

  //ボタンでのviewの切り替え
  $('#listView').click(function () {
    $('#workflow_manage_area').hide();
    $('#project_manage_area').show();
    sio.emit('getTaskStateList', rootWorkflow);
  });
  $('#graphView').click(function () {
    $('#project_manage_area').hide();
    $('#workflow_manage_area').show();
    sio.emit('getWorkflow', currentWorkFlow);
  });

  // setup context menu
  $.contextMenu({
    selector: 'g',
    autoHide: true,
    reposition: false,
    itemClickEvent: "click",
    items: {
      "delete": {
        "name": "delete",
        callback: function () {
          sio.emit('removeNode', selectedNode);
        }
      }
    }
  });

  //タスクのドラッグアンドドロップ操作
  $('#workflowComponents ul').mouseover(function () {
    var target = $(this).attr("id");
    var objectDrag = document.getElementById(target);
    var objectDrop = document.getElementById("node_svg");

    objectDrag.ondragstart = function (event) {
      event.dataTransfer.setData("text", target);
    };

    objectDrop.ondragover = function (event) {
      event.preventDefault();
    };

    objectDrop.ondrop = function (event) {
      event.preventDefault();
      var objectName = event.dataTransfer.getData("text");
      var xCoordinate = event.offsetX;
      var yCoordinate = event.offsetY;

      const pos = { x: xCoordinate, y: yCoordinate };
      sio.emit('createNode', { "type": objectName, "pos": pos });
    };
  });

  //タスクライブラリーの表示非表示
  // function definition
  function showTaskLibrary() {
    $('#taskLibraryButton').show().animate({ left: '256px' }, 50);
    $('#taskLibraryMenu').show().animate({ width: '256px', 'min-width': '256px' }, 50);
    $('#libraryButton').attr("src", "/image/btn_openCloseL_n.png");
  }

  function hideTaskLibrary() {
    $('#taskLibraryButton').show().animate({ left: '-=256px' }, 100);
    $('#taskLibraryMenu').hide();
    $('#libraryButton').attr("src", "/image/btn_openCloseR_n.png");
  }

  // show or hide task(Component) Library area
  var isTaskLibrary = false;
  $('#taskLibraryButton').click(function () {
    isTaskLibrary = !isTaskLibrary;
    if (isTaskLibrary) {
      showTaskLibrary();
    } else {
      hideTaskLibrary();
    }
  });

  // function definition
  var defaultDisplay = true;
  function showLog() {
    $('#logArea').show();
    if (defaultDisplay === true) {
      $('#logInfoLog').show();
      $('#enableINFO').css('border-bottom-color', "#88BB00");
    }
    defaultDisplay = false;
    $('#displayLogButton').toggleClass('display', true);
    $('#displayLogButtonImg').attr("src", "/image/btn_openCloseD_n.png");
  }

  function hideLog() {
    $('#logArea').hide();
    $('#displayLogButton').toggleClass('display', false);
    $('#displayLogButtonImg').attr("src", "/image/btn_openCloseU_n.png");
  }

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
    return -1 !== files.findIndex(function (v) {
      return v.name === filename;
    });
  }

  /**
   * draw nodes
   * @param nodeInWF node list in workflow Json
   */
  var buttonFlag = false;
  let clickedNode = "temp";
  function drawNodes(nodesInWF) {
    console.log("drawnodes")
    nodesInWF.forEach(function (v, i) {
      // workflow内のnodeとSVG要素のnodeのindexが一致するようにnullで消されている時もnodesの要素は作成する
      if (v === null) {
        nodes.push(null);
      } else {
        let node = new svgNode.SvgNodeUI(svg, sio, v);
        node.onMousedown(function (e) {
          vm.node = v;
          let nodeIndex = e.target.instance.parent('.node').data('ID');
          selectedNode = nodeIndex;
          const target = nodesInWF.find((e)=>{
            return e.ID === nodeIndex;
          });
          let name = target.name;
          let nodePath = currentWorkDir + '/' + name;

          fb.request('getFileList', nodePath, null);
          //プロパティ表示用相対パス
          let currentPropertyDir = "." + currentWorkDir.replace(projectRootDir, "") + "/" + name;
          let nodeType = target.type;
          //iconの変更
          let nodeIconPath = config.node_icon[nodeType];
          $('#img_node_type').attr("src", nodeIconPath);

          // taskコンポーネント時の描画処理
          if (nodeType === 'task') {
            //queuelistの設定
            let useJobSchedulerFlag = target.useJobScheduler;
            console.log(useJobSchedulerFlag);

            // if (useJobSchedulerFlag === true) {
            //   console.log("abled");
            //   $('#queueSelectField').prop('disabled', false);
            //   // $('#queueSelectField').css('background-color', '#000000');
            //   // $('#queueSelectField').css('color', '#FFFFFF');
            // } else {
            //   console.log("disabled");
            //   $('#queueSelectField').prop('disabled', true);
            //   // $('#queueSelectField').css('background-color', '#333333');
            //   // $('#queueSelectField').css('color', '#333333');
            // }
            //remotehostリストの設定
            sio.emit('getHostList', true);
            remotehost = target.host;
            selectedHostQueue = target.queue;
            updateQueueList(remotehost, selectedHostQueue);
          }

          $('#propertyTypeName').html(target.type);
          $('#componentPath').html(currentPropertyDir);
          $('#property').show().animate({ width: '272px', 'min-width': '272px' }, 100);
          //コンポーネント選択時のカラー着色
          drawStrokeColor(e);
        })
          .onDblclick(function (e) {
            $('#property').hide();
            let nodeType = e.target.instance.parent('.node').data('type');
            if (nodeType === 'workflow' || nodeType === 'parameterStudy' || nodeType === 'for' || nodeType === 'while' || nodeType === 'foreach') {
              let nodeIndex = e.target.instance.parent('.node').data('index');
              let name = target.name;
              let path = e.target.instance.parent('.node').data('path');
              currentWorkDir = currentWorkDir + '/' + name;
              currentWorkFlow = e.target.instance.parent('.node').data('ID');
              dirStack.push(currentWorkDir);
              wfStack.push(currentWorkFlow);
              nodeStack.push(name);
              nodeTypeStack.push(nodeType);
              process.nextTick(function () {
                fb.request('getFileList', currentWorkDir, null);
                sio.emit('getWorkflow', currentWorkFlow);
              });
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
  function drawLinks(nodes) {
    nodes.forEach(function (node) {
      if (node != null) {
        node.drawLinks();
      }
    });
    nodes.forEach(function (node) {
      if (node != null) {

        node.nextLinks.forEach(function (cable) {
          let dst = cable.cable.data('dst');
          nodes[dst].previousLinks.push(cable);
        });
        node.elseLinks.forEach(function (cable) {
          let dst = cable.cable.data('dst');
          nodes[dst].previousLinks.push(cable);
        });
        node.outputFileLinks.forEach(function (cable) {
          let dst = cable.cable.data('dst');
          if (dst === 'parent') {
            return;
          }
          nodes[dst].inputFileLinks.push(cable);
        });
      }
    });
  }

  function drawStrokeColor(node) {
    $(`.titleFrame`).css('stroke', 'none');
    var targetId = $(node.target).attr("id");
    var targetClass = $(node.target).attr("class");

    if (targetClass === "titleFrame") {
      $(`#${targetId}`).css('stroke-width', '1px');
      $(`#${targetId}`).css('stroke', '#CCFF00');
    }

    $('#node_svg').on('mousedown', function (node) {
      $(`#${targetId}`).css('stroke', 'none');
    });
  }

  /**
  * draw parent children file relation
  * @param  files list in workflow Json
  */
  function drawParentFileRelation(parentwf) {
    //selectedParent = nodeIndex;
    let node = new svgParentNode.SvgParentNodeUI(svg, sio, parentwf);
    parentnode.push(node);
  }

  /**
  * draw cables between Lower and Upper plug Connector and Receptor plug respectively
  * @param nodeInWF node list in workflow Json
  */
  function drawParentLinks(parentnode, nodes) {
    parentnode.forEach(function (node) {
      if (node != null) {
        node.drawParentLinks();
      }
    });
    parentnode.forEach(function (node) {
      if (node != null) {

        node.outputFileLinks.forEach(function (cable) {
          let dst = cable.cable.data('dst');
          nodes[dst].inputFileLinks.push(cable);
        });
      }
    });
  }

  function updateQueueList(remotehost, selectedHostQueue) {
    //json設定値を取得し、onで表示
    let queueSelectField = $('#queueSelectField');
    queueArray = [];
    queueSelectField.empty();
    if (remotehost === 'localhost') {
      queueArray = [];
    } else {
      let hostListIndex = remotehostArray.indexOf(remotehost);
      let queueList;
      //プロジェクトに設定されているremotehostが存在しないとき何も表示しない
      if (hostListIndex === -1) {
        queueList = "";
      } else {
        queueList = remotehostDataArray[hostListIndex].queue;
      }
      if (queueList !== "") {
        queueArray = queueList.split(',');
      }
      queueSelectField.append(`<option value="null"></option>`);
    }
    for (let index = 0; index < queueArray.length; index++) {
      queueSelectField.append(`<option value=${queueArray[index]}>${queueArray[index]}</option>`);
    }
    queueSelectField.val(selectedHostQueue);
  }

  function updateBreadrumb() {
    let breadcrumb = $('#breadcrumb');
    breadcrumb.empty();

    for (let index = 0; index < nodeStack.length; index++) {
      if (0 < index) {
        breadcrumb.append(`<span class="img_pankuzuArrow_icon"><img src="/image/img_pankuzuArrow.png"  /></span>`)
      }
      let id = `breadcrumbButton_${index}`;
      //iconの設定
      let nodeIconPath = config.node_icon[nodeTypeStack[index]];
      let correctNodeIconPath = nodeIconPath.replace(".png", "_p.png");
      let nodeColor = config.node_color[nodeTypeStack[index]];
      breadcrumb.append(`<button type="button" id=${id} class="breadcrumbButton" value=${nodeStack[index]}>
        <img src=${correctNodeIconPath} class="img_breadcrumbButton_icon" /><span class="breadcrunbName">${nodeStack[index]}</span></button>`)
      $(`#${id}`).css("background-color", nodeColor);

      $(`#${id}`).click(function () {
        while (index + 1 < nodeStack.length) {
          currentNode = nodeStack.pop();
          dirStack.pop();
          wfStack.pop();
          currentWorkDir = dirStack[nodeStack.length - 1];
          currentWorkFlow = wfStack[nodeStack.length - 1];
          $('#property').hide();
        }
        updateBreadrumb();
        fb.request('getFileList', currentWorkDir, null);
        sio.emit('getWorkflow', currentWorkFlow);
      });
    }
  }

  function updateTaskStateTable(taskStateList) {
    $('#project_table_body').empty();
    let taskStateTable = $('#project_table_body');
    for (let i = 0; i < taskStateList.length; i++) {
      let nodeType = "task";
      //親のコンポーネント表示の際はプロパティ「parent」を使用する
      let nodeState = taskStateList[i].state;
      if (nodeState === 'stage-in' || nodeState === 'waiting' || nodeState === 'queued' || nodeState === 'stage-out') {
        nodeState = 'running'
      }
      let nodeIconPath = config.node_icon[nodeType];
      let nodeColor = config.node_color[nodeType];
      let nodeComponentState = config.state_icon[nodeState];

      let id = `taskLabel_${i}`;

      taskStateTable.append(`<tr class="project_table_component" ><td id=${id} class="componentName"><img src=${nodeIconPath} class="workflow_component_icon"><label class="nameLabel">${taskStateList[i].name}</label></td>
      <td class="componentState"><img src=${nodeComponentState}><label class="stateLabel">${taskStateList[i].state}</label></td>
      <td class="componentStartTime">${taskStateList[i].startTime}</td>
      <td class="componentEndTime">${taskStateList[i].endTime}</td>
      <td class="componentDescription">${taskStateList[i].description}</td></tr>`);

      $(`#${id}`).css("background-color", nodeColor);

    }
  }
  // //Queueリストの有効、無効処理
  // $(function () {
  //   $(document).on('change', '#useJobSchedulerFlagField', function () {
  //     if ($('#useJobSchedulerFlagField').prop('checked')) {
  //       $('#queueSelectField').prop('disabled', false);
  //       $('#queueSelectField').css('background-color', '#000000');
  //       $('#queueSelectField').css('color', '#FFFFFF');
  //     } else {
  //       $('#queueSelectField').prop('disabled', true);
  //       $('#queueSelectField').css('background-color', '#333333');
  //       $('#queueSelectField').css('color', '#333333');
  //     }
  //   });
  // });

  //プロパティエリアのファイル、フォルダー新規作成
  $('#createFileButton').click(function () {
    const html = '<p class="dialogTitle">New file name (ex. aaa.txt)</p><input type=text id="newFileName" class="dialogTextbox">'
    dialogWrapper('#dialog', html)
      .done(function () {
        let newFileName = $('#newFileName').val();
        let newFilePath = fb.getRequestedPath() + "/" + newFileName;
        sio.emit('createNewFile', newFilePath, (result) => {
        });
      });
  });

  $('#createFolderButton').click(function () {
    const html = '<p class="dialogTitle">New folder name</p><input id="newFolderName" type=text class="dialogTextbox">'
    dialogWrapper('#dialog', html)
      .done(function () {
        let newFolderName = $('#newFolderName').val();
        let newFolderPath = fb.getRequestedPath() + "/" + newFolderName;
        sio.emit('createNewDir', newFolderPath, (result) => {
        });
      });
  });

  $('#fileUploadButton').click(function () {
    $('#fileSelector').click();
  });

  $('#drawer_button').click(function () {
    $('#drawerMenu').toggleClass('action', true);
  });

  $('#drawerMenu').mouseleave(function () {
    $('#drawerMenu').toggleClass('action', false);
  });

  function getSelectLabel(index) {
    var obj = document.getElementById(index);
    var idx = obj.selectedIndex;       //インデックス番号を取得
    var val = obj.options[idx].value;  //value値を取得
    var txt = obj.options[idx].text;  //ラベルを取得
  }

  // GUI表示関係処理

  //header buttons
  $('#run_button').mouseover(function () {
    $('#run_button').attr("src", "/image/btn_play_h.png");
  });
  $('#run_button').mouseleave(function () {
    $('#run_button').attr("src", "/image/btn_play_n.png");
  });

  $('#pause_button').mouseover(function () {
    $('#pause_button').attr("src", "/image/btn_pause_h.png");
  });
  $('#pause_button').mouseleave(function () {
    $('#pause_button').attr("src", "/image/btn_pause_n.png");
  });

  $('#stop_button').mouseover(function () {
    $('#stop_button').attr("src", "/image/btn_stop_h.png");
  });
  $('#stop_button').mouseleave(function () {
    $('#stop_button').attr("src", "/image/btn_stop_n.png");
  });

  $('#clean_button').mouseover(function () {
    $('#clean_button').attr("src", "/image/btn_replay_h.png");
  });
  $('#clean_button').mouseleave(function () {
    $('#clean_button').attr("src", "/image/btn_replay_n.png");
  });

  var pos = $("#titleUserName").offset();
  $("#img_user").css('right', window.innerWidth - pos.left + "px");

  //for debug
  // document.body.addEventListener("click", function (event) {
  //   var x = event.pageX;
  //   var y = event.pageY;
  //   console.log(x);
  //   console.log(y);
  // });

});
