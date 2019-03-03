import $ from 'jquery';
import 'jquery-ui/ui/widgets/sortable';
import 'jquery-ui/ui/widgets/tooltip';
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
import configToolTip from './configToolTip';

$(() => {
  // chek project Json file path
  const projectFilePath = Cookies.get('project');
  if (projectFilePath == null) {
    throw new Error('illegal access');
  }
  let rootId = [''];
  let rootWorkflow = Cookies.get('root');
  let rootDir = Cookies.get('rootDir');
  const jupyterURL = Cookies.get('jupyterURL');
  const jupyterToken = Cookies.get('jupyterToken');
  let currentWorkFlow = rootWorkflow;
  let currentWorkDir = rootDir;
  let currentNode = '';
  let nodeStack = [''];
  let nodeTypeStack = [''];
  let dirStack = [rootDir];
  let wfStack = [rootWorkflow];
  let currentWf = {};
  //for 'save' button control
  let presentState = '';
  //taskStateList
  let updateList = [];
  let projectRootDir = currentWorkDir;
  let firstConnection = true;
  let componentPath;

  // create vue.js instance for property subscreen
  let vm = new Vue({
    el: '#property',
    data: {
      node: {},
      newInputFilename: "",
      newOutputFilename: "",
      newIndexOfForeach: "",
      hostList: [],
      queueList: [],
      fileList: [],
      names: [],
      conditionInputType: '1'
    },
    methods: {
      addInputFile: function () {
        if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
          let filename = this.newInputFilename;
          if (filename === "") return
          let duplicate = this.node.inputFiles.some((e) => {
            return e.name === filename;
          });
          if (duplicate) return
          this.newInputFilename = "";
          sio.emit('addInputFile', this.node.ID, filename, (result) => {
            if (result !== true) return;
            $('#cbMessageArea').text(filename);
          });
        }
      },
      addOutputFile: function () {
        if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
          let filename = this.newOutputFilename;
          if (filename === "") return
          let duplicate = this.node.outputFiles.some((e) => {
            return e.name === filename;
          });
          if (duplicate) return
          this.newOutputFilename = "";
          sio.emit('addOutputFile', this.node.ID, filename, (result) => {
            if (result !== true) return;
            $('#cbMessageArea').text(filename);
          });
        }
      },
      addIndexOfForeach: function () {
        if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
          if (this.newIndexOfForeach === "") return
          const duplicate = this.node.indexList.some((e) => {
            return e.label === this.newIndexOfForeach;
          });
          if (duplicate) return
          this.node.indexList.push(this.newIndexOfForeach);
          this.newIndexOfForeach = "";
          sio.emit('updateNode', this.node.ID, 'indexList', this.node.indexList, (result) => {
            if (result !== true) return;
            $('#cbMessageArea').text(this.node.indexList);
          });
        }
      },
      delInputFile: function (i) {
        if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
          sio.emit('removeInputFile', this.node.ID, this.node.inputFiles[i].name);
        }
      },
      delOutputFile: function (i) {
        if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
          sio.emit('removeOutputFile', this.node.ID, this.node.outputFiles[i].name);
        }
      },
      delIndexOfForeach: function (i) {
        if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
          const newIndexList = this.node.indexList.filter((e, index) => {
            return index !== i;
          });
          sio.emit('updateNode', this.node.ID, 'indexList', newIndexList);
        }
      },
      updateNodeName: function () {
        if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
          let val = this.node.name;
          let dup = this.names.some((name) => {
            return name === val;
          })
          if (!dup) {
            sio.emit('updateNode', this.node.ID, 'name', this.node.name, (result) => {
              if (result !== true) return;
              const currentComponentDir = currentWorkDir + "\\" + val;
              fb.request('getFileList', currentComponentDir, null);
              const displayDirPath = "." + currentWorkDir.replace(projectRootDir, "") + "/" + val;
              $('#componentPath').html(displayDirPath);
              $('#cbMessageArea').text(val);
            });
          } else {
            console.log('duplicated name is not allowed!');
          }
        }
      },
      renameInputFile: function (newName, index) {
        if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
          sio.emit("renameInputFile", this.node.ID, index, newName);
        }
      },
      renameOutputFile: function (newName, index) {
        if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
          sio.emit("renameOutputFile", this.node.ID, index, newName);
        }
      },
      updateProperty: function (property) {
        if (!isEditDisable()) {
          if (property === "disable" || vm.node === null || !vm.node.disable) {
            let val = this.node[property];
            sio.emit('updateNode', this.node.ID, property, val, (result) => {
              if (result !== true) return;
              $('#cbMessageArea').text(val);
            });
            if (property === "disable") changeViewState();
          }
        }
      },
      cleanComponentState: function () {
        if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
          var nodeId = this.node.ID;
          const html = '<p class="dialogMessage">Are you sure to clean this state?</p>'
          const dialogOptions = {
            title: "Clean component state"
          };
          dialogWrapper('#dialog', html, dialogOptions)
            .done(function () {
              sio.emit('cleanComponent', nodeId, (result) => {
                if (result !== true) return;
                $('#cbMessageArea').text('component cleaned');
              });
            });
        }
      },
      openJupyterNotebook: function () {
        if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
          const parentDirPath = `${currentWorkDir[1] === ":" ? currentWorkDir.slice(2) : currentWorkDir}`;
          // jupyterURL ends with "/"
          const url = `${jupyterURL}tree${parentDirPath}/${this.node.name}?token=${jupyterToken}`;
          console.log(url);
          window.open(url);
        }
      },
      updateQueueList: function () {
        if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
          const hostInfo = this.hostList.find((e) => {
            return e.name === this.node.host;
          });
          if (typeof hostInfo === "undefined") {
            this.queueList = [];
            return;
          }
          if (typeof hostInfo.queue !== "undefined") {
            this.queueList = hostInfo.queue.split(',');
          }
        }
      }
    }

  });

  // set default view
  $('#project_manage_area').hide();
  $('#graphView').prop('checked', true);
  $('#log_area').hide();
  $('#property').hide();
  $('#taskLibraryMenu').hide();

  // setup socket.io client
  const sio = io('/workflow');

  // setup FileBrowser
  const fb = new FileBrowser(sio, '#fileList', 'fileList', true);
  // sio.on('download', (message) => {
  //   console.log(message.toString());
  // });

  // file edit by button.
  let filePathStack = [];
  let filePath = '';
  let filename = '';

  $(document).on('click', '.file', function () {
    filePath = $(this).attr("data-path");
    filename = $(this).attr("data-name");
  });

  $(document).on('dblclick', '.dir, .snd, .sndd', function () {
    filePath = $(this).attr("data-path");
    filename = $(this).attr("data-name");
    const datatype = $(this).attr("data-type");
    const pathSep = filePath[0] === '/' ? '/' : '\\';
    let replacePath = projectRootDir + pathSep;
    let currentDirPath = filePath.replace(replacePath, "") + pathSep + filename;
    filePathStack.push(filePath);
    $('#componentPath').html("." + pathSep + currentDirPath);
    let backDirHtml;
    if (datatype === "snd") {
      backDirHtml = `<button id="dirBackButton" data-path="${filePath}" data-name="${filename}"><img src="/image/img_filesToSND.png" alt="config" class="backButton"></button>`;
    } else if (datatype === "sndd") {
      backDirHtml = `<button id="dirBackButton" data-path="${filePath}" data-name="${filename}"><img src="/image/img_dirsToSNDD.png" alt="config" class="backButton"></button>`;
    } else {
      backDirHtml = `<button id="dirBackButton" data-path="${filePath}" data-name="${filename}">../</button>`;
    }
    $('#dirBackButtonArea').html(backDirHtml);
  });

  $(document).on('click', '#dirBackButton', function () {
    if (filePathStack.length !== 0) {
      filePath = filePathStack[filePathStack.length - 1];
      const pathSep = filePath[0] === '/' ? '/' : '\\';
      let replacePath = projectRootDir + pathSep;
      let fileListDirPath = "." + pathSep + filePath.replace(replacePath, "");
      fb.request('getFileList', filePath, null);
      $('#componentPath').html(fileListDirPath);
      filePathStack.pop();
    }
    if (filePathStack.length === 0) {
      $('#dirBackButton').css("display", "none");
    }
  });

  $('#editFileButton').click(function () {
    if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
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
      filePath = '';
    }
  });

  $('#editPSFileButton').click(function () {
    if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
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
      filePath = '';
    }
  });

  // container of svg elements
  let nodes = [];
  let parentnode = [];
  let selectedNode = 0;

  // container of hostlist info
  let selectedParent = 0;

  const svg = SVG('node_svg');
  sio.on('connect', function () {
    console.log('connect');
    sio.emit('getWorkflow', currentWorkFlow);
    sio.emit('getProjectJson', rootWorkflow);
    sio.emit('getProjectState', rootWorkflow);
    sio.emit('getHostList', true);
    sio.emit('getTaskStateList', rootWorkflow);
    fb.request('getFileList', currentWorkDir, null);

    sio.on('showMessage', showMessage);
    sio.on('askPassword', (hostname) => {
      const html = `<p class="dialogMessage">Input SSH connection password for ${hostname}</p><input type=password id="password" class="dialogTextbox">`;
      const dialogOptions = {
        title: "SSH connecton check"
      };
      dialogWrapper('#dialog', html, dialogOptions)
        .done(() => {
          const password = $('#password').val();
          sio.emit('password', password);
        });
      //TODO ユーザがキャンセルした時の対応を検討
    });
    sio.on('askSourceFilename', (id, name, description, filelist) => {
      const html = `<p class="dialogMessage"> Select file for ${name} component</p>
      <select id="sourceFilename" class="dialogTextbox">
        ${filelist.map((e) => { return `<option value="${e}">${e}</option>` }).join(" ")}
      </select>`;
      const dialogOptions = {
        title: "Set source component file"
      };
      dialogWrapper('#dialog', html, dialogOptions)
        .done(() => {
          const filename = $('#sourceFilename option:selected').val();
          sio.emit("sourceFile", id, filename);
        });
    });
    sio.on('requestSourceFile', (id, name, description) => {
      const html = `<p class="dialogMessage">Upload file for ${name} component</p>`;
      const dialogOptions = {
        title: "Set source component file"
      };
      dialogWrapper('#dialog', html, dialogOptions)
        .done(() => {
          const componentDir = `${projectRootDir}/${componentPath[id]}`;
          function setComponentDir(event) {
            event.file.meta.componentDir = componentDir;
          }
          function onComplete(event) {
            uploader.removeEventListener(setComponentDir);
            uploader.removeEventListener(onComplete);
            sio.emit("sourceFile", id, event.file.name);
          }

          uploader.addEventListener("start", setComponentDir);
          uploader.addEventListener("complete", onComplete);
          $('#fileSelector').click();
        });
    });

    sio.on('workflow', function (wf) {
      nodeStack[nodeStack.length - 1] = wf.name;
      nodeTypeStack[nodeStack.length - 1] = wf.type;
      currentWf = wf;
      updateBreadrumb();
      drawComponents();
    });

    let firstReadTaskStateList = [];
    sio.on('taskStateList', (taskStateList, cb) => {
      if (taskStateList.length !== 0) {
        if (firstConnection === true) {
          Array.prototype.push.apply(firstReadTaskStateList, taskStateList);
          firstReadTaskStateList.sort(sortTaskStateList);
        }
      }
      if (taskStateList.length < 100) {
        firstConnection = false;
      }

      if (firstConnection === false) {
        if (firstReadTaskStateList.length !== 0) {
          drawTaskStateList(firstReadTaskStateList);
          firstReadTaskStateList = [];
        } else {
          drawTaskStateList(taskStateList);
        }
      }
      cb();
    });

    //get project state infomation.
    sio.on('projectJson', (projectJson) => {
      rootId = Object.keys(projectJson.componentPath).filter((key) => {
        return projectJson.componentPath[key] === './'
      });
      componentPath = projectJson.componentPath;
      $('title').html(projectJson.name);
      $('#project_name').text(projectJson.name);
      $('#project_state').text(projectJson.state);
      presentState = projectJson.state;

      if (projectJson.state === 'running') {
        $('#project_state').css('background-color', '#88BB00');
        $('#run_button').attr("src", "/image/btn_play_d.png");
        $('#pause_button').attr("src", "/image/btn_pause_n.png");
      } else if (projectJson.state === 'failed') {
        $('#project_state').css('background-color', '#E60000');
        $('#pause_button').attr("src", "/image/btn_pause_n.png");
        $('#run_button').attr("src", "/image/btn_play_n.png");
      } else if (projectJson.state === 'paused') {
        $('#project_state').css('background-color', '#444480');
        $('#pause_button').attr("src", "/image/btn_pause_d.png");
        $('#run_button').attr("src", "/image/btn_play_n.png");
      } else {
        $('#project_state').css('background-color', '#000000');
        $('#pause_button').attr("src", "/image/btn_pause_n.png");
        $('#run_button').attr("src", "/image/btn_play_n.png");
      }

      let now = new Date();
      let date = '' + now.getFullYear() + '/' + now.getMonth() + '/' + now.getDate() + ' ' + now.getHours() + ':' + ('0' + now.getMinutes()).slice(-2);
      $('#project_create_date').text(projectJson.ctime);
      $('#project_update_date').text(projectJson.mtime);
      $('#projectDirectoryPath').text(projectJson.root);
      $('#projectDescription').attr("value", projectJson.description);

      changeViewState();

    });

    /*create host, queue selectbox*/
    sio.on('hostList', function (hostlist) {
      vm.hostList = hostlist;
    });

    sio.on('fileList', function (filelist) {
      vm.fileList = filelist;
    });

    //setup log reciever
    logReciever(sio);
  });

  // register btn click event listeners
  $('#run_menu').on('click', function () {
    updateList = [];
    sio.emit('runProject', rootWorkflow);
  });
  $('#pause_menu').on('click', function () {
    sio.emit('pauseProject', true);
  });
  $('#clean_menu').on('click', function () {
    if (presentState !== 'running') {
      updateList = [];
      $('#project_table_body').empty();
      // update pankuzu
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
    }
  });

  $('#stop_menu').on('click', function () {
    sio.emit('stopProject', true);
  });

  //save
  $('#save_button').on('click', function () {
    if (!isEditDisable()) {
      sio.emit('saveProject', null, (result) => {
      });
    }
  });
  $('#save_button').mouseover(function () {
    if (!isEditDisable()) {
      $('#save_button_img').attr("src", "/image/btn_save_h.png");
      $('#save_button').css("color", "#CCFF00");
    }
  });
  $('#save_button').mouseleave(function () {
    if (!isEditDisable()) {
      $('#save_button_img').attr("src", "/image/btn_save_n.png");
      $('#save_button').css("color", "#FFFFFF");
    }
  });

  //revert
  $('#revert_button').on('click', function () {
    if (!isEditDisable()) {
      sio.emit('revertProject', null, (result) => {
      });
    }
  });
  $('#revert_button').mouseover(function () {
    if (!isEditDisable()) {
      $('#revert_button_img').attr("src", "/image/btn_reset_h.png");
      $('#revert_button').css("color", "#CCFF00");
    }
  });
  $('#revert_button').mouseleave(function () {
    if (!isEditDisable()) {
      $('#revert_button_img').attr("src", "/image/btn_reset_n.png");
      $('#revert_button').css("color", "#FFFFFF");
    }
  });

  // hide property and select parent WF if background is clicked
  $('#node_svg').on('mousedown', function () {
    $('#property').hide();
    // property Files Area initialize
    filePathStack = [];
    $('#editFileButton').css('visibility', 'hidden');
    $('#editPSFileButton').css('visibility', 'hidden');
    $('#dirBackButton').css("display", "none");
  });

  // setup file uploader
  const uploader = new SocketIOFileUpload(sio);
  uploader.listenOnDrop(document.getElementById('fileBrowser'));
  uploader.listenOnInput(document.getElementById('fileSelector'));

  // change view mode
  $('#listView').click(function () {
    $('#workflow_manage_area').hide();
    $('#project_manage_area').show();
  });
  $('#graphView').click(function () {
    $('#project_manage_area').hide();
    $('#workflow_manage_area').show();
    drawComponents();
  });

  // setup context menu
  $.contextMenu({
    selector: 'g',
    // autoHide: true,
    // reposition: false,
    itemClickEvent: "click",
    position: function (opt, x, y) {
      opt.$menu.css({ top: y, left: x + 2 })
    },
    items: {
      'delete': {
        name: "Delete",
        callback: function () {
          sio.emit('removeNode', selectedNode);
        }
      }
    },
    events: {
      show: function (options) {
        if (!isEditDisable() || presentState === '') {
          return true;
        } else {
          return false;
        }
      }
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

  // create component by drag and drop
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

  // show or hide task(Component) Library area
  var isTaskLibrary = false;

  // library open/close
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

  $('#taskLibraryButton').click(function () {
    if (isEditDisable()) {
      return;
    }

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
   * check if filename is already in inputFiles or outputFiles
   * @param files inputFiles or outputFiles of any workflow component
   * @param filename testee
   */
  function isDupulicated(files, filename) {
    return -1 !== files.findIndex(function (v) {
      return v.name === filename;
    });
  }

  function isEditDisable() {
    return presentState === 'running';
  }

  /**
   * draw components 
   */
  function drawComponents() {
    // remove all node from workflow editor
    nodes.forEach(function (v) {
      if (v !== null) v.remove();
    });
    nodes = [];
    if (currentWf.descendants.length > 0) {
      let names = currentWf.descendants.map((e) => {
        return e.name;
      });
      vm.names = names;
      vm.node = currentWf.descendants.find((e) => {
        return e.ID === selectedNode;
      });
      //for initial load
      if (!vm.node) {
        vm.node = currentWf.descendants[0];
      }
    }
    //remove parent node
    parentnode.forEach(function (vv) {
      if (vv !== null) vv.remove();
    });
    parentnode = [];
    if (currentWf.length > 0) {
      let names = currentWf.map((e) => {
        return e != null ? e.name : null;
      });
      vm.names = names;
      vm.node = currentWf[selectedParent];
    }

    drawNodes(currentWf.descendants);
    drawParentFileRelation(currentWf);
    drawLinks(nodes);
    drawParentLinks(parentnode, nodes);
  }

  /**
   * draw nodes
   * @param nodeInWF node list in workflow Json
   */
  function drawNodes(nodesInWF) {
    nodesInWF.forEach(function (v) {
      let node = new svgNode.SvgNodeUI(svg, sio, v);
      node.ID = v.ID;
      node.onMousedown(function (e) {
        vm.node = v;
        let nodeIndex = e.target.instance.parent('.node').data('ID');
        selectedNode = nodeIndex;
        const target = nodesInWF.find((e) => {
          return e.ID === nodeIndex;
        });
        let name = target.name;
        const pathSep = currentWorkDir[0] === '/' ? '/' : '\\';
        let nodePath = currentWorkDir + pathSep + name;
        fb.request('getFileList', nodePath, null);
        let currentPropertyDir = "." + currentWorkDir.replace(projectRootDir, "") + pathSep + name;
        let nodeType = target.type;
        let nodeIconPath = config.node_icon[nodeType];
        $('#img_node_type').attr("src", nodeIconPath);

        if (nodeType === 'task') {
          sio.emit('getHostList', true);
        }
        $('#propertyTypeName').html(target.type);
        $('#componentPath').html(currentPropertyDir);
        $.when(
          $('#property').show().animate({ width: '272px', 'min-width': '272px' }, 100),
          drawStrokeColor(e)
        ).done(function () {
          changeViewState();
        });
      })
        .onDblclick(function (e) {
          $('#property').hide();
          let nodeType = e.target.instance.parent('.node').data('type');
          if (nodeType === 'workflow' || nodeType === 'parameterStudy' || nodeType === 'for' || nodeType === 'while' || nodeType === 'foreach') {
            let nodeIndex = e.target.instance.parent('.node').data('index');
            let name = e.target.instance.parent('.node').data('name');
            const pathSep = currentWorkDir[0] === '/' ? '/' : '\\';
            currentWorkDir = currentWorkDir + pathSep + name;
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
      node.setEditDisable(isEditDisable());
    });
    svgNode.setEditDisable(svg, nodes, isEditDisable());
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
      node.nextLinks.forEach(function (cable) {
        const dst = cable.cable.data('dst');
        const target = nodes.find((e) => {
          return e.ID === dst;
        });
        target.previousLinks.push(cable);
      });
      node.elseLinks.forEach(function (cable) {
        const dst = cable.cable.data('dst');
        const target = nodes.find((e) => {
          return e.ID === dst;
        });
        target.previousLinks.push(cable);
      });
      node.outputFileLinks.forEach(function (cable) {
        const dst = cable.cable.data('dst');
        const target = nodes.find((e) => {
          return e.ID === dst;
        });
        if (typeof target === "undefined") return;
        target.inputFileLinks.push(cable);
      });
    });
  }

  /**
  * draw component selected color
  */
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
    let node = new svgParentNode.SvgParentNodeUI(svg, sio, parentwf);
    parentnode.push(node);
  }

  /**
  * draw cables between Lower and Upper plug Connector and Receptor plug respectively
  */
  function drawParentLinks(parentnode, nodes) {
    parentnode.forEach(function (node) {
      if (node != null) {
        node.drawParentLinks();
      }
    });
    parentnode.forEach(function (node) {
      node.inputFileLinks.forEach(function (cable) {
        const dst = cable.cable.data('dst');
        const target = nodes.find((e) => {
          return e.ID === dst;
        });
        target.inputFileLinks.push(cable);
      });
    });
  }

  var timer = 0;
  window.onresize = function () {
    if (timer > 0) {
      clearTimeout(timer);
    }
    timer = setTimeout(function () {
      drawComponents();
    }, 200);
  };

  function updateBreadrumb() {
    let breadcrumb = $('#breadcrumb');
    breadcrumb.empty();
    for (let index = 0; index < nodeStack.length; index++) {
      if (0 < index) {
        breadcrumb.append(`<span class="img_pankuzuArrow_icon"><img src="/image/img_pankuzuArrow.png"  /></span>`)
      }
      let id = `breadcrumbButton_${index}`;
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

  // draw taskStateList
  function insertSubComponetStateListHTML(target, id, iconPath, name) {
    target.insertAdjacentHTML("beforeend", `<tr class="project_table_component" >
    <td id="${id}" class="componentName"><img src=${iconPath} class="workflow_component_icon"><label class="nameLabel">${name}</label></td></tr>`);
  }

  function insertTaskStateListHTML(target, id, iconPath, name, componentState, state, started, prepared, jobSubmited, jobRan, jobFinished, finished, desc) {
    target.insertAdjacentHTML("beforeend", `<tr class="project_table_component" >
    <td id="${id}" class="componentName">
    <img src=${iconPath} class="workflow_component_icon"><label class="nameLabel">${name}</label></td>
    <td class="componentState"><img src=${componentState} class="stateIcon" id="${id}_stateIcon"><label class="stateLabel" id="${id}_state">${state}</label></td>
    <td class="componentStartTime" id="${id}_startTime">${started}</td>
    <td class="componentLabel" id="${id}_prepared">${prepared}</td>
    <td class="componentLabel" id="${id}_jobSubmited">${jobSubmited}</td>
    <td class="componentLabel" id="${id}_jobRan">${jobRan}</td>
    <td class="componentLabel" id="${id}_jobFinished">${jobFinished}</td>
    <td class="componentEndTime" id="${id}_endTime">${finished}</td>
    <td class="componentDescription">${desc}</td></tr>`);
  }

  let jobInfoViewFlag = false;
  $('#showMoreButton').click(function () {
    if (jobInfoViewFlag) {
      $('.componentLabel').css('display', 'none');
      $('#showMoreButton').attr("src", "/image/btn_openCloseR_n.png");
      jobInfoViewFlag = false;
    } else {
      $('.componentLabel').css('display', 'inline-block');
      $('#showMoreButton').attr("src", "/image/btn_openCloseL_n.png");
      jobInfoViewFlag = true;
    }
  });

  function changeComponentDisplayMode(flag) {
    if (flag) {
      $('.componentLabel').css('display', 'inline-block');
    }
  }

  function sliceInfo(info) {
    return info.slice(0, -4)
  }

  function escapeCharacter(string) {
    return string.replace(/([.*+?^=!:$@%&#,"'~;<>{}()|[\]\/\\])/g, "");
  }

  function sortTaskStateList(a, b) {
    let first = a.startTime;
    let second = b.startTime;
    return (first < second ? -1 : 1);
  }

  let maxancestorsLength = 0;
  function drawTaskStateList(taskStateList) {
    let targetElement = document.getElementById("project_table_body");
    for (let i = 0; i < taskStateList.length; i++) {
      let taskIdTemp = "";
      if (taskStateList[i].ancestorsName === "") {
        taskIdTemp = `${taskStateList[i].name}_${i}`;
      } else {
        taskIdTemp = `${taskStateList[i].name}_${taskStateList[i].ancestorsName}`;
      }
      let taskId = escapeCharacter(taskIdTemp);
      if (taskStateList[i].startTime !== 'not started') {
        taskStateList[i].startTime = sliceInfo(taskStateList[i].startTime);
      }
      if (taskStateList[i].endTime !== 'not finished') {
        taskStateList[i].endTime = sliceInfo(taskStateList[i].endTime);
      }

      if (document.getElementById(`${taskId}`) != null) {
        let nodeState = taskStateList[i].state;
        if (nodeState === 'stage-in' || nodeState === 'waiting' || nodeState === 'queued' || nodeState === 'stage-out') {
          nodeState = 'running'
        }

        let nodeComponentState = config.state_icon[nodeState];
        $(`#${taskId}_stateIcon`).attr("src", nodeComponentState);
        $(`#${taskId}_state`).html(taskStateList[i].state);
        $(`#${taskId}_startTime`).html(taskStateList[i].startTime);
        $(`#${taskId}_prepared`).html(taskStateList[i].startTime);
        $(`#${taskId}_jobSubmited`).html(taskStateList[i].startTime);
        $(`#${taskId}_jobRan`).html(taskStateList[i].startTime);
        $(`#${taskId}_jobFinished`).html(taskStateList[i].startTime);
        $(`#${taskId}_endTime`).html(taskStateList[i].endTime);
      } else {
        let ancestorsNameList = [];
        let ancestorsTypeList = [];
        let nodeType = "task";
        let nodeState = taskStateList[i].state;
        if (nodeState === 'stage-in' || nodeState === 'waiting' || nodeState === 'queued' || nodeState === 'stage-out') {
          nodeState = 'running'
        }
        let nodeIconPath = config.node_icon[nodeType];
        let nodeColor = config.node_color[nodeType];
        let nodeComponentState = config.state_icon[nodeState];

        if (taskStateList[i].ancestorsName === "") {
          insertTaskStateListHTML(targetElement, taskId, nodeIconPath, taskStateList[i].name, nodeComponentState, taskStateList[i].state,
            taskStateList[i].startTime, taskStateList[i].startTime, taskStateList[i].startTime, taskStateList[i].startTime, taskStateList[i].startTime, taskStateList[i].endTime, taskStateList[i].description)
          changeComponentDisplayMode(jobInfoViewFlag);
          $(`#${taskId}`).css("background-color", nodeColor);
          $(`#${taskId}`).css("margin-right", maxancestorsLength * 32 + "px");
        } else {
          //arrange list info position by maxancestorsLength.
          ancestorsNameList = taskStateList[i].ancestorsName.split('/');
          ancestorsTypeList = taskStateList[i].ancestorsType.split('/');
          if (maxancestorsLength < ancestorsNameList.length) {
            maxancestorsLength = ancestorsNameList.length;
          }
          //arrange components expect task component.
          let ancestorsId;
          let ancestorsIdTemp;
          for (let j = 0; j < ancestorsNameList.length; j++) {
            let ancestorsIconPath = config.node_icon[ancestorsTypeList[j]];
            ancestorsIdTemp = `ancestors_${ancestorsNameList[j]}_${i}_${j}_${taskId}`;
            ancestorsId = escapeCharacter(ancestorsIdTemp);
            insertSubComponetStateListHTML(targetElement, ancestorsId, ancestorsIconPath, ancestorsNameList[j]);
            $(`#${ancestorsId}`).css("background-color", config.node_color[ancestorsTypeList[j]]);
            let loopMarginArea = 32 * j;
            $(`#${ancestorsId}`).css("margin-left", loopMarginArea + "px");
          }
          insertTaskStateListHTML(targetElement, taskId, nodeIconPath, taskStateList[i].name, nodeComponentState, taskStateList[i].state,
            taskStateList[i].startTime, taskStateList[i].startTime, taskStateList[i].startTime, taskStateList[i].startTime, taskStateList[i].startTime, taskStateList[i].endTime, taskStateList[i].description)
          changeComponentDisplayMode(jobInfoViewFlag);
          let marginArea = 32 * ancestorsNameList.length;
          let marginRight = (maxancestorsLength - ancestorsNameList.length) * 32;
          $(`#${taskId}`).css("margin-left", marginArea + "px");
          $(`#${taskId}`).css("margin-right", marginRight + "px");
          $(`#${taskId}`).css("background-color", nodeColor);
          $(`.componentNameLabel`).css("margin-right", maxancestorsLength * 32 + "px");
        }
      }
    }
  }

  //create File/Folder in property 'Files'
  $('#createFileButton').click(function () {
    if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
      const html = '<p class="dialogMessage">Input new file name (ex. aaa.txt)</p><input type=text id="newFileName" class="dialogTextbox">'
      const dialogOptions = {
        title: "Create new file"
      };
      dialogWrapper('#dialog', html, dialogOptions)
        .done(function () {
          let newFileName = $('#newFileName').val().trim();
          let newFilePath = fb.getRequestedPath() + "/" + newFileName;
          sio.emit('createNewFile', newFilePath, (result) => {
          });
        });
    }
  });

  $('#createFolderButton').click(function () {
    if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
      const html = '<p class="dialogMessage">Input new folder name</p><input id="newFolderName" type=text class="dialogTextbox">'
      const dialogOptions = {
        title: "Create new folder"
      };
      dialogWrapper('#dialog', html, dialogOptions)
        .done(function () {
          let newFolderName = $('#newFolderName').val().trim();
          let newFolderPath = fb.getRequestedPath() + "/" + newFolderName;
          sio.emit('createNewDir', newFolderPath, (result) => {
          });
        });
    }
  });

  $('#fileUploadButton').click(function () {
    if (!isEditDisable() && (vm.node === null || !vm.node.disable)) {
      $('#fileSelector').click();
    }
  });

  $('#drawer_button').click(function () {
    if (!isEditDisable()) {
      $('#drawerMenu').toggleClass('action', true);
    }
  });

  $('#drawerMenu').mouseleave(function () {
    if (!isEditDisable()) {
      $('#drawerMenu').toggleClass('action', false);
    }
  });

  $('#projectInfo').click(function () {
    if (!isEditDisable()) {
      $('#projectInfoDrawer').toggleClass('action', true);
    }
  });

  $('#projectInfoDrawer').mouseleave(function () {
    $('#projectInfoDrawer').toggleClass('action', false);
  });

  //change project description
  $('#projectDescription').blur(function () {
    if (!isEditDisable()) {
      var prjDesc = document.getElementById('projectDescription').value;
      sio.emit('updateProjectJson', 'description', prjDesc);
    }
  });

  //header buttons
  $('#run_button').mouseover(function () {
    if (presentState !== 'running') {
      $('#run_button').attr("src", "/image/btn_play_h.png");
    }
  });
  $('#run_button').mouseleave(function () {
    if (presentState !== 'running') {
      $('#run_button').attr("src", "/image/btn_play_n.png");
    }
  });

  $('#pause_button').mouseover(function () {
    if (presentState !== 'paused') {
      $('#pause_button').attr("src", "/image/btn_pause_h.png");
    }
  });
  $('#pause_button').mouseleave(function () {
    if (presentState !== 'paused') {
      $('#pause_button').attr("src", "/image/btn_pause_n.png");
    }
  });

  $('#stop_button').mouseover(function () {
    $('#stop_button').attr("src", "/image/btn_stop_h.png");
  });
  $('#stop_button').mouseleave(function () {
    $('#stop_button').attr("src", "/image/btn_stop_n.png");
  });

  $('#clean_button').mouseover(function () {
    if (presentState !== 'running') {
      $('#clean_button').attr("src", "/image/btn_replay_h.png");
    }
  });
  $('#clean_button').mouseleave(function () {
    if (presentState !== 'running') {
      $('#clean_button').attr("src", "/image/btn_replay_n.png");
    }
  });

  var pos = $("#titleUserName").offset();
  $("#img_user").css('right', window.innerWidth - pos.left + "px");

  function updateToolTip() {
    configToolTip.toolTipTexts.forEach((v) => {
      if (config.tooltip_lang.lang === "jpn") {
        try {
          $("[id=" + v.key + "]").attr('title', v.jpn);
        } catch (e) {
          console.log(v.key + " is not find");
          // none
        }
      }
    });
    return;
  }

  function changeViewState() {
    if (isEditDisable()) {
      hideTaskLibrary();
    }

    var editDisable = isEditDisable();
    var disable = editDisable || (vm.node !== null && vm.node.disable);

    var ids = [
      // 入力域は readonlyのみ。チェックボックスなどは disableも
      { id: "nameInputField", readonly: true, disable: false },
      { id: "descriptionInputField", readonly: true, disable: false },
      { id: "scriptSelectField", readonly: true, disable: true },
      { id: "newInputFileNameInputField", readonly: true, disable: false },
      { id: "newOutputFileNameInputField", readonly: true, disable: false },
      { id: "parameterFileSelectField", readonly: true, disable: true },
      { id: "conditionFlag1", readonly: true, disable: true },
      { id: "conditionFlag2", readonly: true, disable: true },
      { id: "conditionSelectField", readonly: true, disable: true },
      { id: "conditionInputField", readonly: true, disable: false },
      { id: "newIndexListField", readonly: true, disable: false },
      { id: "indexListFieldAddButton", readonly: true, disable: false },
      { id: "startInputField", readonly: true, disable: false },
      { id: "endInputField", readonly: true, disable: false },
      { id: "stepInputField", readonly: true, disable: false },
      { id: "cleanUpFlag0", readonly: true, disable: true },
      { id: "cleanUpFlag1", readonly: true, disable: true },
      { id: "cleanUpFlag2", readonly: true, disable: true },
      { id: "includeInputField", readonly: true, disable: false },
      { id: "excludeInputField", readonly: true, disable: false },
      { id: "forceOverwriteCheckbox", readonly: true, disable: true },
      { id: "useJobSchedulerFlagField", readonly: true, disable: true },
      { id: "remotehostSelectField", readonly: true, disable: true },
      { id: "queueSelectField", readonly: true, disable: true },
      { id: "jupyterBootButton", readonly: true, disable: true },
      { id: "createFolderButton", readonly: true, disable: true },
      { id: "createFileButton", readonly: true, disable: true },
      { id: "fileUploadButton", readonly: true, disable: true },
      { id: "fileSelector", readonly: true, disable: true },
      { id: "editFileButton", readonly: true, disable: true },
      { id: "editPSFileButton", readonly: true, disable: true },
      { id: "uploadOnDemandFlagField", readonly: true, disable: true }
    ];

    ids.forEach((v) => {
      try {
        if (v.readonly === true) {
          $("[id=" + v.id + "]").attr('readonly', disable);
        }
      } catch (e) { }
      try {
        if (v.disable === true) {
          $("[id=" + v.id + "]").prop('disabled', disable);
        }
      } catch (e) { }
    });

    $("[id=propertyDisable]").attr('readonly', editDisable);
    $("[id=propertyDisable]").prop('disabled', editDisable);

    svgNode.setEditDisable(svg, nodes, editDisable);
    fb.setDisable(disable);

    updateToolTip();

    return;
  }

});
